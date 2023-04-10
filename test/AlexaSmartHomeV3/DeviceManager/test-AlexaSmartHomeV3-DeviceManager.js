const assert = require('assert');
const helpers = require('../helpers')
const IotProxy = require('../../../lib/AlexaSmartHomeV3/Helpers/IotProxy')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')


describe('AlexaSmartHomeV3 - DeviceManager', function () {

    before(function () {
        IotProxy.publishStateChange = event => stateChange = event;

        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'
        stateChange = null

        deviceManager = new DeviceManager()
        dimmer = helpers.dimmerControl();

        deviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [dimmer]
        }))
    });

    after(function () {
    });

    describe('sends ChangeReport...', async function () {
        it('on voice interaction', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');

            stateChange = null;

            await deviceManager.handleAlexaEvent(event);

            assert.notEqual(stateChange, null);
            assert.equal(stateChange.context.properties.length, 1);
            assert.equal(stateChange.context.properties[0].name, 'brightness');

            assert.equal(stateChange.event.payload.change.properties[0].name, 'powerState');
            assert.equal(stateChange.event.payload.change.cause.type, 'VOICE_INTERACTION');
        })

        it('on physical interaction', async function () {

            stateChange = null;

            await deviceManager.handleStateUpdate(dimmer.supported[0].properties[0].stateProxy.getId, { val: false, ack: true })

            assert.notEqual(stateChange, null);
            assert.equal(stateChange.context.properties.length, 1);
            assert.equal(stateChange.context.properties[0].name, 'brightness');

            assert.equal(stateChange.event.payload.change.properties[0].name, 'powerState');
            assert.equal(stateChange.event.payload.change.properties[0].value, 'OFF');
            assert.equal(stateChange.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
        })
    })

    describe('does not send ChangeReport...', async function () {
        it('on unacknowledged state change', async function () {

            stateChange = null;

            await deviceManager.handleStateUpdate(dimmer.supported[0].properties[0].stateProxy.getId, { val: false, ack: false })

            assert.equal(stateChange, null);
        })
        it('on non existing state id', async function () {

            stateChange = null;

            await deviceManager.handleStateUpdate('non-existing', { val: false, ack: true })

            assert.equal(stateChange, null);
        })

        it('on state id not belonging to any device', async function () {

            stateChange = null;

            await deviceManager.handleStateUpdate('system.adapter.admin.0.alive', { val: false, ack: true })

            assert.equal(stateChange, null);
        })
    })
})