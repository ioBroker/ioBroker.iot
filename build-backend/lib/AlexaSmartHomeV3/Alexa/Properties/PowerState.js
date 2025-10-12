"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class PowerState extends Base_1.default {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.PowerController';
    }
    matches(event) {
        return PowerState.matches(event);
    }
    static get ON() {
        return 'ON';
    }
    static get OFF() {
        return 'OFF';
    }
    alexaDirectiveValue(event) {
        return event.directive.header.name === 'TurnOn' ? PowerState.ON : PowerState.OFF;
    }
}
exports.default = PowerState;
//# sourceMappingURL=PowerState.js.map