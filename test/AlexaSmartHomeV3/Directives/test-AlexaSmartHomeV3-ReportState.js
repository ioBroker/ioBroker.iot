const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const Directives = require('../../../lib/AlexaSmartHomeV3/Alexa/Directives')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');


describe('AlexaSmartHomeV3 - ReportState', function () {
    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'
        AdapterProvider.init(helpers.adapterMock());
    });

    after(function () {
    });

    describe('Matching', async function () {
        it('ReportState', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json')

            const deviceManager = new DeviceManager()
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [helpers.lightControl(), helpers.dimmerControl()]
            }))
            const directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.ReportState, true)
        })
    })

    describe('Handling', async function () {
        it('Report state for a temperature sensor', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json')

            const deviceManager = new DeviceManager()
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['TEMPERATURE_SENSOR'],
                controls: [helpers.temperatureControl()]
            }))

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, "Alexa.TemperatureSensor");
            assert.equal(response.context.properties[0].name, "temperature");
            assert.equal(response.context.properties[0].value.value, 21.5);
            assert.equal(response.context.properties[0].value.scale, "CELSIUS");
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);
        })
    })
})