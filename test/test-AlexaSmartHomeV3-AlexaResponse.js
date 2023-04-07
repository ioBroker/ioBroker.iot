const assert = require('assert');
const AlexaResponse = require('../lib/AlexaSmartHomeV3/Alexa/AlexaResponse')

describe('AlexaSmartHomeV3 - AlexaResponse', function () {

    before(function () {

    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Error response', async function () {

        it('Generic error recognized as error response', async function () {
            let errorResponse = AlexaResponse.errorResponse()
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true)
        })

        it('Endpoint unreachable error recognized as error response', async function () {
            let errorResponse = AlexaResponse.endpointUnreachable()
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true)
        })

        it('Directive not supported error recognized as error response', async function () {
            let errorResponse = AlexaResponse.directiveNotSupported()
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true)
        })

        it('Non existing endpoint error recognized as error response', async function () {
            let errorResponse = AlexaResponse.nonExistingEndpoint()
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true)
        })
    })

    describe('TestResponse', function () {

        it('Test Response instantiation with defaults', function () {
            let response = new AlexaResponse();

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Name!");
        });

        it('Test ErrorResponse instantiation', function () {
            let response = new AlexaResponse({ "namespace": "Alexa", "name": "ErrorResponse" });
            response.event.payload = { "type": "INVALID_SOMETHING", "message": "ERROR_MESSAGE" };

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "ErrorResponse", "Name!");
            assert.equal(response.event.payload.type, "INVALID_SOMETHING", "Type!");
            assert.equal(response.event.payload.message, "ERROR_MESSAGE", "Message!");
        });

        it('Test Discover.Response instantiation', function () {
            let response = new AlexaResponse({ "namespace": "Alexa.Discovery", "name": "Discover.Response" });
            response.addPayloadEndpoint();
            let powerControllerCapability = response.asEndpointCapability({ "interface": "Alexa.PowerController", "supported": [{ "name": "powerState" }] });
            response.addPayloadEndpoint({ "endpointId": "switch_sample", "capabilities": [powerControllerCapability] });

            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, "Dummy Endpoint", "Friendly Name!");
            assert.equal(response.event.payload.endpoints[1].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[1].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[1].capabilities[1].interface, "Alexa.PowerController");
        });

        it('Test full instantiation', function () {
            let opts = {
                "context": {
                    "properties": [{
                        "namespace": "Alexa.ThermostatController",
                        "name": "targetSetpoint",
                        "value": {
                            "value": 25,
                            "scale": "CELSIUS"
                        },
                        "timeOfSample": "2017-02-03T16:20:50.52Z",
                        "uncertaintyInMilliseconds": 500
                    },
                    {
                        "namespace": "Alexa.ThermostatController",
                        "name": "thermostatMode",
                        "value": "HEAT",
                        "timeOfSample": "2017-02-03T16:20:50.52Z",
                        "uncertaintyInMilliseconds": 500
                    }
                    ]
                },
                "event": {
                    "header": {
                        "namespace": "Alexa",
                        "name": "Response",
                        "payloadVersion": "3",
                        "messageId": "5f8a426e-01e4-4cc9-8b79-65f8bd0fd8a4",
                        "correlationToken": "dFMb0z+PgpgdDmluhJ1LddFvSqZ/jCc8ptlAKulUj90jSqg=="
                    },
                    "endpoint": {
                        "endpointId": "appliance-001"
                    },
                    "payload": {}
                }
            };
            let response = new AlexaResponse(opts);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.messageId, "5f8a426e-01e4-4cc9-8b79-65f8bd0fd8a4", "Message ID!");
            assert.equal(response.context.properties[0].namespace, "Alexa.ThermostatController", "Property Namespace!");
            assert.equal(response.context.properties[0].name, "targetSetpoint", "Property Name!");
            assert.equal(response.context.properties[1].name, "thermostatMode", "Property Name!");
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 500);
        })

    });
})