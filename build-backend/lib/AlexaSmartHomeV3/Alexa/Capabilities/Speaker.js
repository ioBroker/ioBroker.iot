"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Volume_1 = __importDefault(require("../Properties/Volume"));
const Muted_1 = __importDefault(require("../Properties/Muted"));
const Base_1 = __importDefault(require("./Base"));
class Speaker extends Base_1.default {
    _volume;
    _muted;
    initProperties() {
        this._volume = new Volume_1.default();
        this._muted = new Muted_1.default();
        return [this._volume, this._muted];
    }
    get volume() {
        return this._volume;
    }
    get muted() {
        return this._muted;
    }
}
exports.default = Speaker;
//# sourceMappingURL=Speaker.js.map