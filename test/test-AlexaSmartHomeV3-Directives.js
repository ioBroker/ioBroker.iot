const assert = require('assert');
const helpers = require('./helpers')
const DeviceManager = require('../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../lib/AlexaSmartHomeV3/Device')
const Directives = require('../lib/AlexaSmartHomeV3/Alexa/Directives')
const Capabilities = require('../lib/AlexaSmartHomeV3/Alexa/Capabilities')
const AdapterProvider = require('../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');

AdapterProvider.init(helpers.adapterMock());


const light = helpers.lightControl()
const dimmer = helpers.dimmerControl()

const deviceManager = new DeviceManager()
const endpointId = 'endpoint-001'
const friendlyName = 'some-friendly-name'

describe('AlexaSmartHomeV3 - Directives', function () {
    before(function () {
        light_device = new Device({
            id: '111',
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [light]
        })

        dimmer_device = new Device({
            id: '222',
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [dimmer]
        })

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
        // device manager directives
        it('Discovery', async function () {
            let event = await helpers.getSample('Discovery/Discovery.request.json')
            let directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.Discovery, true)
        })

        it('ReportState', async function () {
            let event = await helpers.getSample('StateReport/ReportState.json')
            let directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.ReportState, true)
        })

        it('ChangeReport', async function () {
            let event = Directives.ChangeReport.get(endpointId, Capabilities.PowerController.propertyName, true)
            let directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.ChangeReport, true)
        })

        // device directives
        it('PowerController TurnOff', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            assert.equal(light.supports(event), true)
            assert.equal(dimmer.supports(event), true)
        })
        it('PowerController TurnOn', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            assert.equal(light.supports(event), true)
            assert.equal(dimmer.supports(event), true)
        })

        it('BrightnessController AdjustBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            assert.equal(light.supports(event), false)
            assert.equal(light.canHandle(event), true)
            assert.equal(dimmer.supports(event), true)
        })
        it('BrightnessController SetBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            assert.equal(light.supports(event), false)
            assert.equal(light.canHandle(event), true)
            assert.equal(dimmer.supports(event), true)
        })
    })

    describe('Handling', async function () {
        // device manager directives
        it('Discovery of dimmable Light', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json')

            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 3);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.PowerController");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, "Alexa.BrightnessController");
        })

        it('Discovery of Light', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json')
            const deviceManagerWithLightOnly = new DeviceManager();
            deviceManagerWithLightOnly.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [light]
            }));
            const response = await deviceManagerWithLightOnly.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.PowerController");
        })

        it('ChangeReport of Dimmer', async function () {
            const event = Directives.ChangeReport.get(endpointId, Capabilities.PowerController.propertyName, true)
            const deviceManagerWithDimmerOnly = new DeviceManager();
            deviceManagerWithDimmerOnly.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [dimmer]
            }));

            const response = await deviceManagerWithDimmerOnly.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "ChangeReport", "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            // changed properties
            assert.equal(response.event.payload.change.cause.type, "PHYSICAL_INTERACTION");
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, "Alexa.PowerController");
            assert.equal(response.event.payload.change.properties[0].name, "powerState");
            assert.equal(response.event.payload.change.properties[0].value, "ON");
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);

            // unchanged properties
            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController");
            assert.equal(response.context.properties[0].name, "brightness");
            assert.equal(response.context.properties[0].value, 75);
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);
        })


        // device directives
        it('PowerController TurnOff Light', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            const response = await light_device.handle(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(light_device.controls[0].supported[0].stateProxy.currentValue, false);
        })

        it('PowerController TurnOff Dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            const response = await dimmer_device.handle(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(dimmer_device.controls[0].supported[0].stateProxy.currentValue, 0);
        })

        it('PowerController TurnOff Light+Dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('PowerController TurnOn Light', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            const response = await light_device.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(light_device.controls[0].supported[0].stateProxy.currentValue, true);

        })

        it('PowerController TurnOn Dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            const response = await dimmer_device.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(dimmer_device.controls[0].supported[0].stateProxy.currentValue, 80);

        })

        it('PowerController TurnOn Light+Dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('BrightnessController AdjustBrightness', async function () {
            const event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('BrightnessController SetBrightness Light', async function () {
            const event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            const response = await light_device.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(light_device.controls[0].enforced[0].stateProxy.currentValue, true);
        })

        it('BrightnessController SetBrightness Light+Dimmer', async function () {
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