"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class Muted extends Base_1.default {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.Speaker';
    }
    matches(event) {
        return Muted.matches(event) && event?.directive?.header?.name === 'SetMute';
    }
    alexaDirectiveValue(event) {
        return !!event.directive.payload.mute;
    }
}
exports.default = Muted;
//# sourceMappingURL=Muted.js.map