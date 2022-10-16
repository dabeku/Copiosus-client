import $ from "jquery";

import * as Constant from "../common/constant"

export default class Rest {

    multipart = function(url, formData, headerNameValueArray, callbackSuccess, callbackError, callbackProgress) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.timeout = 300000; // Timeout in ms (5min)

        if (headerNameValueArray) {
            for (var i = 0; i < headerNameValueArray.length; i++) {
                var headerItem = headerNameValueArray[i];
                xhr.setRequestHeader(headerItem.name, headerItem.value);
            }
        }
        xhr.addEventListener("load", (evt) => {
            var response = evt.target.response;
            var result = $.parseJSON(response);
            if (callbackSuccess) {
                callbackSuccess(result);
            }
        }, false);

        xhr.addEventListener("error", (evt) => {
            if (callbackError) {
                callbackError(Constant.STATUS_UPLOAD_ERROR);
            }
        }, false);
    
        xhr.upload.addEventListener("progress", (evt) => {
            if (callbackProgress) {
                if (evt.lengthComputable) {
                    var percentComplete = (evt.loaded / evt.total) * 100;
                    callbackProgress(percentComplete);
                }
            }
        }, false);

        xhr.ontimeout = () => {
            if (callbackError) {
                callbackError(Constant.STATUS_TIMEOUT);
            }
        }
        
        xhr.send(formData);
    
        return xhr;
    }

    download = function(url, headerNameValueArray, callbackSuccess, callbackError, callbackProgress) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = "arraybuffer";
        xhr.open("GET", url, true);
        xhr.timeout = 300000; // Timeout in ms (5min)

        if (headerNameValueArray) {
            for (var i = 0; i < headerNameValueArray.length; i++) {
                var headerItem = headerNameValueArray[i];
                xhr.setRequestHeader(headerItem.name, headerItem.value);
            }
        }

        xhr.addEventListener("load", (evt) => {
            // Download finished
            var array = new Uint8Array(evt.target.response);
            if (array.length === 0) {
                if (callbackError) {
                    callbackError(Constant.STATUS_DOWNLOAD_ERROR);
                }
                return;
            }
            if (callbackSuccess) {
                callbackSuccess(array);
            }
        }, false);

        xhr.addEventListener("error", (evt) => {
            if (callbackError) {
                callbackError(Constant.STATUS_DOWNLOAD_ERROR);
            }
        }, false);
    
        xhr.addEventListener("progress", (evt) => {
            var percentComplete = 0;
            if (evt.total > 0) {
                percentComplete = (evt.loaded / evt.total) * 100;
            }
            if (callbackProgress) {
                callbackProgress(percentComplete);
            }
        });

        xhr.ontimeout = () => {
            if (callbackError) {
                callbackError(Constant.STATUS_TIMEOUT);
            }
        }
        
        xhr.send(null);
    
        return xhr;
    }

    abort = function(xhr) {
        xhr.abort();
    }
}