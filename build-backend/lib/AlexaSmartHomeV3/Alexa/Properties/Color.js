"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class Color extends Base_1.default {
    _hal = {
        hue: '',
        saturation: '',
        brightness: '',
    };
    init(opts) {
        if (!opts.hal) {
            throw new Error('Color control requires hal object with hue, saturation, and brightness properties');
        }
        this.hal = opts.hal;
        this._setId = opts.hal.hue;
        this._getId = opts.hal.hue;
        if (opts.alexaSetter) {
            this._alexaSetter = opts.alexaSetter;
        }
        if (opts.alexaGetter) {
            this._alexaGetter = opts.alexaGetter;
        }
    }
    matches(event) {
        return Color.matches(event) && event?.directive?.header?.name === 'SetColor';
    }
    set hal(value) {
        this._hal = value;
    }
    get hal() {
        return this._hal;
    }
}
exports.default = Color;
//# sourceMappingURL=Color.js.map