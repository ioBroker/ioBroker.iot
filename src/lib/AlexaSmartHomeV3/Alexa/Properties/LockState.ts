import Base from './Base';
import type { AlexaV3DirectiveName, AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class LockState extends Base {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.LockController';
    }

    matches(event: AlexaV3Request): boolean {
        return LockState.matches(event);
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        return event.directive.header.name as 'Lock' | 'Unlock';
    }

    static get LOCK(): string {
        return 'Lock';
    }

    static get LOCKED(): AlexaV3DirectiveName {
        return 'LOCKED';
    }

    static get UNLOCK(): string {
        return 'Unlock';
    }

    static get UNLOCKED(): AlexaV3DirectiveName {
        return 'UNLOCKED';
    }

    /**
     * The lock can't transition to `locked` or `unlocked` because the locking mechanism is jammed.
     */
    static get JAMMED(): AlexaV3DirectiveName {
        return 'JAMMED';
    }
}
