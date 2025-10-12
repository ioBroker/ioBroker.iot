"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AlexaResponse_1 = __importDefault(require("../Alexa/AlexaResponse"));
const Control_1 = __importDefault(require("./Control"));
class ReadOnlyDetector extends Control_1.default {
    get capability() {
        return undefined;
    }
    initCapabilities() {
        const result = [this.capability];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.detectedStateInitObject());
        }
        return result;
    }
    async handle(event) {
        this.log.error(`Setting value is not supported by ${this.name} control`);
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject(AlexaResponse_1.default.directiveNotSupportedByControl(this.name, event.directive.header.namespace, event.directive.header.messageId, event.directive.header.payloadVersion).get());
    }
}
exports.default = ReadOnlyDetector;
//# sourceMappingURL=ReadOnlyDetector.js.map