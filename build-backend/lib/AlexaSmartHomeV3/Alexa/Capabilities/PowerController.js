"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PowerState_1 = __importDefault(require("../Properties/PowerState"));
const Base_1 = __importDefault(require("./Base"));
class PowerController extends Base_1.default {
    _powerState;
    initProperties() {
        this._powerState = new PowerState_1.default();
        return [this._powerState];
    }
    get powerState() {
        return this._powerState;
    }
}
exports.default = PowerController;
//# sourceMappingURL=PowerController.js.map