"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class LockState extends Base_1.default {
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
exports.default = LockState;
//# sourceMappingURL=LockState.js.map