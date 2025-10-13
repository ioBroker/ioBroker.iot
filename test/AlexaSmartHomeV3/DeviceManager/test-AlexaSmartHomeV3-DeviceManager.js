const assert = require('assert');
const helpers = require('../helpers');
const IotProxy = require('../../../build/lib/AlexaSmartHomeV3/Helpers/IotProxy').default;
const RateLimiter = require('../../../build/lib/AlexaSmartHomeV3/Helpers/RateLimiter').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;

let stateChange;
let endpointId;
let friendlyName;
let deviceManager;
let dimmer;

describe('AlexaSmartHomeV3 - DeviceManager', function () {
    before(function () {
        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => {
            stateChange = event;
        };

        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';
        stateChange = null;

        deviceManager = new DeviceManager();
        dimmer = helpers.dimmerControl();

        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategories: ['LIGHT'],
                controls: [dimmer],
            }),
        );
    });

    describe('sends ChangeReport...', async function () {
        it('on voice interaction', async function () {
            process.env.TESTS_EXECUTION = 'true';
            // set dimmer power to ON
            deviceManager.endpoints[0].controls[0].allCapabilities[0].properties[0].currentValue = true;

            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');

            stateChange = null;

            await deviceManager.handleAlexaEvent(event);

            assert.notEqual(stateChange, null);
            assert.equal(stateChange.context.properties.length, 1);
            assert.equal(stateChange.context.properties[0].name, 'brightness');

            assert.equal(stateChange.event.payload.change.properties[0].name, 'powerState');
            assert.equal(stateChange.event.payload.change.cause.type, 'VOICE_INTERACTION');
        });

        it('on physical interaction', async function () {
            stateChange = null;

            // set dimmer power to OFF
            deviceManager.endpoints[0].controls[0].allCapabilities[0].properties[0].currentValue = false;

            await deviceManager.handleStateUpdate(dimmer.supported[0].properties[0].getId, { val: true, ack: true });

            assert.notEqual(stateChange, null);
            assert.equal(stateChange.context.properties.length, 1);
            assert.equal(stateChange.context.properties[0].name, 'brightness');

            assert.equal(stateChange.event.payload.change.properties[0].name, 'powerState');
            assert.equal(stateChange.event.payload.change.properties[0].value, 'ON');
            assert.equal(stateChange.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
        });
    });

    describe('respects Rate Limits...', async function () {
        it('on physical interaction', async function () {
            RateLimiter.usage = new Map();

            // get the dimmer power value
            let value = deviceManager.endpoints[0].controls[0].allCapabilities[0].properties[0].currentValue;

            for (let i = 0; i < RateLimiter.MAX_DEVICE_STATE_CHANGES_PER_HOUR; i++) {
                value = !value;
                stateChange = null;
                await deviceManager.handleStateUpdate(dimmer.supported[0].properties[0].getId, {
                    val: value,
                    ack: true,
                });
                assert.notEqual(stateChange, null);
            }

            stateChange = null;
            value = !value;
            await deviceManager.handleStateUpdate(dimmer.supported[0].properties[0].getId, { val: value, ack: true });
            assert.equal(stateChange, null);
        });
    });

    describe('does not send ChangeReport...', async function () {
        it('on unacknowledged state change', async function () {
            stateChange = null;

            await deviceManager.handleStateUpdate(dimmer.supported[0].properties[0].getId, { val: false, ack: false });

            assert.equal(stateChange, null);
        });
        it('on non existing state id', async function () {
            stateChange = null;

            await deviceManager.handleStateUpdate('non-existing', { val: false, ack: true });

            assert.equal(stateChange, null);
        });

        it('on state id not belonging to any device', async function () {
            stateChange = null;

            await deviceManager.handleStateUpdate('system.adapter.admin.0.alive', { val: false, ack: true });

            assert.equal(stateChange, null);
        });
    });
});
