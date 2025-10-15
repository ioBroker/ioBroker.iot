const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const Directives = require('../../../build/lib/AlexaSmartHomeV3/Alexa/Directives').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;

let endpointId;
let friendlyName;

describe('AlexaSmartHomeV3 - Discovery', function () {
    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';
        AdapterProvider.init(helpers.adapterMock());
    });

    describe('Matching', async function () {
        // device manager directives
        it('Discovery', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');
            const deviceManager = new DeviceManager();
            const directive = deviceManager.matchDirective(event);
            assert.equal(directive instanceof Directives.Discovery, true);
        });
    });

    describe('Handling', async function () {
        // device manager directives
        it('Discovery of a dimmable light', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.lightControl(), helpers.dimmerControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 3);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.PowerController');
            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, 'Alexa.BrightnessController');
        });

        it('Discovery of a light', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.lightControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.PowerController');
        });

        it('Discovery of a temperature sensor', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.temperatureControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.TemperatureSensor');
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name,
                'temperature',
            );
        });

        it('Discovery of a thermostat', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.thermostatControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 3);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.TemperatureSensor');

            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, 'Alexa.ThermostatController');
            assert.equal(response.event.payload.endpoints[0].capabilities[2].version, '3.2');
            assert.equal(response.event.payload.endpoints[0].capabilities[2].properties.supported.length, 2);
            assert.equal(
                response.event.payload.endpoints[0].capabilities[2].properties.supported[0].name,
                'targetSetpoint',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[2].properties.supported[1].name,
                'thermostatMode',
            );
            assert.equal(response.event.payload.endpoints[0].capabilities[2].configuration.supportedModes.length, 1);
            assert.equal(response.event.payload.endpoints[0].capabilities[2].configuration.supportedModes[0], 'AUTO');
        });

        it('Discovery of a motion sensor', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.motionControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.MotionSensor');
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name,
                'detectionState',
            );
        });

        it('Discovery of a smart lock', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.lockControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.LockController');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name, 'lockState');
        });

        it('Discovery of a contact sensor', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.doorControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.ContactSensor');
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name,
                'detectionState',
            );
        });

        it('Discovery of a scene', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.sceneControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');
            assert.equal(response.event.payload.endpoints[0].displayCategories[0], 'SCENE_TRIGGER', 'SCENE_TRIGGER!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.SceneController');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].properties, undefined);
            assert.equal(response.event.payload.endpoints[0].capabilities[1].supportsDeactivation, false);
        });

        it('Discovery of blinds', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.blindsControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.PercentageController');
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name,
                'percentage',
            );
        });

        it('Discovery of a vacuum cleaner', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.vacuumCleanerControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.PowerController');
        });

        it('Discovery of a volume', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.volumeControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.Speaker');
        });

        it('Discovery of a volume group', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.volumeGroupControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.Speaker');
        });

        it('Discovery of a gate', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.gateControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');
            assert.equal(response.event.payload.endpoints[0].displayCategories.includes('GARAGE_DOOR'), true);
            assert.equal(response.event.payload.endpoints[0].displayCategories.length, 1);

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.ModeController');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].instance, 'Gate.Position');

            assert.equal(response.event.payload.endpoints[0].capabilities[1].properties.supported.length, 1);
            assert.equal(response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name, 'mode');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].properties.nonControllable, false);

            assert.equal(response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes.length, 2);
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[0].value,
                'Gate.Position.Open',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[0].modeResources
                    .friendlyNames.length,
                3,
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[0].modeResources
                    .friendlyNames[0].value.assetId,
                'Alexa.Value.Open',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[0].modeResources
                    .friendlyNames[1].value.text,
                'Opened',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[0].modeResources
                    .friendlyNames[1].value.locale,
                'en-US',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[1].value,
                'Gate.Position.Closed',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[1].modeResources
                    .friendlyNames.length,
                3,
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[1].modeResources
                    .friendlyNames[0].value.assetId,
                'Alexa.Value.Close',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[1].modeResources
                    .friendlyNames[1].value.text,
                'Closed',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].configuration.supportedModes[1].modeResources
                    .friendlyNames[1].value.locale,
                'en-US',
            );

            assert.equal(response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings.length, 2);
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[0].actions.length,
                1,
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[0].actions[0],
                'Alexa.Actions.Open',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[0].directive.name,
                'SetMode',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[0].directive.payload.mode,
                'Gate.Position.Open',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[1].actions.length,
                1,
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[1].actions[0],
                'Alexa.Actions.Close',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[1].directive.name,
                'SetMode',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.actionMappings[1].directive.payload.mode,
                'Gate.Position.Closed',
            );

            assert.equal(response.event.payload.endpoints[0].capabilities[1].semantics.stateMappings.length, 2);
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.stateMappings[0].states.length,
                1,
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.stateMappings[0].states[0],
                'Alexa.States.Opened',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.stateMappings[0].value,
                'Gate.Position.Open',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.stateMappings[1].states.length,
                1,
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.stateMappings[1].states[0],
                'Alexa.States.Closed',
            );
            assert.equal(
                response.event.payload.endpoints[0].capabilities[1].semantics.stateMappings[1].value,
                'Gate.Position.Closed',
            );
        });

        it('Discovery of a color', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.rgbSingleControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, 'Alexa.Discovery', 'Namespace!');
            assert.equal(response.event.header.name, 'Discover.Response', 'Name!');
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, 'Friendly Name!');
            assert.equal(response.event.payload.endpoints[0].displayCategories.includes('LIGHT'), true);
            assert.equal(response.event.payload.endpoints[0].displayCategories.length, 1);

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 5);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, 'AlexaInterface');
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, 'Alexa');
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, 'Alexa.ColorController');

            assert.equal(response.event.payload.endpoints[0].capabilities[1].properties.supported.length, 1);
            assert.equal(response.event.payload.endpoints[0].capabilities[1].properties.supported[0].name, 'color');
        });
    });
});
