import {
    L10N_NA
    } from "./constant";
import Bridge from "./bridge";

// See: https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
if (!String.prototype.format) {
    // eslint-disable-next-line no-extend-native
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
            ;
        });
    };
}

if (!String.prototype.replaceAll) {
    // eslint-disable-next-line no-extend-native
    String.prototype.replaceAll = function(search, replacement) {
        var target = this;

        search = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        replacement = replacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        return target.replace(new RegExp(search, 'g'), replacement);
    };
}

if (!Date.prototype.toIsoString) {
    // eslint-disable-next-line no-extend-native
    Date.prototype.toIsoString = function() {
        var tzo = -this.getTimezoneOffset(),
            dif = tzo >= 0 ? '+' : '-',
            pad = function(num) {
                var norm = Math.floor(Math.abs(num));
                return (norm < 10 ? '0' : '') + norm;
            };
        return this.getFullYear() +
            '-' + pad(this.getMonth() + 1) +
            '-' + pad(this.getDate()) +
            'T' + pad(this.getHours()) +
            ':' + pad(this.getMinutes()) +
            ':' + pad(this.getSeconds()) +
            '.' + ("00" + this.getMilliseconds()).slice(-3) +
            dif + pad(tzo / 60) +
            pad(tzo % 60);
    }
}

export default class Utility {

    constructor() {
        this.bridge = new Bridge();
    }
    
    formatDate = function(date) {
        var datestring =
            ("0" + date.getDate()).slice(-2) + "." +
            ("0"+(date.getMonth()+1)).slice(-2) + "." +
            date.getFullYear() + " " +
        ("0" + date.getHours()).slice(-2) + ":" +
        ("0" + date.getMinutes()).slice(-2) + ":" +
        ("0" + date.getSeconds()).slice(-2) + "." +
        ("00" + date.getMilliseconds()).slice(-3)
        ;
        return datestring;
    }

    formatDateTimeShort = function(date) {

        if (!date) {
            return L10N_NA;
        }
    
        var options = {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        };
    
        if (navigator.language) {
            return date.toLocaleDateString(navigator.language, options)    
        }
        return date.toLocaleDateString("de", options)
    }
    
    encode = function(text) {
        if (!text) {
            return null;
        }
        return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    
    /*
    pad(10, 4);      // 0010
    pad(9, 4);       // 0009
    pad(123, 4);     // 0123
    pad(10, 4, '-'); // --10
     */
    padLeft = function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    
    ajax = function(url, data, callbackSuccess, callbackError) {
        var options = {
            type : "POST",
            url : url,
            data : JSON.stringify(data),
            dataType : "json",
            jsonp : false,
            cache : false,
            timeout: 60000, // 1 minute
            headers : {
                "Content-Type": "application/json",
                "X-SecFgp": localStorage[LOCAL_STORAGE_KEY_X_SEC_FGP],
                "X-Token": localStorage[LOCAL_STORAGE_KEY_X_TOKEN]
            },
            success : function(successData, textStatus, request) {
                callbackSuccess(
                    successData,
                    request
                );
            },
            error : function(request, textStatus, errorThrown) {
                if (callbackError) {
                    callbackError();
                }
            }
        };
        $.ajax(options);
    }
    
    uuid = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : ((r & 0x3) | 0x8);
            return v.toString(16);
        });
    }
    
    showMessage = function(message, isSuccess) {
    
        var notificationId = "notification";
    
        let notification = document.getElementById(notificationId);
        notification.innerHTML = message;
        notification.classList.toggle("hidden");

        setTimeout(() => {
            notification.classList.toggle("hidden");
        }, 2500);
    }
    
    /*
     * Converts an ArrayBuffer to a string. Assure to handle UTF-8 code points that
     * are longer than 1 byte. Usage: For user messages, keypair generation.
     * See: https://stackoverflow.com/questions/17191945/conversion-between-utf-8-arraybuffer-and-string
     */
    arrayBufferToString = function(array) {
        /*var byteArray = new Uint8Array(array);
        var encodedString = String.fromCharCode.apply(null, byteArray);
        var decodedString = decodeURIComponent(escape(encodedString));
        return decodedString;*/
        var decoded = new TextDecoder("utf-8").decode(array);
        return decoded;
    }
    
    arrayBufferToHex = function(array) {
        return Array.prototype.map.call(new Uint8Array(array), x => ('00' + x.toString(16)).slice(-2)).join('').toLowerCase();
    }
    
    /*
     * Converts an string to ArrayBuffer.
     */
    stringToArrayBuffer = function(str) {
        // Does not work and is very slow
        /*var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i=0, strLen=str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;*/

        var a = new Uint8Array(0);

        for (var i=0; i<str.length; i+=100000) {
            let sub = str.substring(i, Math.min(i+100000, str.length));
            var next = new TextEncoder("utf-8").encode(sub);
            var b = new Uint8Array(a.length + next.length);
            b.set(a, 0);
            b.set(next, a.length);
            a = b;
        }
        
        // See also: https://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
        // Produces crash of eclipse if file is too large
        //var encoded = new TextEncoder("utf-8").encode(str);

        return a;
    }
    
    /*
     * Converts base64 string to Uint8Array.
     */
    base64ToBinary = function(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    }
    
    /*
     * Converts Uint8Array to base64 string.
     */
    binaryToBase64 = function(array) {
    
        if (!array) {
            return null;
        }
    
        // The following line will throw: maximum call stack size exceeded error
        //return btoa(String.fromCharCode.apply(null, array));
        var binary = "";
        var len = array.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(array[i]);
        }
        return window.btoa(binary);
    }
    
    /*
     * Concats two array. The resulting array
     * is in format: [...array1...][...array2...]
     */
    concat = function(array1, array2) {
        var buf = new Uint8Array(array1.length + array2.length);
        Array.prototype.forEach.call(array1, function (byte, i) {
            buf[i] = byte;
        });
        Array.prototype.forEach.call(array2, function (byte, i) {
            buf[array1.length + i] = byte;
        });
        return buf;
    }
    
    clearField = function(id) {
        var element = document.getElementById(id);
        if (element) {
            element.value = null;
        } else {
            console.log("[clearField] Element '" + id + "' not found.");
        }
        
    }
    
    formatSize = function(bytes) {
        var units = ["Byte", "KB", "MB", "GB", "TB", "PB"];
        for (var i in units) {
            if (bytes < 1024) {
                return bytes.toFixed(2) + " " + units[i];
            }
            bytes /= 1024;
        }
        return null;
    }
    
    addEnterAction = function(id, action) {
        const tfMessage = document.getElementById(id);
        tfMessage.addEventListener("keyup", function(e) {
            e.preventDefault();
            if (e.key === "Enter") {
                action();
            }
        });
    }
    
    addClickAction = function(id, action) {
        $("#" + id).click(function(e) {
            e.preventDefault();
            action();
        });
    }
    
    addChangeAction = function(selector, action) {
        $(selector).change(function() {
            action($(this).val());
        });
    }
    
    getIpInformation = function() {
        var ipInformation = [];
        var ifaces = this.bridge.networkInterfaces();

        Object.keys(ifaces).forEach((ifname) => {
            ifaces[ifname].forEach((iface) => {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }
                ipInformation.push({
                    ip: iface.address,
                    broadcast: this.bridge.subnet(iface.address, iface.netmask)
                });
            });
            return;
        });
        return ipInformation;
    }
}