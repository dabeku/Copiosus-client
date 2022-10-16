export default class Bridge {

    getPassword = function(serviceName, accountName) {
        return new Promise(function(fulfill, reject) {
            const password = window.ipc.sendSync("get-password", serviceName, accountName);
            fulfill(password);
        });
        
    }

    setPassword = function(serviceName, accountName, password) {
        return new Promise(function(fulfill, reject) {
            window.ipc.sendSync("set-password", serviceName, accountName, password);
            fulfill();
        });
    }

    getAppVersion = function() {
        return window.ipc.sendSync("get-app-version");
    }

    isOpenAtLogin = function() {
        return window.ipc.sendSync("is-open-at-login");
    }

    setLoginItemSettings = function(openAtLogin, openAsHidden) {
        return window.ipc.sendSync("set-login-item-settings", openAtLogin, openAsHidden);
    }

    disconnect = function() {
        window.realtime.disconnect();
    }

    /*
     * Filesystem
     */

    exists = function(absolutePath) {
        return window.ipc.sendSync("exists", absolutePath);
    }

    mkdirs = function(absolutePath) {
        window.ipc.sendSync("mkdirs", absolutePath);
    }

    getSeparator = function() {
        return window.ipc.sendSync("get-separator");
    }

    writeFile = function(absolutePath, data, callback) {
        window.ipc.send("write-file", {
            absolutePath: absolutePath,
            data: data
        });
        window.ipc.once("write-file-" + absolutePath, (event, args) => {
            callback(args);
        });
    }

    readFile = function(absolutePath, callback) {
        window.ipc.send("read-file", {
            absolutePath: absolutePath
        });
        window.ipc.once("read-file-" + absolutePath, (event, args) => {
            callback(args.err, args.data);
        });
    }

    getPath = function(folder) {
        return window.ipc.sendSync("get-path", folder);
    }

    statSync = function(absolutePath) {
        return window.ipc.sendSync("stat-sync", absolutePath);
    } 

    openItem = function(absolutePath) {
        window.ipc.sendSync("open-item", absolutePath);
    }

    networkInterfaces = function() {
        return window.ipc.sendSync("network-interfaces");
    }

    subnet = function(address, netmask) {
        return window.ipc.sendSync("subnet", address, netmask);
    }
}