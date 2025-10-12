"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AlexaResponse_1 = __importDefault(require("../AlexaResponse"));
const Base_1 = __importDefault(require("./Base"));
class Discovery extends Base_1.default {
    handle(event, endpointManager) {
        this.log.debug(`handling Discovery`);
        this.log.silly(`${JSON.stringify(event)}`);
        const endpoints = endpointManager.endpoints;
        const response = new AlexaResponse_1.default({
            namespace: Discovery.namespace,
            name: 'Discover.Response',
            messageId: event?.directive?.header?.messageId,
        });
        let count = 0;
        endpoints.forEach(endpoint => {
            count++;
            if (count > 300) {
                this.log.warn(`Too many devices. Alexa supports up to 300 devices. ${endpoint.friendlyName} will not be discovered.`);
                return;
            }
            response.addPayloadEndpoint({
                endpointId: endpoint.id,
                description: endpoint.description || undefined,
                friendlyName: endpoint.friendlyName,
                displayCategories: endpoint.displayCategories || [],
                capabilities: endpoint.capabilities?.map(capability => response.asEndpointCapability(capability.alexaResponse)) ||
                    [],
            });
        });
        this.log.silly(`${JSON.stringify(response.get())}`);
        return Promise.resolve(response.get());
    }
}
exports.default = Discovery;
//# sourceMappingURL=Discovery.js.map