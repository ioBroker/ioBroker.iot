const Utils = require('../../Helpers/Utils');

class Base {
    constructor() {
        this._properties = this.initProperties();
    }

    get name() {
        return `${this.constructor.name}`;
    }

    get namespace() {
        return `Alexa.${this.constructor.name}`;
    }

    reportValue(value) {
        return value;
    }

    initProperties() {
        return [];
    }

    /**
     * Checks whether the capability instance matches, i.e. can handle the event Alexa sends to the skill
     * @param event Contains the Alexa event.
     * @returns {boolean}
     */
    matches(event) {
        return event?.directive?.header?.namespace === this.namespace && event?.directive?.header?.payloadVersion === this.version;
    }

    static get namespace() {
        return `Alexa.${Utils.className(this.toString())}`
    }

    /**
     * Checks whether the capability object matches, i.e., can handle the event Alexa sends to the skill
     * @param event Contains the Alexa event.
     * @returns {boolean}
     */
    static matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }

    get properties() {
        return this._properties;
    }

    /**
     *
     * @param {*} event Contains the Alexa event.
     * @returns Property to handle on Alexa directive
     */
    property(event) {
        return this.properties.find(p => p.matches(event));
    }

    /**
     * Returns object containing all the properties of the smart device capability as it expected by Alexa during discovery
     * @returns {object}
     */
    get discoverableProperties() {
        return {
            supported: this.properties.map(p => { return { name: p.propertyName } }),
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable,
        };
    }

    /**
     * Returns whether the smart device proactively reports state changes
     * @returns {boolean}
     */
    get proactivelyReported() {
        return true;
    }

    /**
     * Returns whether the smart device handles Alexa ReportState directives
     * @returns {boolean}
     */
    get retrievable() {
        return true;
    }

    get version() {
        return '3';
    }

    /**
     * Returns response to Alexa Discovery directive
     * @returns {object}
     */
    get alexaResponse() {
        return {
            interface: this.namespace,
            version: this.version,
            properties: this.discoverableProperties,
        };
    }

    propertyName(event) {
        return this.property(event).propertyName;
    }

    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     * @returns {object}
     */
    alexaValue(event) {
        return this.property(event).alexaValue(event);
    }

    /**
     * Extracts endpoint id sent in an Alexa directive
     * @returns {string}
     */
    static endpointId(event) {
        return event.directive.endpoint.endpointId;
    }
}

module.exports = Base;