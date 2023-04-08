'use strict';

const { v4: uuidv4 } = require('uuid');
const Helpers = require('../Helpers/Utils');


/**
 * Helper class to generate an AlexaResponse.
 * @class
 */
class AlexaResponse {
    static ErrorResponseName = "ErrorResponse";
    static isErrorResponse(response) {
        return response?.event?.header?.name === AlexaResponse.ErrorResponseName;
    }

    static errorResponse(payload) {
        return new AlexaResponse({
            name: AlexaResponse.ErrorResponseName,
            payload: payload
        })
    }

    static endpointUnreachable() {
        return AlexaResponse.errorResponse({
            type: 'ENDPOINT_UNREACHABLE',
            message: "Unable to reach endpoint."
        });
    }

    static directiveNotSupported(controlName, namespace) {
        return AlexaResponse.errorResponse({
            type: 'INTERNAL_ERROR',
            message: `Control ${controlName} doesn't support the directive ${namespace}`
        });
    }

    static nonExistingEndpoint(endpointId) {
        return AlexaResponse.errorResponse({
            type: 'INTERNAL_ERROR',
            message: `No endpoint with id ${endpointId} found`
        });
    }

    /**
     * Composes Alexa respond on a successfully processed Alexa directive to change a capability's value of a device
     * @param {*} event 
     * @param {string} propertyName 
     * @param {*} value 
     * @returns 
     */
    static handled(event, propertyName, value) {
        const response = new AlexaResponse({
            correlationToken: event?.directive?.header?.correlationToken,
            token: event?.directive?.endpoint?.scope?.token,
            endpointId: event?.directive?.endpoint?.endpointId
        });
        response.addContextProperty({
            namespace: event?.directive?.header?.namespace,
            name: propertyName,
            value: value
        });

        return response;
    }


    /**
     * Constructor for an Alexa Response.
     * @constructor
     * @param opts Contains initialization options for the response
     */
    constructor(opts) {

        if (opts === undefined)
            opts = {};

        if (opts.context !== undefined) {
            this.context = Helpers.defaultIfNullOrEmpty(opts.context, undefined);
        }

        if (opts.event !== undefined) {
            this.event = Helpers.defaultIfNullOrEmpty(opts.event, undefined);
        }
        else {
            this.event = {
                header: {
                    namespace: Helpers.defaultIfNullOrEmpty(opts.namespace, "Alexa"),
                    name: Helpers.defaultIfNullOrEmpty(opts.name, "Response"),
                    messageId: Helpers.defaultIfNullOrEmpty(opts.messageId, uuidv4()),
                    correlationToken: Helpers.defaultIfNullOrEmpty(opts.correlationToken, undefined),
                    payloadVersion: Helpers.defaultIfNullOrEmpty(opts.payloadVersion, "3")
                },
                endpoint: {
                    scope: {
                        type: "BearerToken",
                        token: Helpers.defaultIfNullOrEmpty(opts.token, "INVALID"),
                    },
                    endpointId: Helpers.defaultIfNullOrEmpty(opts.endpointId, "INVALID")
                },
                payload: Helpers.defaultIfNullOrEmpty(opts.payload, {})
            };
        }

        // No endpoint in an AcceptGrant or Discover request
        if (this.event.header.name === "AcceptGrant.Response" || this.event.header.name === "Discover.Response") {
            delete this.event.endpoint;
        }

    }

    /**
     * Add a property to the context.
     * @param opts Contains options for the property.
     */
    addContextProperty(opts) {
        if (this.context === undefined)
            this.context = { properties: [] };

        this.context.properties.push({
            namespace: Helpers.defaultIfNullOrEmpty(opts.namespace, "Alexa.EndpointHealth"),
            name: Helpers.defaultIfNullOrEmpty(opts.name, "connectivity"),
            value: Helpers.defaultIfNullOrEmpty(opts.value, { "value": "OK" }),
            timeOfSample: Helpers.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Helpers.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0)
        });
    }

    /**
     * Add a property to the payload.
     * @param opts Contains options for the property.
     */
    addPayloadProperty(opts) {
        if (this.payload === undefined) {
            this.payload = {
                change: {
                    cause: {
                        type: Helpers.defaultIfNullOrEmpty(opts.changeCauseType, "PHYSICAL_INTERACTION")
                    },
                    properties: []
                }
            }
        }

        if (opts === undefined) opts = {};

        this.payload.properties.push({
            namespace: Helpers.defaultIfNullOrEmpty(opts.namespace, "Alexa.EndpointHealth"),
            name: Helpers.defaultIfNullOrEmpty(opts.name, "connectivity"),
            value: Helpers.defaultIfNullOrEmpty(opts.value, { "value": "OK" }),
            timeOfSample: Helpers.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Helpers.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0)
        });
    }

    alexaCapability() {
        return [{
            type: "AlexaInterface",
            interface: "Alexa",
            version: "3"
        }]
    }

    /**
     * Adds an endpoint to the payload.
     * @param opts Contains options for the endpoint.
     */
    addPayloadEndpoint(opts) {

        if (this.event.payload.endpoints === undefined) {
            this.event.payload.endpoints = [];
        }

        if (opts === undefined) opts = {};

        // construct the proper structure expected for the endpoint
        let endpoint = {
            endpointId: Helpers.defaultIfNullOrEmpty(opts.endpointId, 'dummy-endpoint-001'),
            manufacturerName: Helpers.defaultIfNullOrEmpty(opts.manufacturerName, "ioBroker group"),
            description: Helpers.defaultIfNullOrEmpty(opts.description, "Dummy Endpoint Description"),
            friendlyName: Helpers.defaultIfNullOrEmpty(opts.friendlyName, "Dummy Endpoint"),
            displayCategories: Helpers.defaultIfNullOrEmpty(opts.displayCategories, ["OTHER"]),
            capabilities: this.alexaCapability().concat(Helpers.defaultIfNullOrEmpty(opts.capabilities, [])),
        };

        if (opts.hasOwnProperty("cookie")) {
            endpoint.cookie = Helpers.defaultIfNullOrEmpty('cookie', {});
        }

        this.event.payload.endpoints.push(endpoint);
    }

    /**
     * Creates a capability for an endpoint within the payload.
     * @param opts Contains options for the endpoint capability.
     */
    asEndpointCapability(opts) {

        if (opts === undefined) opts = {};

        let capability = {
            type: Helpers.defaultIfNullOrEmpty(opts.type, "AlexaInterface"),
            interface: Helpers.defaultIfNullOrEmpty(opts.interface, "Alexa"),
            version: Helpers.defaultIfNullOrEmpty(opts.version, "3"),
            properties: Helpers.defaultIfNullOrEmpty(opts.properties, {})
        };
        return capability
    }

    /**
     * Get the composed Alexa Response.
     * @returns {AlexaResponse}
     */
    get() {
        return this;
    }
}

module.exports = AlexaResponse;