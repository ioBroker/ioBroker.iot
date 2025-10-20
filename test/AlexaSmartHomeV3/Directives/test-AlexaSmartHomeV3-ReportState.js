const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const Directives = require('../../../build/lib/AlexaSmartHomeV3/Alexa/Directives').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;

let endpointId;
let friendlyName;

describe('AlexaSmartHomeV3 - ReportState', function () {
    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';
        AdapterProvider.init(helpers.adapterMock());
    });

    describe('Matching', async function () {
        it('ReportState', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['LIGHT'],
                    controls: [helpers.lightControl(), helpers.dimmerControl()],
                }),
            );
            const directive = deviceManager.matchDirective(event);
            assert.equal(directive instanceof Directives.ReportState, true);
        });
    });

    describe('Handling', async function () {
        it('Report state for a temperature sensor', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['TEMPERATURE_SENSOR'],
                    controls: [helpers.temperatureControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[0].namespace, 'Alexa.TemperatureSensor');
            assert.equal(response.context.properties[0].name, 'temperature');
            assert.equal(response.context.properties[0].value.value, 21.5);
            assert.equal(response.context.properties[0].value.scale, 'CELSIUS');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[1].namespace, 'Alexa.EndpointHealth');
            assert.equal(response.context.properties[1].name, 'connectivity');
            assert.equal(response.context.properties[1].value.value, 'OK');
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);
        });

        it('Report state for a thermostat', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['TEMPERATURE_SENSOR', 'THERMOSTAT'],
                    controls: [helpers.thermostatControl()],
                }),
            );

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[1].hasOwnProperty('instance'), false);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[0].name, 'targetSetpoint');
            assert.equal(response.context.properties[0].value.value, 23.5);
            assert.equal(response.context.properties[0].value.scale, 'CELSIUS');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[1].name, 'thermostatMode');
            assert.equal(response.context.properties[1].value, 'AUTO');
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);
        });

        it('Report state for a thermostat with states', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['TEMPERATURE_SENSOR', 'THERMOSTAT'],
                    controls: [helpers.thermostatFullControl()],
                }),
            );
            const powerId = helpers.getConfigForName('POWER', helpers.thermostatFullConfig());
            await AdapterProvider.setState(powerId, true);
            const actualTemperatureId = helpers.getConfigForName('ACTUAL', helpers.thermostatFullConfig());
            await AdapterProvider.setState(actualTemperatureId, 25);

            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);
            assert.equal(response.context.properties[0].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[1].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[2].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[3].hasOwnProperty('instance'), false);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[0].name, 'targetSetpoint');
            assert.equal(response.context.properties[0].value.value, 23.5);
            assert.equal(response.context.properties[0].value.scale, 'CELSIUS');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[1].name, 'thermostatMode');
            assert.equal(response.context.properties[1].value, 'AUTO');
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[2].namespace, 'Alexa.TemperatureSensor');
            assert.equal(response.context.properties[2].name, 'temperature');
            assert.equal(response.context.properties[2].value.value, 25);
            assert.equal(response.context.properties[2].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'ON');
            assert.equal(response.context.properties[3].uncertaintyInMilliseconds, 0);
        });

        it('Report state for a motion sensor', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const unreachId = helpers.getConfigForName('UNREACH', helpers.motionConfig());
            // set an error
            await AdapterProvider.setState(unreachId, true);

            const deviceManager = new DeviceManager();
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
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[0].namespace, 'Alexa.MotionSensor');
            assert.equal(response.context.properties[0].name, 'detectionState');
            assert.equal(response.context.properties[0].value, 'DETECTED');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[1].namespace, 'Alexa.EndpointHealth');
            assert.equal(response.context.properties[1].name, 'connectivity');
            assert.equal(response.context.properties[1].value.value, 'UNREACHABLE');
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);
        });

        it('Report state for a smart lock', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
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
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[0].namespace, 'Alexa.LockController');
            assert.equal(response.context.properties[0].name, 'lockState');
            assert.equal(response.context.properties[0].value, 'LOCKED');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('Report state for a contact sensor', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
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
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ContactSensor');
            assert.equal(response.context.properties[0].name, 'detectionState');
            assert.equal(response.context.properties[0].value, 'DETECTED');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].hasOwnProperty('instance'), false);
            assert.equal(response.context.properties[1].namespace, 'Alexa.EndpointHealth');
            assert.equal(response.context.properties[1].name, 'connectivity');
            assert.equal(response.context.properties[1].value.value, 'OK');
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);
        });

        it('Report state for a gate', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
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
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ModeController');
            assert.equal(response.context.properties[0].instance, 'Gate.Position');
            assert.equal(response.context.properties[0].name, 'mode');
            assert.equal(response.context.properties[0].value, 'Gate.Position.Open');
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);
        });

        it('Report state for a volume', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');

            const deviceManager = new DeviceManager();
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
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 2);

            assert.equal(response.context.properties[0].namespace, 'Alexa.Speaker');
            assert.equal(response.context.properties[0].name, 'volume');
            assert.equal(response.context.properties[0].value, 35);
            assert.equal(response.context.properties[0].uncertaintyInMilliseconds, 0);

            assert.equal(response.context.properties[1].namespace, 'Alexa.Speaker');
            assert.equal(response.context.properties[1].name, 'muted');
            assert.equal(response.context.properties[1].value, false);
            assert.equal(response.context.properties[1].uncertaintyInMilliseconds, 0);
        });
    });
});
