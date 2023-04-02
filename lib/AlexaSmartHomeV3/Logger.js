const AdapterProvider = require("./AdapterProvider");

class Logger {

    constructor(instance) {
        this.component = instance.constructor.name;
    }

    get component() {
        return this._component
    }

    set component(value) {
        this._component = value
    }

    compose(message) {
        return `[AlexaV3::${this.component}]: ${message}`;
    }

    print(logger, message) {
        if (typeof message === 'string' && message.length > 0) {
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