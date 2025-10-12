"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Volume = void 0;
const AdjustableProperty_1 = __importDefault(require("./AdjustableProperty"));
class Volume extends AdjustableProperty_1.default {
    static matches(event) {
        return event?.directive?.header?.namespace === 'Alexa.Speaker';
    }
    matches(event) {
        return Volume.matches(event) && ['AdjustVolume', 'SetVolume'].includes(event?.directive?.header?.name);
    }
    static directive(event) {
        return event.directive.header.name === 'AdjustVolume' ? Volume.ADJUST : Volume.SET;
    }
}
exports.Volume = Volume;
exports.default = Volume;
//# sourceMappingURL=Volume.js.map