"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Capabilities_1 = __importDefault(require("../Alexa/Capabilities"));
const Control_1 = __importDefault(require("./Control"));
class Light extends Control_1.default {
    get categories() {
        return ['LIGHT'];
    }
    initCapabilities() {
        const result = [new Capabilities_1.default.PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject());
        }
        return result;
    }
    initEnforcedCapabilities() {
        const result = [new Capabilities_1.default.BrightnessController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.brightnessInitObject());
        }
        return result;
    }
    get statesMap() {
        return {
            set: 'SET',
            actual: 'ON_ACTUAL',
        };
    }
    brightnessInitObject() {
        const map = this.statesMap;
        return {
            setState: this.states[map.set],
            getState: this.states[map.actual],
            alexaSetter: function (alexaValue) {
                return alexaValue > 0;
            },
            alexaGetter: function (value) {
                return value ? 100 : 0;
            },
        };
    }
}
exports.default = Light;
//# sourceMappingURL=Light.js.map