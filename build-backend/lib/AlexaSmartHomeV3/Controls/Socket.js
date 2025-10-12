"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PowerController_1 = __importDefault(require("../Alexa/Capabilities/PowerController"));
const Control_1 = __importDefault(require("./Control"));
class Socket extends Control_1.default {
    get categories() {
        return ['SMARTPLUG'];
    }
    initCapabilities() {
        const result = [new PowerController_1.default()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject());
        }
        return result;
    }
}
exports.default = Socket;
//# sourceMappingURL=Socket.js.map