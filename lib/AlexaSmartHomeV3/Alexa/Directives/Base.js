const AlexaResponse = require('../AlexaResponse');

class Base {
    constructor() {

    }

    static get namespace() {
        let classNameRegEx = /(?:\S+\s+){1}([a-zA-Z_$][0-9a-zA-Z_$]*)/;
        return 'Alexa.' + classNameRegEx.exec(this.toString())[1];
    }

    /**
     * Checks whether the directive matches, i.e. can handle the event Alexa sends to the skill
     * @param event Contains the Alexa event.
     * @returns {boolean} 
     */
    static matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }

    async handle(event, endpointManager) {
        return null;
    }
}

module.exports = Base;