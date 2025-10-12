"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const Utils = __importStar(require("../Helpers/Utils"));
/**
 * Helper class to generate an AlexaResponse.
 */
class AlexaResponse {
    context;
    iobVersion = '1';
    event;
    static ErrorResponseName = 'ErrorResponse';
    static isErrorResponse(response) {
        return response?.event?.header?.name === AlexaResponse.ErrorResponseName;
    }
    static errorResponse(messageId, payload) {
        return new AlexaResponse({
            name: AlexaResponse.ErrorResponseName,
            payload,
            messageId,
        });
    }
    static endpointUnreachable(messageId) {
        return AlexaResponse.errorResponse(messageId, {
            type: 'ENDPOINT_UNREACHABLE',
            message: 'Unable to reach endpoint.',
        });
    }
    static directiveNotSupportedByControl(controlName, namespace, messageId, payloadVersion) {
        return AlexaResponse.errorResponse(messageId, {
            type: 'INTERNAL_ERROR',
            message: `Control ${controlName} doesn't support the ${namespace} with payloadVersion ${payloadVersion}`,
        });
    }
    static directiveNotSupportedByDevice(deviceName, namespace, messageId, payloadVersion) {
        return AlexaResponse.errorResponse(messageId, {
            type: 'INTERNAL_ERROR',
            message: `Device ${deviceName} doesn't support the ${namespace} with payloadVersion ${payloadVersion}`,
        });
    }
    static nonExistingEndpoint(messageId, endpointId) {
        return AlexaResponse.errorResponse(messageId, {
            type: 'INTERNAL_ERROR',
            message: `No endpoint with id ${endpointId} found`,
        });
    }
    /**
     * Composes Alexa respond on a successfully processed Alexa directive to change the capability's value of a device
     */
    static handled(event, propertyName, value, propertyInstance) {
        const response = new AlexaResponse({
            correlationToken: event?.directive?.header?.correlationToken,
            token: event?.directive?.endpoint?.scope?.token,
            endpointId: event?.directive?.endpoint?.endpointId,
            messageId: event?.directive?.header?.messageId,
        });
        response.addContextProperty({
            namespace: event?.directive?.header?.namespace,
            name: propertyName,
            instance: propertyInstance,
            value,
        });
        return response;
    }
    /**
     * Constructor for an Alexa Response.
     *
     * @param opts Contains initialization options for the response
     */
    constructor(opts) {
        opts ||= {};
        if (opts.context !== undefined) {
            this.context = Utils.defaultIfNullOrEmpty(opts.context, undefined);
        }
        if (opts.event !== undefined) {
            this.event = Utils.defaultIfNullOrEmpty(opts.event, undefined);
        }
        else {
            this.event = {
                header: {
                    namespace: Utils.defaultIfNullOrEmpty(opts.namespace, 'Alexa'),
                    name: Utils.defaultIfNullOrEmpty(opts.name, 'Response'),
                    messageId: Utils.defaultIfNullOrEmpty(opts.messageId, (0, uuid_1.v4)()),
                    correlationToken: Utils.defaultIfNullOrEmpty(opts.correlationToken, undefined),
                    payloadVersion: Utils.defaultIfNullOrEmpty(opts.payloadVersion, '3'),
                },
                endpoint: {
                    scope: {
                        type: 'BearerToken',
                        token: Utils.defaultIfNullOrEmpty(opts.token, 'INVALID'),
                    },
                    endpointId: Utils.defaultIfNullOrEmpty(opts.endpointId, 'INVALID'),
                },
                payload: Utils.defaultIfNullOrEmpty(opts.payload, {}),
            };
            if (opts.changeCauseType) {
                this.event.payload.change = {
                    cause: {
                        type: opts.changeCauseType,
                    },
                    properties: [],
                };
            }
        }
        if (!this.event) {
            throw new Error('Event is not defined');
        }
        // No endpoint in an AcceptGrant or Discover request
        if (this.event.header.name === 'AcceptGrant.Response' || this.event.header.name === 'Discover.Response') {
            delete this.event.endpoint;
        }
    }
    addContext() {
        this.context ||= { properties: [] };
    }
    /**
     * Add a property to the context.
     *
     * @param opts Contains options for the property.
     */
    addContextProperty(opts) {
        this.addContext();
        const property = {
            namespace: Utils.defaultIfNullOrEmpty(opts.namespace, 'Alexa.EndpointHealth'),
            instance: Utils.defaultIfNullOrEmpty(opts.instance, undefined),
            name: Utils.defaultIfNullOrEmpty(opts.name, 'connectivity'),
            value: Utils.defaultIfNullOrEmpty(opts.value, { value: 'OK' }),
            timeOfSample: Utils.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Utils.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0),
        };
        if (!property.instance) {
            delete property.instance;
        }
        this.context.properties.push(property);
    }
    /**
     * Add a property to the payload.
     *
     * @param opts Contains options for the property.
     */
    addPayloadChangeProperty(opts) {
        opts ||= {};
        const property = {
            namespace: Utils.defaultIfNullOrEmpty(opts.namespace, 'Alexa.EndpointHealth'),
            instance: Utils.defaultIfNullOrEmpty(opts.instance, undefined),
            name: Utils.defaultIfNullOrEmpty(opts.name, 'connectivity'),
            value: Utils.defaultIfNullOrEmpty(opts.value, { value: 'OK' }),
            timeOfSample: Utils.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Utils.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0),
        };
        if (!property.instance) {
            delete property.instance;
        }
        if (!this.event) {
            throw new Error('Event is not defined');
        }
        this.event.payload.change ||= { properties: [], cause: { type: 'APP_INTERACTION' } };
        this.event.payload.change.properties.push(property);
    }
    static alexaCapability() {
        return [
            {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3',
            },
        ];
    }
    /**
     * Adds an endpoint to the payload.
     *
     * @param opts Contains options for the endpoint.
     */
    addPayloadEndpoint(opts) {
        if (!this.event) {
            throw new Error('Event is not defined');
        }
        this.event.payload.endpoints ||= [];
        opts ||= {};
        // construct the proper structure expected for the endpoint
        const endpoint = {
            endpointId: Utils.defaultIfNullOrEmpty(opts.endpointId, 'dummy-endpoint-001'),
            manufacturerName: Utils.defaultIfNullOrEmpty(opts.manufacturerName, 'ioBroker Group'),
            description: Utils.defaultIfNullOrEmpty(opts.description, 'Device controlled by ioBroker'),
            friendlyName: Utils.defaultIfNullOrEmpty(opts.friendlyName, 'ioBroker Stub Endpoint'),
            displayCategories: Utils.defaultIfNullOrEmpty(opts.displayCategories, ['OTHER']),
            capabilities: AlexaResponse.alexaCapability().concat(Utils.defaultIfNullOrEmpty(opts.capabilities, [])),
            cookie: undefined,
        };
        if (Object.prototype.hasOwnProperty.call(opts, 'cookie')) {
            endpoint.cookie = Utils.defaultIfNullOrEmpty(opts.cookie, {});
        }
        this.event.payload.endpoints.push(endpoint);
    }
    /**
     * Creates a capability for an endpoint within the payload.
     *
     * @param opts Contains options for the endpoint capability.
     */
    asEndpointCapability(opts) {
        opts ||= {};
        const response = {
            type: Utils.defaultIfNullOrEmpty(opts.type, 'AlexaInterface'),
            interface: Utils.defaultIfNullOrEmpty(opts.interface, 'Alexa'),
            version: Utils.defaultIfNullOrEmpty(opts.version, '3'),
            properties: Utils.defaultIfNullOrEmpty(opts.properties, {}),
            // not all capabilities have the following ones
            instance: Utils.defaultIfNullOrEmpty(opts.instance, undefined),
            configuration: Utils.defaultIfNullOrEmpty(opts.configuration, undefined),
            semantics: Utils.defaultIfNullOrEmpty(opts.semantics, undefined),
            capabilityResources: Utils.defaultIfNullOrEmpty(opts.capabilityResources, undefined),
        };
        if (!response.instance) {
            delete response.instance;
        }
        if (!response.configuration) {
            delete response.configuration;
        }
        if (!response.semantics) {
            delete response.semantics;
        }
        if (!response.capabilityResources) {
            delete response.capabilityResources;
        }
        return response;
    }
    /**
     * Get the composed Alexa Response.
     */
    get() {
        return this;
    }
}
exports.default = AlexaResponse;
//# sourceMappingURL=AlexaResponse.js.map