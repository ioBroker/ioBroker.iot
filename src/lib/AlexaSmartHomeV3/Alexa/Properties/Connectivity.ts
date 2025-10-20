import Base, { type ControlStateInitObject } from './Base';
import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class Connectivity extends Base {
    constructor(opts: ControlStateInitObject) {
        super(opts);
    }

    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.EndpointHealth';
    }

    matches(event: AlexaV3Request): boolean {
        return Connectivity.matches(event);
    }

    alexaValue(_value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        return undefined;
    }
}
