const assert = require('assert')
const helpers = require('./helpers')
const Device = require('../lib/AlexaSmartHomeV3/Device')
const DeviceManager = require('../lib/AlexaSmartHomeV3/DeviceManager')
const AdapterProvider = require('../lib/AlexaSmartHomeV3/Helpers/AdapterProvider')

AdapterProvider.init(helpers.adapterMock());
const dimmer = helpers.dimmerControl()
const light = helpers.lightControl()
const endpointId = 'endpoint-001'
const friendlyName = 'some-friendly-name'

describe('AlexaSmartHomeV3 - Controls', function () {

    before(function () {
        lightDeviceManager = new DeviceManager();
        lightDeviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [light]
        }));

        dimmerDeviceManager = new DeviceManager();
        dimmerDeviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [dimmer]
        }));

    });

    after(function () {
    });

    describe('Light', async function () {
        it('Light reports state', async function () {

            const event = await helpers.getSample('StateReport/ReportState.json')
            const response = await lightDeviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController");
            assert.equal(response.context.properties[0].name, "powerState");
            assert.equal(response.context.properties[0].value, "ON");
        })
    })

    describe('Dimmer', async function () {
        it('Dimmer respects values range on setting brightness', async function () {

            const event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            const d = dimmerDeviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)
            const response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            // (1000 - 500) * 0,75 + 500 = 875
            assert.equal(d.controls[0].supported[1].stateProxy.currentValue, 875);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('Dimmer reports state', async function () {

            const event = await helpers.getSample('StateReport/ReportState.json')
            const response = await dimmerDeviceManager.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController");
            assert.equal(response.context.properties[0].name, "powerState");
            assert.equal(response.context.properties[0].value, "ON");

            assert.equal(response.context.properties[1].namespace, "Alexa.BrightnessController");
            assert.equal(response.context.properties[1].name, "brightness");
            assert.equal(response.context.properties[1].value, 75);
        })
    })
})