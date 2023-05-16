const Logger = require('../../Helpers/Logger');
const Utils = require('../../Helpers/Utils');

class Base {
    constructor() {
        this.log = new Logger(this);
    }

    static get namespace() {
        return `Alexa.${Utils.className(this.toString())}`;
    }

    /**
     * Checks whether the directive matches, i.e., can handle the event Alexa sends to the skill
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