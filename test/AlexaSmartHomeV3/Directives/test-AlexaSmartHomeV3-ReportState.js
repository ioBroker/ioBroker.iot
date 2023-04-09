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
        it('ReportState', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json')
            const directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.ReportState, true)
        })
    })

    describe('Handling', async function () {
        it('TODO', async function () {
        })
    })
})