"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../../Helpers/Utils");
const AlexaResponse_1 = __importDefault(require("../AlexaResponse"));
const Base_1 = __importDefault(require("./Base"));
/**
 * When the state of an endpoint changes for any reason, we report that change to Alexa in an Alexa.ChangeReport event.
 * Alexa can then provide the status change to the customer.
 * In the change report, we specify the state of any changed properties in the payload object.
 * For example, if a customer manually turns on a light, we send a change report event that indicates the powerState property
 * of the Alexa.PowerController interface has changed its value to ON.
 *
 * If the properties of an interface are reported as proactivelyReported during discovery,
 * we must send Alexa an Alexa.ChangeReport event whenever a property value changes.
 * If a state change happens because of a directive from Alexa, we send both a directive response and a change report event.
 */
class ChangeReport extends Base_1.default {
    static matches(event) {
        return event?.directive?.header?.name === (0, Utils_1.className)(this.toString());
    }
    static get(endpointId, propertyName, isPhysicalInteraction, messageId) {
        return {
            directive: {
                header: {
                    name: (0, Utils_1.className)(this.toString()),
                    propertyName: propertyName,
                    physicalInteraction: isPhysicalInteraction,
                    messageId,
                    payloadVersion: '3',
                    namespace: 'Alexa',
                },
                endpoint: {
                    scope: {
                        type: 'BearerToken',
                        token: '',
                    },
                    endpointId,
                },
                payload: {},
            },
        };
    }
    async handle(event, endpointManager) {
        this.log.debug(`handling ChangeReport`);
        this.log.silly(`${JSON.stringify(event)}`);
        const endpointId = event.directive?.endpoint?.endpointId;
        const propertyName = event.directive?.header?.propertyName;
        const changeCauseType = event.directive?.header?.physicalInteraction
            ? 'PHYSICAL_INTERACTION'
            : 'VOICE_INTERACTION';
        let response = new AlexaResponse_1.default({
            namespace: 'Alexa',
            name: 'ChangeReport',
            messageId: event?.directive?.header?.messageId,
            endpointId,
            changeCauseType,
        });
        response.addContext();
        const endpoint = endpointId ? endpointManager.endpointById(endpointId) : null;
        if (endpoint?.reportState) {
            const properties = await endpoint.reportState();
            for (const property of properties) {
                if (propertyName === property.name) {
                    response.addPayloadChangeProperty(property);
                }
                else {
                    response.addContextProperty(property);
                }
            }
        }
        else {
            response = AlexaResponse_1.default.nonExistingEndpoint(event.directive.header.messageId, endpointId);
        }
        this.log.debug(`${JSON.stringify(response.get())}`);
        return response.get();
    }
}
exports.default = ChangeReport;
//# sourceMappingURL=ChangeReport.js.map