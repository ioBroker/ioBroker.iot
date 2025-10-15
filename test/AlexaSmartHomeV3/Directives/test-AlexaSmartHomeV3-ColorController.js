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
let color;

describe('AlexaSmartHomeV3 - ColorController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => (stateChange = event);

        color = helpers.rgbSingleControl();

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName,
                displayCategories: ['LIGHT'],
                controls: [color],
            }),
        );
    });

    describe('Matching', async function () {
        it('ColorController SetColor', async function () {
            const event = await helpers.getSample(
                'ColorController/ColorController.SetColor.request.json',
            );
            assert.equal(color.supports(event), true);
        });
        it('ColorController TurnOff', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            assert.equal(color.supports(event), true);
        });
        it('ColorController TurnOn', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            assert.equal(color.supports(event), true);
        });
        it('ColorController AdjustBrightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.AdjustBrightness.request.json',
            );
            assert.equal(color.supports(event), true);
        });
        it('ColorController SetBrightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            assert.equal(color.supports(event), true);
        });
        it('ColorController SetColorTemperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.SetColorTemperature.request.json',
            );
            assert.equal(color.supports(event), true);
        });
        it('ColorController IncreaseColorTemperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.IncreaseColorTemperature.request.json',
            );
            assert.equal(color.supports(event), true);
        });
        it('ColorController DecreaseColorTemperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.DecreaseColorTemperature.request.json',
            );
            assert.equal(color.supports(event), true);
        });
    });

    describe('Handling', async function () {
        beforeEach(function () {
            helpers.resetCurrentValues(deviceManager);
        });

        it('ColorController SetColor', async function () {
            const event = await helpers.getSample(
                'ColorController/ColorController.SetColor.request.json',
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'color', 'Properties Name!');
            assert.equal(response.context.properties[0].value.hue, 351, 'Value.hue!');
            assert.equal(response.context.properties[0].value.saturation, 0.71, 'Value.saturation!');
            assert.equal(response.context.properties[0].value.brightness, 0.65, 'Value.brightness!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });
        it('ColorController TurnOff', async function () {
            const event = await helpers.getSample(
                'PowerController/PowerController.TurnOff.request.json',
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
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
    });
});
