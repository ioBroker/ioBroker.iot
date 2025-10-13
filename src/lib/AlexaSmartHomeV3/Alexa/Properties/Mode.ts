import Base, { type ControlStateInitObject } from './Base';
import type {
    AlexaV3ActionMapping,
    AlexaV3DirectiveValue,
    AlexaV3DiscoveryResponse,
    AlexaV3Request,
    AlexaV3StateMapping,
} from '../../types';

export default class Mode extends Base {
    private readonly _supportedModes: {
        value: string;
        actionMappings: AlexaV3ActionMapping[];
        discoveryResponse: AlexaV3DiscoveryResponse[];
        stateMappings: AlexaV3StateMapping[];
    }[];

    constructor(opts: ControlStateInitObject) {
        super(opts);
        if (!opts.supportedModes || !Array.isArray(opts.supportedModes) || opts.supportedModes.length === 0) {
            throw new Error('Mode control requires supportedModes array with at least one mode');
        }
        if (!opts.instance || typeof opts.instance !== 'string') {
            throw new Error('Mode control requires a valid instance string');
        }
        this._supportedModes = opts.supportedModes;
    }

    matches(event: AlexaV3Request): boolean {
        return (
            Mode.matches(event) &&
            // non-adjustable mode controller
            'SetMode' === event?.directive?.header?.name &&
            this.instance === event?.directive?.header?.instance &&
            this.supportedModes.map(mode => mode.value).includes(event?.directive?.payload?.mode || '')
        );
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return event.directive.payload.mode;
    }

    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        if (
            (typeof value === 'string' || typeof value === 'number') &&
            this.supportedModes[parseInt(value as string, 10)]
        ) {
            return this.supportedModes[parseInt(value as string, 10)].value;
        }
        return this.supportedModes[0].value;
    }

    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        const pos = this.supportedModes.findIndex(mode => mode.value === alexaValue);
        if (pos !== -1) {
            return pos;
        }
        return undefined;
    }

    get supportedModes(): {
        value: string;
        actionMappings: AlexaV3ActionMapping[];
        discoveryResponse: AlexaV3DiscoveryResponse[];
        stateMappings: AlexaV3StateMapping[];
    }[] {
        return this._supportedModes;
    }
}
