"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const Utils_1 = require("../../Helpers/Utils");
class Base {
    _properties;
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
     *
     * @param event Contains the Alexa event.
     */
    matches(event) {
        return (event?.directive?.header?.namespace === this.namespace &&
            event?.directive?.header?.payloadVersion === this.version);
    }
    static get namespace() {
        return `Alexa.${(0, Utils_1.className)(this.toString())}`;
    }
    /**
     * Checks whether the capability object matches, i.e., can handle the event Alexa sends to the skill
     *
     * @param event Contains the Alexa event.
     */
    static matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }
    get properties() {
        return this._properties;
    }
    /**
     *
     * @param event Contains the Alexa event.
     * @returns Property to handle on Alexa directive
     */
    property(event) {
        return this.properties.find(p => p.matches(event));
    }
    /**
     * Returns object containing all the properties of the smart device capability as it expected by Alexa during discovery
     */
    get discoverableProperties() {
        return {
            supported: this.properties.map(p => {
                return { name: p.propertyName };
            }),
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable,
        };
    }
    /**
     * Returns whether the smart device proactively reports state changes
     */
    get proactivelyReported() {
        return true;
    }
    /**
     * Returns whether the smart device handles Alexa ReportState directives
     */
    get retrievable() {
        return true;
    }
    get version() {
        return '3';
    }
    /**
     * Returns response to Alexa Discovery directive
     */
    get alexaResponse() {
        return {
            interface: this.namespace,
            version: this.version,
            properties: this.discoverableProperties,
        };
    }
    propertyName(event) {
        return this.property(event)?.propertyName;
    }
    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     */
    alexaValue(event) {
        throw new Error(`Method alexaValue is not implemented in ${this.name} capability`);
        // @ts-expect-error fix later!!!!
        return this.property(event)?.alexaValue(event);
    }
    /**
     * Extracts endpoint id sent in an Alexa directive
     */
    static endpointId(event) {
        return event.directive.endpoint?.endpointId;
    }
}
exports.Base = Base;
exports.default = Base;
//# sourceMappingURL=Base.js.map