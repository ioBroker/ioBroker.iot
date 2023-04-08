const Helpers = require("../../Helpers/Utils");

class Base {
    constructor() {
    }

    get name() {
        return `${this.constructor.name}`
    }

    get namespace() {
        return `Alexa.${this.constructor.name}`
    }

    reportValue(value) {
        return value
    }

    /**
     * Checks whether the capability instance matches, i.e. can handle the event Alexa sends to the skill
     * @param event Contains the Alexa event.
     * @returns {boolean} 
     */
    matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }

    static get namespace() {
        return 'Alexa.' + Helpers.className(this.toString())
    }

    /**
     * Checks whether the capability object matches, i.e. can handle the event Alexa sends to the skill
     * @param event Contains the Alexa event.
     * @returns {boolean} 
     */
    static matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }

    /**
     * Returns object containing all the properties of the smart device capability as it expected by Alexa
     * @returns {object} 
     */
    get properties() {
        return {
            supported: [
                {
                    name: this.propertyName
                }
            ],
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable
        };
    }

    /**
     * Returns whether the smart device proactively reports state changes 
     * @returns {boolean} 
     */
    get proactivelyReported() {
        return false;
    }

    /**
     * Returns whether the smart device handles Alexa ReportState directives
     * @returns {boolean} 
     */
    get retrievable() {
        return true;
    }

    /**
     * Returns response to Alexa Discovery directive
     * @returns {object} 
     */
    get alexaResponse() {
        return {
            interface: this.namespace,
            properties: this.properties
        };
    }

    get propertyName() {
        return 'not-defined'
    }

    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     * @returns {object} 
     */
    alexaValue(event) {
        return event.directive.payload[this.propertyName]
    }

    /**
     * Extracts endpoint id sent in an Alexa directive
     * @returns {string} 
     */
    static endpointId(event) {
        return event.directive.endpoint.endpointId;
    }

    static directive(event) {
        return 'SET'
    }
}

module.exports = Base;