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

    reportValue(isError: AlexaV3DirectiveValue): any {
        return isError ? { value: 'UNREACHABLE' } : { value: 'OK' };
    }

    alexaValue(isError: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        return isError as AlexaV3DirectiveValue;
    }
}
