import * as Constant from "../common/constant"
import { l10n } from "../common/l10n"
import Utility from "../common/utility.js";
import Log from "../common/log.js";
import Bridge from "../common/bridge.js";
import Filesystem from "../backend/filesystem.js";

export default class CameraService {

    constructor(props) {
        this.props = props;

        this.utility = new Utility();
        this.log = new Log();
        this.bridge = new Bridge();
        this.filesystem = new Filesystem();

        this.isScanFinished = false;
    }

    connectCamera = (deviceId, ip, width, height, hasVideo, hasAudio) => {
        // Prepare listening port
        if (global.portIncrementer > Constant.MAX_PORT_INCREMENTER) {
            global.portIncrementer = 0;
        }
        global.portIncrementer++;

        // The ip of this machine
        var ipInformation = this.props.networkState;
        if (!ipInformation.ip) {
            this.log.warn("[connectCamera] Not connected (ip). Please connect to network.");
            this.utility.showMessage(l10n.video.not_connected_to_network, false);
            return;
        }

        this.log.info("[connectCamera] Initialize player at " + ipInformation.ip);

        var password = localStorage.getItem(Constant.LOCAL_STORAGE_KEY_CAMERA_PASSWORD);
        if (!password) {
            password = "";
        }
        var basePortCam = -1;
        if (hasVideo === "1") {
            basePortCam = (Constant.BASE_PORT_CAM + global.portIncrementer);
        }
        var basePortMic = -1;
        if (hasAudio === "1") {
            basePortMic = (Constant.BASE_PORT_MIC + global.portIncrementer);
        }

        window.video.player_initialize(deviceId, ipInformation.ip, basePortCam, basePortMic, password, width, height);

        this.sendCommandTcp(ip, "CONNECT UDP " + ipInformation.ip + " " + basePortCam + " " + basePortMic);
    }

    startCamera = (ip) => {
        this.sendCommandTcp(ip, "START");
    }

    stopCamera = (deviceId, ip) => {
        this.sendCommandTcp(ip, "STOP");
        window.video.player_stop(deviceId);
    }

    resetCamera = (deviceId, ip, resetIp, stopPlayer) => {
        this.sendCommandTcp(ip, "RESET " + resetIp);
        if (stopPlayer === true) {
            window.video.player_stop(deviceId);
        }
    }

    getCameraInfo = (ip, successCallback) => {
        this.sendCommandTcp(ip, "LIST_FILES", successCallback);
    }

    getStatus = (ip, successCallback) => {
        this.sendCommandTcp(ip, "STATUS", successCallback);
    }

    delete = (ip, fileName) => {
        this.sendCommandTcp(ip, "DELETE " + fileName);
    }

    download = (ip, fileName, progressCallback) => {
        var net = window.net;
        var client = new net.Socket();

        client.connect(Constant.PORT_LISTEN_COMMAND_TCP, ip, () => {
            this.log.info('[connect]: ' + ip + ':' + Constant.PORT_LISTEN_COMMAND_TCP);
            // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client
            client.write("DOWNLOAD " + fileName);
        });

        var count = 0;
        var array = new Uint8Array();

        // Add a 'data' event handler for the client socket
        // data is what the server sent to this socket
        client.on('data', (data) => {
            count += data.length;
            var mergedArray = new Uint8Array(array.length + data.length);
            mergedArray.set(array);
            mergedArray.set(data, array.length);
            array = mergedArray;
            progressCallback(fileName, count);
        });

        // Add a 'close' event handler for the client socket
        client.on('close', () => {

            // Do decryption
            this.log.info("[close] Decrypting data.");
            var password = localStorage.getItem(Constant.LOCAL_STORAGE_KEY_CAMERA_PASSWORD);
            if (!password) {
                password = "";
            }
            
            var pwdLength = password.length;
            
            if (pwdLength > 0) {
                for (var i = 0; i < array.length; i++) {
                    array[i] = array[i] ^ (password[i % pwdLength].charCodeAt());
                }
            }
            
            this.log.info("[close] Decryption done.");

            // Create the path
            var absolutePath = this.filesystem.getStorageFolder();
            if (!this.filesystem.exists(absolutePath)) {
                this.filesystem.mkdirs(absolutePath);
            }
            absolutePath += this.filesystem.getSeparator();
            absolutePath += fileName;
            this.log.info("[close] Connection closed. Save file to: " + absolutePath + ".");
            this.bridge.writeFile(absolutePath, array, (args) => {
                this.log.info("[writeFile] Finished writing file.");
                this.utility.showMessage(l10n.download.download_file_success_template.format(absolutePath), true);
            });
        });
    }

