'use strict';

const { v4: uuidv4 } = require('uuid');
const DeviceUtils = require('./DeviceUtils');


/**
 * Helper class to generate an AlexaResponse.
 * @class
 */
class AlexaResponse {


    static errorResponse(payload) {
        return new AlexaResponse({
            name: "ErrorResponse",
            payload: payload
        })
    }

    /**
     * Constructor for an Alexa Response.
     * @constructor
     * @param opts Contains initialization options for the response
     */
    constructor(opts) {

        if (opts === undefined)
            opts = {};

        if (opts.context !== undefined)
            this.context = DeviceUtils.defaultIfNullOrEmpty(opts.context, undefined);

        if (opts.event !== undefined)
            this.event = DeviceUtils.defaultIfNullOrEmpty(opts.event, undefined);
        else
            this.event = {
                "header": {
                    "namespace": DeviceUtils.defaultIfNullOrEmpty(opts.namespace, "Alexa"),
                    "name": DeviceUtils.defaultIfNullOrEmpty(opts.name, "Response"),
                    "messageId": DeviceUtils.defaultIfNullOrEmpty(opts.messageId, uuidv4()),
                    "correlationToken": DeviceUtils.defaultIfNullOrEmpty(opts.correlationToken, undefined),
                    "payloadVersion": DeviceUtils.defaultIfNullOrEmpty(opts.payloadVersion, "3")
                },
                "endpoint": {
                    "scope": {
                        "type": "BearerToken",
                        "token": DeviceUtils.defaultIfNullOrEmpty(opts.token, "INVALID"),
                    },
                    "endpointId": DeviceUtils.defaultIfNullOrEmpty(opts.endpointId, "INVALID")
                },
                "payload": DeviceUtils.defaultIfNullOrEmpty(opts.payload, {})
            };

        // No endpoint in an AcceptGrant or Discover request
        if (this.event.header.name === "AcceptGrant.Response" || this.event.header.name === "Discover.Response")
            delete this.event.endpoint;

    }

    /**
     * Add a property to the context.
     * @param opts Contains options for the property.
     */
    addContextProperty(opts) {
        if (this.context === undefined)
            this.context = { properties: [] };

        this.context.properties.push({
            namespace: DeviceUtils.defaultIfNullOrEmpty(opts.namespace, "Alexa.EndpointHealth"),
            name: DeviceUtils.defaultIfNullOrEmpty(opts.name, "connectivity"),
            value: DeviceUtils.defaultIfNullOrEmpty(opts.value, { "value": "OK" }),
            timeOfSample: DeviceUtils.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: DeviceUtils.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0)
        });
    }

    /**
     * Adds an endpoint to the payload.
     * @param opts Contains options for the endpoint.
     */
    addPayloadEndpoint(opts) {

        if (this.event.payload.endpoints === undefined)
            this.event.payload.endpoints = [];

        if (opts === undefined) opts = {};

        // construct the proper structure expected for the endpoint
        let endpoint = {
            endpointId: DeviceUtils.defaultIfNullOrEmpty(opts.endpointId, 'dummy-endpoint-001'),
            manufacturerName: DeviceUtils.defaultIfNullOrEmpty(opts.manufacturerName, "ioBroker group"),
            description: DeviceUtils.defaultIfNullOrEmpty(opts.description, "Dummy Endpoint Description"),
            friendlyName: DeviceUtils.defaultIfNullOrEmpty(opts.friendlyName, "Dummy Endpoint"),
            displayCategories: DeviceUtils.defaultIfNullOrEmpty(opts.displayCategories, ["OTHER"]),
            capabilities: DeviceUtils.defaultIfNullOrEmpty(opts.capabilities, []),
        };

        if (opts.hasOwnProperty("cookie")) {
            endpoint.cookie = DeviceUtils.defaultIfNullOrEmpty('cookie', {});
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
            type: DeviceUtils.defaultIfNullOrEmpty(opts.type, "AlexaInterface"),
            interface: DeviceUtils.defaultIfNullOrEmpty(opts.interface, "Alexa"),
            version: DeviceUtils.defaultIfNullOrEmpty(opts.version, "3"),
            properties: DeviceUtils.defaultIfNullOrEmpty(opts.properties, {})
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