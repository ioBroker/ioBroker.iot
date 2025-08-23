import { className } from '../../Helpers/Utils';
import type {
    AlexaV3ActionMapping,
    AlexaV3DiscoveryResponse,
    AlexaV3FriendlyName,
    AlexaV3StateMapping,
} from '../../types';

export class Base {
    private readonly _mode: string;

    constructor(mode: string) {
        this._mode = mode;
    }

    static get value(): string {
        return className(this.toString());
    }

    get value(): string {
        return `${this._mode}.${this.constructor.name}`;
    }

    get friendlyNames(): AlexaV3FriendlyName[] {
        return [];
    }

    get discoveryResponse(): AlexaV3DiscoveryResponse {
        return {
            value: this.value,
            modeResources: {
                friendlyNames: this.friendlyNames,
            },
        };
    }

    get actionMappings(): AlexaV3ActionMapping[] {
        return [];
    }

    get stateMappings(): AlexaV3StateMapping[] {
        return [];
    }
}

export default Base;
