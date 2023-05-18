const Base = require('./Base');

class LockState extends Base {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.LockController';
    }

    matches(event) {
        return LockState.matches(event);
    }

    alexaDirectiveValue(event) {
        return event.directive.header.name;
    }

    static get LOCK() {
        return 'Lock';
    }

    static get LOCKED() {
        return 'LOCKED';
    }

    static get UNLOCK() {
        return 'Unlock';
    }

    static get UNLOCKED() {
        return 'UNLOCKED';
    }

    /**
     * The lock can't transition to `locked` or `unlocked` because the locking mechanism is jammed.
     */
    static get JAMMED() {
        return 'JAMMED';
    }
}

module.exports = LockState;