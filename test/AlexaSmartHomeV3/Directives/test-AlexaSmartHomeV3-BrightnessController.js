const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');

describe('AlexaSmartHomeV3 - BrightnessController', function () {
    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'

        AdapterProvider.init(helpers.adapterMock());

        light = helpers.lightControl()
        dimmer = helpers.dimmerControl()

        deviceManager = new DeviceManager()
        deviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [light, dimmer]
        }))
    });

    after(function () {
    });

    describe('Matching', async function () {
        it('BrightnessController AdjustBrightness', async function () {
            const event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            assert.equal(light.supports(event), false)
            assert.equal(light.canHandle(event), true)
            assert.equal(dimmer.supports(event), true)
        })
        it('BrightnessController SetBrightness', async function () {
            const event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            assert.equal(light.supports(event), false)
            assert.equal(light.canHandle(event), true)
            assert.equal(dimmer.supports(event), true)
        })
    })

    describe('Handling', async function () {

        beforeEach(function () {
            helpers.resetCurrentValues(deviceManager);
        });

        it('BrightnessController AdjustBrightness', async function () {
            const event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 50, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('BrightnessController SetBrightness for a light', async function () {
            const event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(deviceManager.endpointById(endpointId).controls[0].enforced[0].properties[0].stateProxy.currentValue, true);
        })

        it('BrightnessController SetBrightness for a light+dimmer', async function () {
            const event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })
    })
})