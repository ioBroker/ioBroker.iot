import Base from './Base';
import type { Base as PropertiesBase } from '../Properties/Base';
import Mode from '../Properties/Mode';
import type {
    AlexaV3ActionMapping,
    AlexaV3Capability,
    AlexaV3DiscoveryResponse,
    AlexaV3FriendlyName,
    AlexaV3StateMapping,
} from '../../types';

export default class ModeController extends Base {
    private _property: Mode | undefined;

    initProperties(): PropertiesBase[] {
        this._property = new Mode();
        return [this._property];
    }

    /**
     * Returns response to Alexa Discovery directive
     */
    get alexaResponse(): AlexaV3Capability {
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

    get discoverableProperties(): {
        supported: { name: string }[];
        proactivelyReported: boolean;
        retrievable: boolean;
        nonControllable: false;
    } {
        return {
            supported: this.properties.map(p => {
                return { name: p.propertyName };
            }),
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable,
            nonControllable: false,
        };
    }

    get capabilityResourcesAsDiscoveryResponse(): {
        friendlyNames: AlexaV3FriendlyName[];
    } {
        return { friendlyNames: this.friendlyNames };
    }

    get friendlyNames(): AlexaV3FriendlyName[] {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Setting.Mode',
                },
            },
        ];
    }

    get instance(): string {
        return `${this._property!.instance}`;
    }

    get configurationAsDiscoveryResponse(): {
        ordered: boolean;
        supportedModes: AlexaV3DiscoveryResponse[];
    } {
        return {
            ordered: false,
            supportedModes: this._property!.supportedModes.flatMap(mode => mode.discoveryResponse),
        };
    }

    get semanticsAsDiscoveryResponse(): {
        actionMappings: AlexaV3ActionMapping[];
        stateMappings: AlexaV3StateMapping[];
    } {
        return {
            actionMappings: this._property!.supportedModes.flatMap(mode => mode.actionMappings),
            stateMappings: this._property!.supportedModes.flatMap(mode => mode.stateMappings),
        };
    }
}