    sendCommandTcp = (ip, cmd, successCallback) => {
        var net = window.net;
        var client = new net.Socket();

        client.connect(Constant.PORT_LISTEN_COMMAND_TCP, ip, () => {
            this.log.info('[connect]: ' + ip + ':' + Constant.PORT_LISTEN_COMMAND_TCP + ". Send: " + cmd);
            // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client
            client.write(cmd);
        });

        var array = new Uint8Array();

        // Called mutiple times every time we receive some data
        client.on('data', (data) => {
            var mergedArray = new Uint8Array(array.length + data.length);
            mergedArray.set(array);
            mergedArray.set(data, array.length);
            array = mergedArray;
        });

        // Called when socket is closed.
        client.on('close', () => {
            if (successCallback) {
                successCallback(array);
            }
        });
    }

    isFinished = (array) => {
        var count = 0;

        Object.keys(array).forEach(function(key, index) {
            if (this[key].isSet === true) {
                count++;
            }
        }, array);

        //console.log("Is finished: " + count + "/" + Object.keys(array).length);
        if (count === Object.keys(array).length) {
            return true;
        }
        return false;
    }

    scanCamerasTcp = (ipRange, completionCallback) => {

        this.isScanFinished = false;

        var net = window.net;

        var ipRangeParts = ipRange.split(".");
        // We assume 192.168.0.1 (4 parts)
        if (ipRangeParts.length !== 4) {
            this.log.warn("[scanCamerasTcp] IP range is not valid: " + ipRange + ". Do nothing.");
            completionCallback([]);
            return;
        }

        // TODO: Support single IP
        var ipRangePrefix = ipRangeParts[0] + "." + ipRangeParts[1] + "." + ipRangeParts[2] + ".";
        var ipRangeStart = ipRangeParts[3].split("-")[0];
        var ipRangeEnd = ipRangeParts[3].split("-")[1];

        var stateArray = [];

        for (var i = ipRangeStart; i <= ipRangeEnd; i++) {

            var ip = ipRangePrefix + i;
            stateArray[ip] = {
                isSet: false,
                isOnline: false,
                hostname: null,
                deviceId: null,
                state: null,
                width: null,
                height: null,
                hasVideo: null,
                hasAudio: null
            };

            ((ipClient) => {
                var client = new net.Socket();
                var array = new Uint8Array();

                // Try one second to find open port
                client.setTimeout(1000);

                client.on("timeout", () => {
                    //console.log("timeout"+ ipClient);
                    client.destroy();
                });

                client.connect(Constant.PORT_LISTEN_COMMAND_TCP, ipClient, () => {
                    client.write("SCAN");
                    stateArray[ipClient].isOnline = true;
                });

                // Called mutiple times every time we receive some data
                client.on("data", (data) => {
                    var mergedArray = new Uint8Array(array.length + data.length);
                    mergedArray.set(array);
                    mergedArray.set(data, array.length);
                    array = this.utility.arrayBufferToString(mergedArray);
                });
        
                client.on('close', () => {
                    // Array can be of length null for old versions of the camera
                    if (stateArray[ipClient].isOnline === true && array.length > 0) {
                        stateArray[ipClient].isSet = true;
                        stateArray[ipClient].hostname = array.split(" ")[1];
                        stateArray[ipClient].deviceId = array.split(" ")[2];
                        stateArray[ipClient].state = array.split(" ")[3];
                        stateArray[ipClient].width = array.split(" ")[4];
                        stateArray[ipClient].height = array.split(" ")[5];
                        stateArray[ipClient].hasVideo = array.split(" ")[6];
                        stateArray[ipClient].hasAudio = array.split(" ")[7];
                    } else {
                        stateArray[ipClient] = {
                            isSet: true,
                            isOnline: false
                        }
                    }

                    if (this.isFinished(stateArray) && this.isScanFinished === false) {
                        this.isScanFinished = true;
                        completionCallback(stateArray);
                    }
                });
        
                client.on('error', () => {
                    //console.log("error"+ ipClient);
                });
            })(ip);
        }
    }
}