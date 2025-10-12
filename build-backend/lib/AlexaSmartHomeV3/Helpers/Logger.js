"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AdapterProvider_1 = __importDefault(require("./AdapterProvider"));
class Logger {
    logged = new Map();
    maxLoggedEntries = 500;
    ttl = 30;
    _component;
    constructor(instance) {
        if (instance && typeof instance === 'object' && 'constructor' in instance) {
            this._component = instance.constructor.name || 'Unknown';
        }
        else if (typeof instance === 'string') {
            this._component = instance;
        }
        else {
            this._component = 'Unknown';
        }
    }
    get component() {
        return this._component;
    }
    set component(value) {
        this._component = value;
    }
    static hashCode(str) {
        let hash = 0;
        let i;
        let chr;
        if (str.length === 0) {
            return hash;
        }
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    toSkip(hash) {
        // clear old entries
        let keys = Array.from(this.logged.keys());
        const now = new Date().getTime();
        for (const key of keys) {
            const expired = (now - key) / 1000 > this.ttl;
            if (expired) {
                this.logged.delete(key);
            }
        }
        keys = Array.from(this.logged.keys());
        if (keys.length > this.maxLoggedEntries) {
            const toRemove = keys.length - this.maxLoggedEntries;
            keys.sort();
            for (let i = 0; i < toRemove; i++) {
                this.logged.delete(keys[i]);
            }
        }
        return Array.from(this.logged.values()).includes(hash);
    }
    compose(message) {
        return `[AlexaV3::${this.component}]: ${message}`;
    }
    print(logger, message) {
        if (typeof message === 'string' && message.length > 0) {
            const hash = Logger.hashCode(message);
            if (this.toSkip(hash)) {
                return;
            }
            this.logged.set(new Date().getTime(), hash);
            return logger(message);
        }
    }
    silly(message) {
        return this.print(AdapterProvider_1.default.get().log.silly, this.compose(message));
    }
    debug(message) {
        return this.print(AdapterProvider_1.default.get().log.debug, this.compose(message));
    }
    info(message) {
        return this.print(AdapterProvider_1.default.get().log.info, this.compose(message));
    }
    warn(message) {
        return this.print(AdapterProvider_1.default.get().log.warn, this.compose(message));
    }
    error(message) {
        return this.print(AdapterProvider_1.default.get().log.error, this.compose(message));
    }
}
exports.default = Logger;
//# sourceMappingURL=Logger.js.map