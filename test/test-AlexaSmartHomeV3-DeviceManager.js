const assert = require('assert');
const helpers = require('./helpers')
const Utils = require('../lib/AlexaSmartHomeV3/Helpers/Utils')
const IotProxy = require('../lib/AlexaSmartHomeV3/Helpers/IotProxy')
const DeviceManager = require('../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../lib/AlexaSmartHomeV3/Device')

const endpointId = 'endpoint-001'
const friendlyName = 'some-friendly-name'
let stateChange = null;

describe('AlexaSmartHomeV3 - DeviceManager', function () {

    before(function () {
        IotProxy.publishStateChange = event => stateChange = event;
    });

    after(function () {
    });

    describe('sends ChangeReport...', async function () {
        it('on voice interaction', async function () {
            // mock publishing            
            const deviceManager = new DeviceManager()
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [helpers.dimmerControl()]
            }))

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
            // mock publishing            
            const deviceManager = new DeviceManager()
            const dimmer = helpers.dimmerControl();

            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [dimmer]
            }))

            stateChange = null;

            await deviceManager.handleStateUpdate(dimmer.supported[0].stateProxy.getId, { val: false, ack: true })

            assert.notEqual(stateChange, null);
            assert.equal(stateChange.context.properties.length, 1);
            assert.equal(stateChange.context.properties[0].name, 'brightness');

            assert.equal(stateChange.event.payload.change.properties[0].name, 'powerState');
            assert.equal(stateChange.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
        })
    })
})