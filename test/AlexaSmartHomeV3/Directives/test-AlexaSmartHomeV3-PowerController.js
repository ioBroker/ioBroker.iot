const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;
const IotProxy = require('../../../build/lib/AlexaSmartHomeV3/Helpers/IotProxy').default;
const RateLimiter = require('../../../build/lib/AlexaSmartHomeV3/Helpers/RateLimiter').default;

let stateChange;
let endpointId;
let friendlyName;
let deviceManager;
let dimmer;
let light;
let lightDevice;
let dimmerDevice;

describe('AlexaSmartHomeV3 - PowerController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => (stateChange = event);

        light = helpers.lightControl();
        dimmer = helpers.dimmerControl();

        lightDevice = new Device({
            id: 'endpoint-002',
            friendlyName,
            displayCategories: ['LIGHT'],
            controls: [light],
        });

        dimmerDevice = new Device({
            id: 'endpoint-003',
            friendlyName,
            displayCategories: ['LIGHT'],
            controls: [dimmer],
        });

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName,
                displayCategories: ['LIGHT'],
                controls: [light, dimmer],
            }),
        );
    });

    describe('Matching', async function () {
        // device directives
        it('PowerController TurnOff', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            assert.equal(light.supports(event), true);
            assert.equal(dimmer.supports(event), true);
        });
        it('PowerController TurnOn', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            assert.equal(light.supports(event), true);
            assert.equal(dimmer.supports(event), true);
        });
    });

    describe('Handling', async function () {
        it('PowerController TurnOff for a light', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            const response = await lightDevice.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(lightDevice.controls[0].supported[0].properties[0].currentValue, false);
        });

        it('PowerController TurnOff for a dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            const response = await dimmerDevice.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(dimmerDevice.controls[0].supported[0].properties[0].currentValue, 0);
        });

        it('PowerController TurnOff for a light+dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('PowerController TurnOn Light', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            const response = await lightDevice.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(lightDevice.controls[0].supported[0].properties[0].currentValue, true);
        });

        it('PowerController TurnOn for a dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            const response = await dimmerDevice.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(dimmerDevice.controls[0].supported[0].properties[0].currentValue, true);
            assert.equal(dimmerDevice.controls[0].supported[1].properties[0].currentValue, 80);
        });

        it('PowerController TurnOn for a light+dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });
    });
});
