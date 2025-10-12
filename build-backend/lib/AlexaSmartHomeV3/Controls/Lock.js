"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Capabilities_1 = __importDefault(require("../Alexa/Capabilities"));
const Properties_1 = __importDefault(require("../Alexa/Properties"));
const Control_1 = __importDefault(require("./Control"));
class Lock extends Control_1.default {
    get categories() {
        return ['SMARTLOCK'];
    }
    initCapabilities() {
        const result = [new Capabilities_1.default.LockController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.lockStateInitObject());
        }
        return result;
    }
    lockStateInitObject() {
        const map = this.statesMap;
        return {
            setState: this.states[map.set],
            getState: this.states[map.actual],
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties_1.default.LockState.UNLOCK;
            },
            alexaGetter: function (value) {
                return value ? Properties_1.default.LockState.UNLOCKED : Properties_1.default.LockState.LOCKED;
            },
        };
    }
}
exports.default = Lock;
//# sourceMappingURL=Lock.js.map