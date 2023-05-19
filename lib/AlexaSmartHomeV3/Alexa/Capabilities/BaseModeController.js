const Properties = require('../Properties');
const Base = require('./Base')

class BaseModeController extends Base {

    constructor() {
        super();
        this._property = new Properties.Mode()
    }

    initProperties() {
        return [this._property];
    }

    /**
     * Returns response to Alexa Discovery directive
     * @returns {object}
     */
    get alexaResponse() {
        return {
            interface: this.namespace,
            instance: this.instance,
            version: this.version,
            properties: this.discoverableProperties,
            capabilityResources: this.capabilityResources
        };
    }

    get discoverableProperties() {
        return {
            supported: this.properties.map(p => { return { name: p.propertyName } }),
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable,
            nonControllable: false
        };
    }

    get capabilityResources() {
        return { friendlyNames: this.friendlyNames }
    }

    get friendlyNames() {
        return []
    }

    get modeName() {
        return this._property.modeName;
    }

    get instance() {
        return `${this.modeName}`
    }

    get configuration() {
        return {
            ordered: false,
            supportedModes: this._property.supportedModes
        }
    }
}

module.exports = BaseModeController;