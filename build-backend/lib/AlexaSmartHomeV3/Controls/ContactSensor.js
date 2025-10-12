"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ContactSensor_1 = require("../Alexa/Capabilities/ContactSensor");
const ReadOnlyDetector_1 = __importDefault(require("./ReadOnlyDetector"));
class ContactSensor extends ReadOnlyDetector_1.default {
    get capability() {
        return new ContactSensor_1.ContactSensor();
    }
    get categories() {
        return ['CONTACT_SENSOR'];
    }
}
exports.default = ContactSensor;
//# sourceMappingURL=ContactSensor.js.map