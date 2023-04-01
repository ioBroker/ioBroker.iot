const Adapter = require("./Adapter");

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

    silly(message) {
        return Adapter.get().log.silly(this.compose(message));
    }

    debug(message) {
        return Adapter.get().log.debug(this.compose(message));
    }

    info(message) {
        return Adapter.get().log.info(this.compose(message));
    }

    warn(message) {
        return Adapter.get().log.warn(this.compose(message));
    }

    error(message) {
        return Adapter.get().log.error(this.compose(message));
    };
}

module.exports = Logger;