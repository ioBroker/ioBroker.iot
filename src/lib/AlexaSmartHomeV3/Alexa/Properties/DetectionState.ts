import Base from './Base';
import type { AlexaV3DirectiveName, AlexaV3Request } from '../../types';

export default class DetectionState extends Base {
    static matches(event: AlexaV3Request): boolean {
        return (
            event?.directive?.header?.namespace === 'Alexa.MotionSensor' ||
            event?.directive?.header?.namespace === 'Alexa.ContactSensor'
        );
    }

    matches(event: AlexaV3Request): boolean {
        return DetectionState.matches(event);
    }

    static get DETECTED(): AlexaV3DirectiveName {
        return 'DETECTED';
    }

    static get NOT_DETECTED(): AlexaV3DirectiveName {
        return 'NOT_DETECTED';
    }
}
