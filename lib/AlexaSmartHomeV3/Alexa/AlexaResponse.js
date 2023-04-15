'use strict';

const { v4: uuidv4 } = require('uuid');
const Utils = require('../Helpers/Utils');


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
            this.context = Utils.defaultIfNullOrEmpty(opts.context, undefined);
        }

        if (opts.event !== undefined) {
            this.event = Utils.defaultIfNullOrEmpty(opts.event, undefined);
        }
        else {
            this.event = {
                header: {
                    namespace: Utils.defaultIfNullOrEmpty(opts.namespace, "Alexa"),
                    name: Utils.defaultIfNullOrEmpty(opts.name, "Response"),
                    messageId: Utils.defaultIfNullOrEmpty(opts.messageId, uuidv4()),
                    correlationToken: Utils.defaultIfNullOrEmpty(opts.correlationToken, undefined),
                    payloadVersion: Utils.defaultIfNullOrEmpty(opts.payloadVersion, "3")
                },
                endpoint: {
                    scope: {
                        type: "BearerToken",
                        token: Utils.defaultIfNullOrEmpty(opts.token, "INVALID"),
                    },
                    endpointId: Utils.defaultIfNullOrEmpty(opts.endpointId, "INVALID")
                },
                payload: Utils.defaultIfNullOrEmpty(opts.payload, {})
            };

            if (opts.changeCauseType) {
                this.event.payload.change = {
                    cause: {
                        type: opts.changeCauseType
                    },
                    properties: []
                }
            }
        }

        // No endpoint in an AcceptGrant or Discover request
        if (this.event.header.name === "AcceptGrant.Response" || this.event.header.name === "Discover.Response") {
            delete this.event.endpoint;
        }

    }

    addContext() {
        if (this.context === undefined) {
            this.context = { properties: [] };
        }
    }

    /**
     * Add a property to the context.
     * @param opts Contains options for the property.
     */
    addContextProperty(opts) {
        this.addContext();

        this.context.properties.push({
            namespace: Utils.defaultIfNullOrEmpty(opts.namespace, "Alexa.EndpointHealth"),
            name: Utils.defaultIfNullOrEmpty(opts.name, "connectivity"),
            value: Utils.defaultIfNullOrEmpty(opts.value, { "value": "OK" }),
            timeOfSample: Utils.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Utils.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0)
        });
    }

    /**
     * Add a property to the payload.
     * @param opts Contains options for the property.
     */
    addPayloadChangeProperty(opts) {

        if (opts === undefined) opts = {};

        this.event.payload.change.properties.push({
            namespace: Utils.defaultIfNullOrEmpty(opts.namespace, "Alexa.EndpointHealth"),
            name: Utils.defaultIfNullOrEmpty(opts.name, "connectivity"),
            value: Utils.defaultIfNullOrEmpty(opts.value, { "value": "OK" }),
            timeOfSample: Utils.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Utils.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0)
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
            endpointId: Utils.defaultIfNullOrEmpty(opts.endpointId, 'dummy-endpoint-001'),
            manufacturerName: Utils.defaultIfNullOrEmpty(opts.manufacturerName, "ioBroker group"),
            description: Utils.defaultIfNullOrEmpty(opts.description, "device controlled by iobroker"),
            friendlyName: Utils.defaultIfNullOrEmpty(opts.friendlyName, "Dummy Endpoint"),
            displayCategories: Utils.defaultIfNullOrEmpty(opts.displayCategories, ["OTHER"]),
            capabilities: this.alexaCapability().concat(Utils.defaultIfNullOrEmpty(opts.capabilities, [])),
        };

        if (opts.hasOwnProperty("cookie")) {
            endpoint.cookie = Utils.defaultIfNullOrEmpty('cookie', {});
        }

        this.event.payload.endpoints.push(endpoint);
    }

    /**
     * Creates a capability for an endpoint within the payload.
     * @param opts Contains options for the endpoint capability.
     */
    asEndpointCapability(opts) {

        if (opts === undefined) opts = {};

        let response = {
            type: Utils.defaultIfNullOrEmpty(opts.type, "AlexaInterface"),
            interface: Utils.defaultIfNullOrEmpty(opts.interface, "Alexa"),
            version: Utils.defaultIfNullOrEmpty(opts.version, "3"),
            properties: Utils.defaultIfNullOrEmpty(opts.properties, {}),
            configuration: Utils.defaultIfNullOrEmpty(opts.configuration, {})
        };

        if (!opts.hasOwnProperty('configuration')) {
            delete response.configuration;
        }

        return response;
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