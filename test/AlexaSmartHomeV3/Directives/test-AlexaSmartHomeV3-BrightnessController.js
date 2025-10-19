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

describe('AlexaSmartHomeV3 - BrightnessController', function () {
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
        it('BrightnessController AdjustBrightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.AdjustBrightness.request.json',
            );
            assert.equal(light.supports(event), false);
            assert.equal(dimmer.supports(event), true);
        });
        it('BrightnessController SetBrightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            assert.equal(light.supports(event), false);
            assert.equal(dimmer.supports(event), true);
        });
    });

    describe('Handling', async function () {
        beforeEach(function () {
            helpers.resetCurrentValues(deviceManager);
        });

        it('BrightnessController AdjustBrightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.AdjustBrightness.request.json',
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 50, 'Value!');
            assert.equal(response.context.properties.length, 1, 'Properties Length!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('BrightnessController SetBrightness for a light', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 75, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            // assert.equal(
            //     deviceManager.endpointById(endpointId).controls[0].enforced[0].properties[0].currentValue,
            //     true,
            // );
        });
    });
});
