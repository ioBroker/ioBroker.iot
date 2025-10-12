"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Capabilities_1 = __importDefault(require("../Alexa/Capabilities"));
const ModeValues_1 = __importDefault(require("../Alexa/ModeValues"));
const Control_1 = __importDefault(require("./Control"));
class Gate extends Control_1.default {
    get categories() {
        return ['GARAGE_DOOR'];
    }
    initCapabilities() {
        const result = [new Capabilities_1.default.ModeController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.modeInitObject());
        }
        return result;
    }
    modeInitObject() {
        const map = this.statesMap;
        const mode = 'Gate.Position';
        return {
            setState: this.states[map.set],
            getState: this.states[map.set],
            alexaSetter: function (alexaValue) {
                return alexaValue === `${mode}.${ModeValues_1.default.Open.value}`;
            },
            alexaGetter: function (value) {
                return value ? `${mode}.${ModeValues_1.default.Open.value}` : `${mode}.${ModeValues_1.default.Closed.value}`;
            },
            instance: mode,
            supportedModes: [new ModeValues_1.default.Open(mode), new ModeValues_1.default.Closed(mode)],
        };
    }
}
exports.default = Gate;
//# sourceMappingURL=Gate.js.map