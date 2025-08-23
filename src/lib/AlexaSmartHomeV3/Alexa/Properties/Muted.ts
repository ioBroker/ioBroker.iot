import Base from './Base';
import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class Muted extends Base {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.Speaker';
    }

    matches(event: AlexaV3Request): boolean {
        return Muted.matches(event) && event?.directive?.header?.name === 'SetMute';
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return !!event.directive.payload.mute;
    }
}
