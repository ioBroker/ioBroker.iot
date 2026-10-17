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
                friendlyName,
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

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

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

    // Alexa keeps a device that is gone here and still asks for it; the answer has to say so in a form Alexa accepts
    describe('answers for a device that is gone...', async function () {
        it('a ReportState with NO_SUCH_ENDPOINT', async function () {
            const event = await helpers.getSample('ReportState.json');
            event.directive.endpoint.endpointId = 'removed-device';

            const response = await deviceManager.handleAlexaEvent(event);

            assert.equal(response.event.header.name, 'ErrorResponse');
            assert.equal(response.event.payload.type, 'NO_SUCH_ENDPOINT');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken);
            assert.equal(response.event.endpoint.endpointId, 'removed-device');
        });

        it('a control directive with NO_SUCH_ENDPOINT', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            event.directive.endpoint.endpointId = 'removed-device';

            const response = await deviceManager.handleAlexaEvent(event);

            assert.equal(response.event.header.name, 'ErrorResponse');
            assert.equal(response.event.payload.type, 'NO_SUCH_ENDPOINT');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken);
        });
    });

    describe('creates devices...', async function () {
        it('must create HUE device from combined states', async function () {
            const objects = require('../Resources/hue-combined.json');
            AdapterProvider.init(helpers.adapterMock(objects));
            deviceManager = new DeviceManager();
            await deviceManager.collectEndpoints();
            const endpoints = deviceManager.endpoints || [];
            assert.equal(endpoints.length, 1);

            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const response = await deviceManager.handleAlexaEvent(event);

            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, 'Licht Hue Küchenzeile', 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 6);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.PowerController');
            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, 'Alexa.BrightnessController');
            assert.equal(response.event.payload.endpoints[0].capabilities[3].interface, 'Alexa.ColorTemperatureController');
            assert.equal(response.event.payload.endpoints[0].capabilities[4].interface, 'Alexa.ColorController');
            assert.equal(response.event.payload.endpoints[0].capabilities[5].interface, 'Alexa.RangeController');
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name,
                'powerState',
            );
        });
    });

    describe('keeps devices sharing a state up to date...', async function () {
        it('when the state changes outside of the device', async function () {
            AdapterProvider.init(helpers.adapterMock());
            // every name of a comma-separated smartName becomes its own device with its own copy of the controls
            const manager = new DeviceManager();
            const first = helpers.sliderControl();
            const second = helpers.sliderControl();
            manager.addDevice(new Device({ id: 'oven', friendlyName: 'oven', controls: [first] }));
            manager.addDevice(new Device({ id: 'stove', friendlyName: 'stove', controls: [second] }));

            // the second name was used last: its cache holds 120
            const set = await helpers.getSample('RangeController/RangeController.SetRangeValue.request.json');
            set.directive.endpoint.endpointId = 'stove';
            await manager.handleAlexaEvent(set);

            // the device confirms another value, e.g. after a command via the first name or a wall switch
            const id = second.supported[0].properties[0].getId;
            await AdapterProvider.get().setForeignStateAsync(id, { val: 200, ack: true });
            await manager.handleStateUpdate(id, { val: 200, ack: true });
            assert.equal(first.supported[0].properties[0].currentValue, 200);
            assert.equal(second.supported[0].properties[0].currentValue, 200);

            // a relative command via the second name starts from the current value
            const adjust = await helpers.getSample('RangeController/RangeController.AdjustRangeValue.request.json');
            adjust.directive.endpoint.endpointId = 'stove';
            const response = await manager.handleAlexaEvent(adjust);
            assert.equal(response.context.properties[0].value, 195, 'Value!');
        });
    });
});
