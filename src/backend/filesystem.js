import * as Constant from "../common/constant"
import Bridge from "../common/bridge"

export default class Filesystem {

    constructor() {
        this.bridge = new Bridge();
    }

    exists = function(absolutePath) {
        return this.bridge.exists(absolutePath);
    }

    mkdirs = function(absolutePath) {
        this.bridge.mkdirs(absolutePath);
    }

    getSeparator = function() {
        return this.bridge.getSeparator();
    }

    getStorageFolder = function() {
        return this.bridge.getPath("documents") + this.getSeparator() + Constant.APP_FOLDER;
    }

    writeFile = function(absolutePath, data, callback) {
        this.bridge.writeFile(absolutePath, data, callback);
    }

    readFile = function(absolutePath, callback) {
        this.bridge.readFile(absolutePath, callback);
    }

    isImage = function(fileName) {
        return fileName.toLowerCase().endsWith(".png") ||
            fileName.toLowerCase().endsWith(".jpg") ||
            fileName.toLowerCase().endsWith(".jpeg");
    }

    getFileName = function(message) {
        if (!message.metaInformation) {
            return null;
        }
        return message.metaInformation.fileName; 
    }
}