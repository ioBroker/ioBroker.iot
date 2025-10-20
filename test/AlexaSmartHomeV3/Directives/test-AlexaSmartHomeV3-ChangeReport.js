const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const Directives = require('../../../build/lib/AlexaSmartHomeV3/Alexa/Directives').default;
const Properties = require('../../../build/lib/AlexaSmartHomeV3/Alexa/Properties').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;

let endpointId;
let friendlyName;
let deviceManager;

describe('AlexaSmartHomeV3 - ChangeReport', function () {
    before(async function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';

        AdapterProvider.init(helpers.adapterMock());

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName,
                displayCategories: ['LIGHT'],
                controls: [helpers.dimmerControl(), helpers.temperatureControl()],
            }),
        );
    });

    describe('Matching', async function () {
        it('ChangeReport', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.PowerState.propertyName, true);
            const directive = deviceManager.matchDirective(event);
            assert.equal(directive instanceof Directives.ChangeReport, true);
        });
    });

    describe('Handling', async function () {
        it('ChangeReport for a dimmer', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.PowerState.propertyName, true);
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.PowerController');
            assert.equal(response.event.payload.change.properties[0].name, 'powerState');
            assert.equal(response.event.payload.change.properties[0].value, 'ON');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);

            // unchanged properties
            assert.equal(response.context.properties.length, 3);
            assert.equal(response.context.properties[0].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[0].name, 'brightness');
            assert.equal(response.context.properties[0].value, 75);
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].namespace, 'Alexa.TemperatureSensor');
            assert.equal(response.context.properties[1].name, 'temperature');
            assert.equal(response.context.properties[1].value.value, 21.5);
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[2].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[2].namespace, 'Alexa.EndpointHealth');
            assert.equal(response.context.properties[2].name, 'connectivity');
            assert.equal(response.context.properties[2].value.value, 'OK');
            assert.equal(response.context.properties[2].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a temperature sensor', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.Temperature.propertyName, true);
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.TemperatureSensor');
            assert.equal(response.event.payload.change.properties[0].name, 'temperature');
            assert.equal(response.event.payload.change.properties[0].value.value, 21.5);
            assert.equal(response.event.payload.change.properties[0].value.scale, 'CELSIUS');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);

            // unchanged properties
            assert.equal(response.context.properties.length, 3);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[0].name, 'powerState');
            assert.equal(response.context.properties[0].value, 'ON');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[1].name, 'brightness');
            assert.equal(response.context.properties[1].value, 75);
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[2].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[2].namespace, 'Alexa.EndpointHealth');
            assert.equal(response.context.properties[2].name, 'connectivity');
            assert.equal(response.context.properties[2].value.value, 'OK');
            assert.equal(response.context.properties[2].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a thermostat', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.TargetSetpoint.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['THERMOSTAT'],
                    controls: [helpers.thermostatControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.ThermostatController');
            assert.equal(response.event.payload.change.properties[0].name, 'targetSetpoint');
            assert.equal(response.event.payload.change.properties[0].value.value, 23.5);
            assert.equal(response.event.payload.change.properties[0].value.scale, 'CELSIUS');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);

            // unchanged properties
            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[0].name, 'thermostatMode');
            assert.equal(response.context.properties[0].value, 'AUTO');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a thermostat with states', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.TargetSetpoint.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['THERMOSTAT'],
                    controls: [helpers.thermostatFullControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.ThermostatController');
            assert.equal(response.event.payload.change.properties[0].name, 'targetSetpoint');
            assert.equal(response.event.payload.change.properties[0].value.value, 23.5);
            assert.equal(response.event.payload.change.properties[0].value.scale, 'CELSIUS');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);

            // unchanged properties
            assert.equal(response.context.properties.length, 3);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[0].name, 'thermostatMode');
            assert.equal(response.context.properties[0].value, 'AUTO');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].namespace, 'Alexa.TemperatureSensor');
            assert.equal(response.context.properties[1].name, 'temperature');
            assert.equal(response.context.properties[1].value.value, 23.5);
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[2].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[2].name, 'powerState');
            assert.equal(response.context.properties[2].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a motion sensor', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.DetectionState.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['MOTION_SENSOR'],
                    controls: [helpers.motionControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.MotionSensor');
            assert.equal(response.event.payload.change.properties[0].name, 'detectionState');
            assert.equal(response.event.payload.change.properties[0].value, 'DETECTED');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a smart lock', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.LockState.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['SMARTLOCK'],
                    controls: [helpers.lockControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.LockController');
            assert.equal(response.event.payload.change.properties[0].name, 'lockState');
            assert.equal(response.event.payload.change.properties[0].value, 'LOCKED');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a contact sensor', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.DetectionState.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['CONTACT_SENSOR'],
                    controls: [helpers.doorControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.ContactSensor');
            assert.equal(response.event.payload.change.properties[0].name, 'detectionState');
            assert.equal(response.event.payload.change.properties[0].value, 'DETECTED');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a gate', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.Mode.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.gateControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.ModeController');
            assert.equal(response.event.payload.change.properties[0].instance, 'Gate.Position');
            assert.equal(response.event.payload.change.properties[0].name, 'mode');
            assert.equal(response.event.payload.change.properties[0].value, 'Gate.Position.Open');
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a volume', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.Volume.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.volumeControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.Speaker');
            assert.equal(response.event.payload.change.properties[0].name, 'volume');
            assert.equal(response.event.payload.change.properties[0].value, 35);
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('ChangeReport for a muted', async function () {
            const event = Directives.ChangeReport.get(endpointId, Properties.Muted.propertyName, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.volumeControl()],
                }),
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'ChangeReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            // changed properties
            assert.equal(response.event.payload.change.cause.type, 'PHYSICAL_INTERACTION');
            assert.equal(response.event.payload.change.properties.length, 1);
            assert.equal(response.event.payload.change.properties[0].namespace, 'Alexa.Speaker');
            assert.equal(response.event.payload.change.properties[0].name, 'muted');
            assert.equal(response.event.payload.change.properties[0].value, false);
            assert.equal(response.event.payload.change.properties[0].uncertaintyInMilliseconds, 0);
        });
    });
});
