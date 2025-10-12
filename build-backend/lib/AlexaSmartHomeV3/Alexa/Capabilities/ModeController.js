"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
const Mode_1 = __importDefault(require("../Properties/Mode"));
class ModeController extends Base_1.default {
    _property;
    initProperties() {
        this._property = new Mode_1.default();
        return [this._property];
    }
    /**
     * Returns response to Alexa Discovery directive
     */
    get alexaResponse() {
        return {
            interface: this.namespace,
            instance: this.instance,
            version: this.version,
            properties: this.discoverableProperties,
            configuration: this.configurationAsDiscoveryResponse,
            semantics: this.semanticsAsDiscoveryResponse,
            capabilityResources: this.capabilityResourcesAsDiscoveryResponse,
        };
    }
    get discoverableProperties() {
        return {
            supported: this.properties.map(p => {
                return { name: p.propertyName };
            }),
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable,
            nonControllable: false,
        };
    }
    get capabilityResourcesAsDiscoveryResponse() {
        return { friendlyNames: this.friendlyNames };
    }
    get friendlyNames() {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Setting.Mode',
                },
            },
        ];
    }
    get instance() {
        return `${this._property.instance}`;
    }
    get configurationAsDiscoveryResponse() {
        return {
            ordered: false,
            supportedModes: this._property.supportedModes.flatMap(mode => mode.discoveryResponse),
        };
    }
    get semanticsAsDiscoveryResponse() {
        return {
            actionMappings: this._property.supportedModes.flatMap(mode => mode.actionMappings),
            stateMappings: this._property.supportedModes.flatMap(mode => mode.stateMappings),
        };
    }
}
exports.default = ModeController;
//# sourceMappingURL=ModeController.js.map