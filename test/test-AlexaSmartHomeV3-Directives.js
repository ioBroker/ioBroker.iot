const assert = require('assert');
const helpers = require('./helpers')
const DeviceManager = require('../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../lib/AlexaSmartHomeV3/Device')
const directives = require('../lib/AlexaSmartHomeV3/Directives')
const capabilities = require('../lib/AlexaSmartHomeV3/Capabilities')

let device;
let deviceManager = new DeviceManager()
const endpointId = 'endpoint-001'
const friendlyName = 'some-friendly-name'

describe('AlexaSmartHomeV3 - Directives', function () {

    before(function () {
        // runs before all tests in this file 
        device = new Device({
            id: endpointId,
            capabilities: [new capabilities['PowerController'], new capabilities['BrightnessController']],
            friendlyName: friendlyName,
            displayCategries: ['LIGHT']
        })
        deviceManager.addDevice(device)
    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Matching', async function () {
        // device manager directives
        it('Discovery', async function () {
            let event = await helpers.getSample('Discovery/Discovery.request.json')
            let directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof directives.Discovery, true)
        })

        // device directives
        it('PowerController TurnOff', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            let capability = device.matchDirective(event)
            assert.equal(capability instanceof capabilities.PowerController, true)
        })
        it('PowerController TurnOn', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            let capability = device.matchDirective(event)
            assert.equal(capability instanceof capabilities.PowerController, true)
        })
        it('BrightnessController AdjustBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            let capability = device.matchDirective(event)
            assert.equal(capability instanceof capabilities.BrightnessController, true)
        })
        it('BrightnessController SetBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            let capability = device.matchDirective(event)
            assert.equal(capability instanceof capabilities.BrightnessController, true)
        })
    })

    describe('Handling', async function () {
        // device manager directives
        it('Discovery', async function () {
            let event = await helpers.getSample('Discovery/Discovery.request.json')
            let directive = new directives.Discovery()
            let response = await directive.handle(event, deviceManager)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.PowerController");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, "Alexa.BrightnessController");
        })

        // device directives
        it('PowerController TurnOff', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            let d = deviceManager.deviceByEndpointId(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })
        it('PowerController TurnOn', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            let d = deviceManager.deviceByEndpointId(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('BrightnessController AdjustBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            let d = deviceManager.deviceByEndpointId(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('BrightnessController SetBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            let d = deviceManager.deviceByEndpointId(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
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