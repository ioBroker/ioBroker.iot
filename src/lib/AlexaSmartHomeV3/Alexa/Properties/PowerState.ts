import Base from './Base';
import type { AlexaV3DirectiveName, AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class PowerState extends Base {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.PowerController';
    }

    matches(event: AlexaV3Request): boolean {
        return PowerState.matches(event);
    }

    static get ON(): AlexaV3DirectiveName {
        return 'ON';
    }

    static get OFF(): AlexaV3DirectiveName {
        return 'OFF';
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return event.directive.header.name === 'TurnOn' ? PowerState.ON : PowerState.OFF;
    }
}
