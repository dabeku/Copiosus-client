import Utility from "./utility";

export default class Log {

    constructor() {
        this.utility = new Utility();
        this.level = "INFO";
        this.isDebug = this.level === "DEBUG";
        this.isInfo = this.level === "DEBUG" || this.level === "INFO";
    }

    debug = function(msg) {
        if (this.isDebug) {
            console.groupCollapsed(this.utility.formatDate(new Date()) + " DEBUG: " + msg);
            console.trace();
            console.groupEnd();
        }
    }

    info = function(msg) {
        if (this.isInfo) {
            console.groupCollapsed(this.utility.formatDate(new Date()) + " INFO: " + msg);
            console.trace();
            console.groupEnd();
        }
    }

    warn = function(msg) {
        console.warn(this.utility.formatDate(new Date()) + " WARN: " + msg);
    }

    error = function(msg) {
        console.error(this.utility.formatDate(new Date()) + " ERROR: " + msg);
    }
}