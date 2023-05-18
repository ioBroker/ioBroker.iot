const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');
const IotProxy = require('../../../lib/AlexaSmartHomeV3/Helpers/IotProxy');
const RateLimiter = require('../../../lib/AlexaSmartHomeV3/Helpers/RateLimiter');


describe('AlexaSmartHomeV3 - PowerController', function () {

    beforeEach(function () {
        RateLimiter.usage = new Map();
    })

    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => stateChange = event;

        light = helpers.lightControl()
        dimmer = helpers.dimmerControl()

        light_device = new Device({
            id: 'endpoint-002',
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [light]
        })

        dimmer_device = new Device({
            id: 'endpoint-003',
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [dimmer]
        })

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
        // device directives
        it('PowerController TurnOff', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            assert.equal(light.supports(event), true)
            assert.equal(dimmer.supports(event), true)
        })
        it('PowerController TurnOn', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            assert.equal(light.supports(event), true)
            assert.equal(dimmer.supports(event), true)
        })
    })

    describe('Handling', async function () {
        it('PowerController TurnOff for a light', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            const response = await light_device.handle(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(light_device.controls[0].supported[0].properties[0].currentValue, false);
        })

        it('PowerController TurnOff for a dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            const response = await dimmer_device.handle(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(dimmer_device.controls[0].supported[0].properties[0].currentValue, 0);
        })

        it('PowerController TurnOff for a light+dimmer', async function () {
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
            assert.equal(light_device.controls[0].supported[0].properties[0].currentValue, true);

        })

        it('PowerController TurnOn for a dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            const response = await dimmer_device.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(dimmer_device.controls[0].supported[0].properties[0].currentValue, 80);

        })

        it('PowerController TurnOn for a light+dimmer', async function () {
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
    })
})