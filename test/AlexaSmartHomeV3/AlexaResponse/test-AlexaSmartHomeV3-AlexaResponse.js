const assert = require('assert');
const helpers = require('../helpers');
const AlexaResponse = require('../../../build/lib/AlexaSmartHomeV3/Alexa/AlexaResponse').default;

describe('AlexaSmartHomeV3 - AlexaResponse', function () {
    describe('Error response', async function () {
        it('Generic error recognized as error response', async function () {
            let errorResponse = AlexaResponse.errorResponse();
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true);
        });

        it('Endpoint unreachable error recognized as error response', async function () {
            let errorResponse = AlexaResponse.endpointUnreachable();
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true);
        });

        it('Directive not supported error recognized as error response', async function () {
            let errorResponse = AlexaResponse.directiveNotSupportedByControl();
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true);
        });

        it('Non existing endpoint error recognized as error response', async function () {
            let errorResponse = AlexaResponse.nonExistingEndpoint();
            assert.equal(AlexaResponse.isErrorResponse(errorResponse), true);
        });
    });

    // Without the correlationToken and the endpoint of the directive Alexa counts an error as
    // INVALID_SKILL_RESPONSE_EXCEPTION (AES case 19232822931)
    describe('Error response answers its directive', async function () {
        it('Error response carries correlationToken, message ID and endpoint of the directive', async function () {
            const event = await helpers.getSample('ReportState.json');
            const response = AlexaResponse.endpointUnreachable(event).get();

            assert.equal(response.event.header.name, 'ErrorResponse');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken);
            // the cloud finds the waiting request by it, and replaces it before the answer goes to Alexa
            assert.equal(response.event.header.messageId, event.directive.header.messageId);
            assert.equal(response.event.endpoint.endpointId, 'endpoint-001');
            assert.equal(response.event.endpoint.scope.token, event.directive.endpoint.scope.token);
            assert.equal(response.event.payload.type, 'ENDPOINT_UNREACHABLE');
        });

        it('Error response to a discovery has no endpoint', async function () {
            const event = await helpers.getSample('Discovery.request.json');
            const response = AlexaResponse.endpointUnreachable(event).get();

            assert.equal(response.event.header.name, 'ErrorResponse');
            assert.equal(response.event.endpoint, undefined);
        });

        it('A device that is gone is reported as NO_SUCH_ENDPOINT', async function () {
            const event = await helpers.getSample('ReportState.json');
            const response = AlexaResponse.nonExistingEndpoint(event).get();

            assert.equal(response.event.payload.type, 'NO_SUCH_ENDPOINT');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken);
            assert.equal(response.event.endpoint.endpointId, 'endpoint-001');
        });

        it('The own rate limit is reported as RATE_LIMIT_EXCEEDED, which Alexa knows', async function () {
            const event = await helpers.getSample('ReportState.json');
            const response = AlexaResponse.throttlingException(event).get();

            assert.equal(response.event.payload.type, 'RATE_LIMIT_EXCEEDED');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken);
        });

        it('A directive not supported by a control names the namespace and keeps the correlationToken', async function () {
            const event = await helpers.getSample('ReportState.json');
            const response = AlexaResponse.directiveNotSupportedByControl('Dimmer', event).get();

            assert.equal(response.event.payload.type, 'INTERNAL_ERROR');
            assert.equal(response.event.payload.message, `Control Dimmer doesn't support the Alexa with payloadVersion 3`);
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken);
        });

        it('A failed handling is reported as INTERNAL_ERROR with the message ID of the directive', async function () {
            const event = await helpers.getSample('ReportState.json');
            const response = AlexaResponse.internalError(event, 'Cannot process Alexa.ReportState').get();

            assert.equal(response.event.payload.type, 'INTERNAL_ERROR');
            assert.equal(response.event.payload.message, 'Cannot process Alexa.ReportState');
            assert.equal(response.event.header.messageId, event.directive.header.messageId);
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken);
            assert.equal(response.event.endpoint.endpointId, 'endpoint-001');
        });
    });

    describe('TestResponse', function () {
        it('Test Response instantiation with defaults', function () {
            let response = new AlexaResponse();

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Name!');
        });

        it('Test ErrorResponse instantiation', function () {
            let response = new AlexaResponse({ namespace: 'Alexa', name: 'ErrorResponse' });
            response.event.payload = { type: 'INVALID_SOMETHING', message: 'ERROR_MESSAGE' };

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ErrorResponse', 'Name!');
            assert.equal(response.event.payload.type, 'INVALID_SOMETHING', 'Type!');
            assert.equal(response.event.payload.message, 'ERROR_MESSAGE', 'Message!');
        });

        it('Test Discover.Response instantiation', function () {
            let response = new AlexaResponse({ namespace: 'Alexa.Discovery', name: 'Discover.Response' });
            response.addPayloadEndpoint();
            let powerControllerCapability = response.asEndpointCapability({
                interface: 'Alexa.PowerController',
                supported: [{ name: 'powerState' }],
            });
            response.addPayloadEndpoint({ endpointId: 'switch_sample', capabilities: [powerControllerCapability] });

            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, 'ioBroker Stub Endpoint', 'Friendly Name!');
            assert.equal(response.event.payload.endpoints[1].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[1].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[1].capabilities[1].interface, 'Alexa.PowerController');
        });

        it('Test full instantiation', function () {
            let opts = {
                context: {
                    properties: [
                        {
                            namespace: 'Alexa.ThermostatController',
                            name: 'targetSetpoint',
                            value: {
                                value: 25,
                                scale: 'CELSIUS',
                            },
                            timeOfSample: '2017-02-03T16:20:50.52Z',
                            uncertaintyInMilliseconds: 500,
                        },
                        {
                            namespace: 'Alexa.ThermostatController',
                            name: 'thermostatMode',
                            value: 'HEAT',
                            timeOfSample: '2017-02-03T16:20:50.52Z',
                            uncertaintyInMilliseconds: 500,
                        },
                    ],
                },
                event: {
                    header: {
                        namespace: 'Alexa',
                        name: 'Response',
                        payloadVersion: '3',
                        messageId: '5f8a426e-01e4-4cc9-8b79-65f8bd0fd8a4',
                        correlationToken: 'dFMb0z+PgpgdDmluhJ1LddFvSqZ/jCc8ptlAKulUj90jSqg==',
                    },
                    endpoint: {
                        endpointId: 'appliance-001',
                    },
                    payload: {},
                },
            };
            let response = new AlexaResponse(opts);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.messageId, '5f8a426e-01e4-4cc9-8b79-65f8bd0fd8a4', 'Message ID!');
            assert.equal(response.context.properties[0].namespace, 'Alexa.ThermostatController', 'Property Namespace!');
            assert.equal(response.context.properties[0].name, 'targetSetpoint', 'Property Name!');
            assert.equal(response.context.properties[1].name, 'thermostatMode', 'Property Name!');
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 500);
        });
    });
});
