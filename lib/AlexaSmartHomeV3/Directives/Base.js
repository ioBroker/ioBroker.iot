const AlexaResponse = require('../AlexaResponse');

class Base {
    constructor() {
    }

    static get namespace() {
        let classNameRegEx = /(?:\S+\s+){1}([a-zA-Z_$][0-9a-zA-Z_$]*)/;
        return 'Alexa.' + classNameRegEx.exec(this.toString())[1];
    }

    static matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }

    async handle(event, deviceManager) {
        return null;
    }
}

module.exports = Base;