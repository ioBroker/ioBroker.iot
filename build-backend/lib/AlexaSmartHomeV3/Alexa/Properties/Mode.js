"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = __importDefault(require("./Base"));
class Mode extends Base_1.default {
    _supportedModes = [];
    init(opts) {
        super.init(opts);
        if (!opts.supportedModes || !Array.isArray(opts.supportedModes) || opts.supportedModes.length === 0) {
            throw new Error('Mode control requires supportedModes array with at least one mode');
        }
        if (!opts.instance || typeof opts.instance !== 'string') {
            throw new Error('Mode control requires a valid instance string');
        }
        this._supportedModes = opts.supportedModes;
    }
    matches(event) {
        return (Mode.matches(event) &&
            // non-adjustable mode controller
            'SetMode' === event?.directive?.header?.name &&
            this.instance === event?.directive?.header?.instance &&
            this.supportedModes.map(mode => mode.value).includes(event?.directive?.payload?.mode || ''));
    }
    alexaDirectiveValue(event) {
        return event.directive.payload.mode;
    }
    get supportedModes() {
        return this._supportedModes;
    }
}
exports.default = Mode;
//# sourceMappingURL=Mode.js.map