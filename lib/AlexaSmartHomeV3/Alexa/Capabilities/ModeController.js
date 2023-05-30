const Properties = require('../Properties');
const Base = require('./Base');

class ModeController extends Base {

    initProperties() {
        this._property = new Properties.Mode()
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
            configuration: this.configurationAsDiscoveryResponse,
            semantics: this.semanticsAsDiscoveryResponse,
            capabilityResources: this.capabilityResourcesAsDiscoveryResponse
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

    get capabilityResourcesAsDiscoveryResponse() {
        return { friendlyNames: this.friendlyNames }
    }

    get friendlyNames() {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Setting.Mode'
                }
            }
        ]
    }

    get instance() {
        return `${this._property.instance}`
    }

    get configurationAsDiscoveryResponse() {
        return {
            ordered: false,
            supportedModes: this._property.supportedModes.flatMap(mode => mode.discoveryResponse)
        }
    }

    get semanticsAsDiscoveryResponse() {
        return {
            actionMappings: this._property.supportedModes.flatMap(mode => mode.actionMappings),
            stateMappings: this._property.supportedModes.flatMap(mode => mode.stateMappings)
        }
    }
}

module.exports = ModeController;