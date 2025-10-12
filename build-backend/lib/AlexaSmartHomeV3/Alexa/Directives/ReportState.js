"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../../Helpers/Utils");
const AlexaResponse_1 = __importDefault(require("../AlexaResponse"));
const Base_1 = __importDefault(require("./Base"));
/**
 * When Alexa sends an Alexa.ReportState directive to request the state of an endpoint, the skill sends an Alexa.StateReport response.
 * This response contains the current state of all the properties that are retrievable.
 * The following information in the Alexa.StateReport response:
 * - the state of all the retrievable properties in the context object
 * - endpoint for the report is identified in the endpoint object
 * - the payload is set to an empty object
 * - correlationToken set to the value from the Alexa.ReportState request
 */
class ReportState extends Base_1.default {
    static matches(event) {
        return event?.directive?.header?.name === (0, Utils_1.className)(this.toString());
    }
    async handle(event, endpointManager) {
        this.log.debug(`handling ReportState`);
        this.log.silly(`${JSON.stringify(event)}`);
        const endpointId = event.directive?.endpoint?.endpointId;
        let response = new AlexaResponse_1.default({
            namespace: 'Alexa',
            name: 'StateReport',
            correlationToken: event.directive?.header?.correlationToken,
            token: event.directive?.endpoint?.scope?.token,
            messageId: event.directive?.header?.messageId,
            endpointId,
        });
        const endpoint = endpointId ? endpointManager.endpointById(endpointId) : null;
        if (endpoint?.reportState) {
            const properties = await endpoint.reportState();
            properties.forEach(property => response.addContextProperty(property));
        }
        else {
            response = AlexaResponse_1.default.nonExistingEndpoint(event.directive.header.messageId, endpointId);
        }
        this.log.silly(`${JSON.stringify(response.get())}`);
        return response.get();
    }
}
exports.default = ReportState;
//# sourceMappingURL=ReportState.js.map