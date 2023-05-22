const AdapterProvider = require("./AdapterProvider");

class Logger {
    constructor(instance) {
        this.component = instance.constructor.name;
        this.logged = new Map();
        this.maxLoggedEntries = 500;
        this.ttl = 30;
    }

    get component() {
        return this._component;
    }

    set component(value) {
        this._component = value;
    }

    hashCode(str) {
        var hash = 0,
            i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    toSkip(hash) {
        // clear old entries
        let keys = Array.from(this.logged.keys());
        const now = (new Date()).getTime();
        for (const key of keys) {
            // @ts-ignore
            const expired = ((now - key) / 1000) > this.ttl;
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
            const hash = this.hashCode(message);
            if (this.toSkip(hash)) {
                return;
            }

            this.logged.set((new Date()).getTime(), hash);
            return logger(message);
        }
    }

    silly(message) {
        return this.print(AdapterProvider.get().log.silly, this.compose(message));
    }

    debug(message) {
        return this.print(AdapterProvider.get().log.debug, this.compose(message));
    }

    info(message) {
        return this.print(AdapterProvider.get().log.info, this.compose(message));
    }

    warn(message) {
        return this.print(AdapterProvider.get().log.warn, this.compose(message));
    }

    error(message) {
        return this.print(AdapterProvider.get().log.error, this.compose(message));
    };
}

module.exports = Logger;