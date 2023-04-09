const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const Directives = require('../../../lib/AlexaSmartHomeV3/Alexa/Directives')
const Capabilities = require('../../../lib/AlexaSmartHomeV3/Alexa/Capabilities')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');


describe('AlexaSmartHomeV3 - ChangeReport', function () {
    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'

        AdapterProvider.init(helpers.adapterMock());
        dimmer = helpers.dimmerControl()

        deviceManager = new DeviceManager()
        deviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [dimmer]
        }))
    });

    after(function () {
    });

    describe('Matching', async function () {
        it('ChangeReport', async function () {
            const event = Directives.ChangeReport.get(endpointId, Capabilities.PowerController.propertyName, true)
            const directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.ChangeReport, true)
        })
    })

    describe('Handling', async function () {
        it('ChangeReport for a dimmer', async function () {
            const event = Directives.ChangeReport.get(endpointId, Capabilities.PowerController.propertyName, true)
            const response = await deviceManager.handleAlexaEvent(event)
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
    })
})