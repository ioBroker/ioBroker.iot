const assert = require('assert');
const helpers = require('../helpers');
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;

let deviceManager;
let dimmerDeviceManager;
let lightDeviceManager;
let dimmer;
let light;
let endpointId;
let friendlyName;

describe('AlexaSmartHomeV3 - Controls', function () {
    before(async function () {
        AdapterProvider.init(helpers.adapterMock());
    });

    describe('Light', async function () {
        before(function () {
            dimmer = helpers.dimmerControl();
            light = helpers.lightControl();
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';

            lightDeviceManager = new DeviceManager();
            lightDeviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['LIGHT'],
                    controls: [light],
                }),
            );

            dimmerDeviceManager = new DeviceManager();
            dimmerDeviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['LIGHT'],
                    controls: [dimmer],
                }),
            );
        });

        it('Light reports state', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await lightDeviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[0].name, 'powerState');
            assert.equal(response.context.properties[0].value, 'ON');

            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });
    });

    describe('Temperature', async function () {
        it('Temperature reports state', async function () {
            const devManager = new DeviceManager();
            const temperature = helpers.temperatureControl();
            devManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['TEMPERATURE_SENSOR'],
                    controls: [temperature],
                }),
            );
            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await devManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, 'Alexa.TemperatureSensor');
            assert.equal(response.context.properties[0].name, 'temperature');
            assert.equal(response.context.properties[0].value.value, 21.5);
            assert.equal(response.context.properties[0].value.scale, 'CELSIUS');

            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });
    });

    describe('Humidity', async function () {
        it('Humidity reports state', async function () {
            const devManager = new DeviceManager();
            const humidity = helpers.humidityControl();
            devManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['TEMPERATURE_SENSOR'],
                    controls: [humidity],
                }),
            );
            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await devManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, 'Alexa.HumiditySensor');
            assert.equal(response.context.properties[0].name, 'relativeHumidity');
            assert.equal(response.context.properties[0].value, 81);

            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });
    });

    describe('Dimmer', async function () {
        it('Dimmer respects values range on setting brightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            const d = dimmerDeviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            const response = await d.handle(event);
            const idDimmer = helpers.getConfigForName('SET', helpers.dimmerConfig());
            const stateValue = await AdapterProvider.getState(idDimmer);
            assert.equal(stateValue, 875);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');
            assert.equal(response.context.properties[1].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[1].value, 75, 'Value!');

            // (1000 - 500) * 0,75 + 500 = 875
            assert.equal(d.controls[0].supported[1].properties[0].currentValue, 875);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });

        it('Dimmer reports state', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await dimmerDeviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[0].name, 'powerState');
            assert.equal(response.context.properties[0].value, 'ON');

            assert.equal(response.context.properties[1].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[1].name, 'brightness');
            assert.equal(response.context.properties[1].value, 75);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });

        it('Dimmer could process turn off event', async function () {
            const event = await helpers.getSample(
                'PowerController/PowerController.TurnOff.request.json',
            );
            const d = dimmerDeviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            const response = await d.handle(event);
            const idDimmer = helpers.getConfigForName('SET', helpers.dimmerConfig());
            const stateValue = await AdapterProvider.getState(idDimmer);
            assert.equal(stateValue, 500);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');
            assert.equal(response.context.properties[1].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[1].value, 0, 'Value!');

            // (1000 - 500) * 0,75 + 500 = 875
            assert.equal(d.controls[0].supported[1].properties[0].currentValue, 500);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });

        it('Dimmer could process turn on event', async function () {
            const event = await helpers.getSample(
                'PowerController/PowerController.TurnOn.request.json',
            );
            const d = dimmerDeviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            const response = await d.handle(event);
            const idDimmer = helpers.getConfigForName('SET', helpers.dimmerConfig());
            const stateValue = await AdapterProvider.getState(idDimmer);
            assert.equal(stateValue, 900);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');
            assert.equal(response.context.properties[1].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[1].value, 80, 'Value!');

            // (1000 - 500) * 0,75 + 500 = 875
            assert.equal(d.controls[0].supported[1].properties[0].currentValue, 900);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });
    });

    describe('AirConditioner', async function () {
        before(function () {
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.airConditionControl()],
                }),
            );
        });

        it('AirConditioner allows to set mode', async function () {
            const event = helpers.thermostatControllerSetThermostatModeRequest();

            for (const mode of ['AUTO', 'HEAT', 'ECO', 'OFF']) {
                const newEvent = JSON.parse(JSON.stringify(event));
                newEvent.directive.payload.thermostatMode.value = mode;
                const d = deviceManager.endpointById(newEvent.directive.endpoint.endpointId);
                assert.notEqual(d, undefined);
                assert.equal(d instanceof Device, true);
                let response = await d.handle(newEvent);
                assert.equal(
                    response.context.properties[0].namespace,
                    'Alexa.ThermostatController',
                    'Properties Namespace!',
                );
                assert.equal(response.context.properties[0].name, 'thermostatMode', 'Properties Name!');

                assert.equal(response.context.properties[0].value, mode, 'Value!');

                // check the powerState
                assert.equal(d.controls[0].supported[2].properties[0].currentValue, mode !== 'OFF');

                assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
                assert.equal(response.event.header.name, 'Response', 'Namespace!');
                assert.equal(
                    response.event.header.correlationToken,
                    event.directive.header.correlationToken,
                    'Correlation Token!',
                );
                assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
                assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            }
        });

        it('AirCondition reports state', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, 'Alexa.TemperatureSensor');
            assert.equal(response.context.properties[0].name, 'temperature');
            assert.equal(response.context.properties[0].value.value, 23.5);
            assert.equal(response.context.properties[0].value.scale, 'CELSIUS');

            assert.equal(response.context.properties[1].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[1].name, 'targetSetpoint');
            assert.equal(response.context.properties[1].value.value, 23.5);
            assert.equal(response.context.properties[1].value.scale, 'CELSIUS');

            assert.equal(response.context.properties[2].namespace, 'Alexa.ThermostatController');
            assert.equal(response.context.properties[2].name, 'thermostatMode');
            assert.equal(response.context.properties[3].value, 'OFF');

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'OFF');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });
    });

    describe('Hue', async function () {
        before(function () {
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.hueControl()],
                }),
            );
        });

        it('Hue allows to change color', async function () {
            const event = await helpers.getSample('ColorController/ColorController.SetColor.request.json');
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            const response = await d.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'color', 'Properties Name!');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });

        it('Hue allows to set color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.SetColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 5000);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });

        it('Hue allows to increase color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.IncreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set current temp to 2200
            d.controls[0].supported[2].properties[0].currentValue = 2200;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2700);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });

        it('Hue allows to decrease color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.DecreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set current temp to 2200
            d.controls[0].supported[2].properties[0].currentValue = 2200;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2200);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
        });
    });

    describe('RgbSingle', async function () {
        before(function () {
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.rgbSingleControl()],
                }),
            );
        });

        it('RgbSingle allows to change color', async function () {
            const event = await helpers.getSample('ColorController/ColorController.SetColor.request.json');
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'color', 'Properties Name!');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle allows to set color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.SetColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 5000);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle allows to increase color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.IncreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2200;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2700);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle allows to decrease color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.DecreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2700;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2200);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle allows to set brightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 75, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle reports state', async function () {
            // Reset current values to force fresh retrieval from mock adapter
            deviceManager.endpoints
                .flatMap(e => e.controls)
                .flatMap(c => c.allCapabilities)
                .flatMap(c => c.properties)
                .forEach(p => (p.currentValue = undefined));

            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController');
            assert.equal(response.context.properties[0].name, 'color');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ColorTemperatureController');
            assert.equal(response.context.properties[1].name, 'colorTemperatureInKelvin');
            assert.equal(response.context.properties[1].value, 2200);

            assert.equal(response.context.properties[2].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[2].name, 'brightness');
            assert.equal(response.context.properties[2].value, 75);

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'ON');
        });
    });

    describe('RgbwSingle', async function () {
        before(async function () {
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';
            const id = helpers.getConfigForName('RGBW', helpers.rgbwSingleConfig());
            await AdapterProvider.setState(id, '#11223344', true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.rgbwSingleControl()],
                }),
            );
        });

        it('RgbwSingle reports set state', async function () {
            // Reset current values to force fresh retrieval from mock adapter
            deviceManager.endpoints
                .flatMap(e => e.controls)
                .flatMap(c => c.allCapabilities)
                .flatMap(c => c.properties)
                .forEach(p => (p.currentValue = undefined));

            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController');
            assert.equal(response.context.properties[0].name, 'color');
            //
            assert.equal(response.context.properties[0].value.hue, 210);
            assert.equal(response.context.properties[0].value.saturation, 0.67);
            assert.equal(response.context.properties[0].value.brightness, 0.2);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ColorTemperatureController');
            assert.equal(response.context.properties[1].name, 'colorTemperatureInKelvin');
            assert.equal(response.context.properties[1].value, 2200);

            assert.equal(response.context.properties[2].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[2].name, 'brightness');
            assert.equal(response.context.properties[2].value, 75);

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'ON');
        });

        it('RgbwSingle allows to change color', async function () {
            const event = await helpers.getSample('ColorController/ColorController.SetColor.request.json');
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'color', 'Properties Name!');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbwSingle allows to set color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.SetColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 5000);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbwSingle allows to increase color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.IncreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2200;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2700);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbwSingle allows to decrease color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.DecreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2700;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2200);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbwSingle allows to set brightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 75, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbwSingle reports state', async function () {
            // Reset current values to force fresh retrieval from mock adapter
            deviceManager.endpoints
                .flatMap(e => e.controls)
                .flatMap(c => c.allCapabilities)
                .flatMap(c => c.properties)
                .forEach(p => (p.currentValue = undefined));

            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController');
            assert.equal(response.context.properties[0].name, 'color');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ColorTemperatureController');
            assert.equal(response.context.properties[1].name, 'colorTemperatureInKelvin');
            assert.equal(response.context.properties[1].value, 2200);

            assert.equal(response.context.properties[2].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[2].name, 'brightness');
            assert.equal(response.context.properties[2].value, 75);

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'ON');
        });
    });

    describe('Rgbw', async function () {
        before(async function () {
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';
            const idRed = helpers.getConfigForName('RED', helpers.rgbwConfig());
            const idGreen = helpers.getConfigForName('GREEN', helpers.rgbwConfig());
            const idBlue = helpers.getConfigForName('BLUE', helpers.rgbwConfig());
            const idWhite = helpers.getConfigForName('WHITE', helpers.rgbwConfig());
            // '#11223344'
            await AdapterProvider.setState(idRed, 0x11, true);
            await AdapterProvider.setState(idGreen, 0x22, true);
            await AdapterProvider.setState(idBlue, 0x33, true);
            await AdapterProvider.setState(idWhite, 0x44, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.rgbwControl()],
                }),
            );
        });

        it('Rgbw reports set state', async function () {
            // Reset current values to force fresh retrieval from mock adapter
            deviceManager.endpoints
                .flatMap(e => e.controls)
                .flatMap(c => c.allCapabilities)
                .flatMap(c => c.properties)
                .forEach(p => (p.currentValue = undefined));

            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController');
            assert.equal(response.context.properties[0].name, 'color');
            //
            assert.equal(response.context.properties[0].value.hue, 210);
            assert.equal(response.context.properties[0].value.saturation, 0.67);
            assert.equal(response.context.properties[0].value.brightness, 0.2);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ColorTemperatureController');
            assert.equal(response.context.properties[1].name, 'colorTemperatureInKelvin');
            assert.equal(response.context.properties[1].value, 2200);

            assert.equal(response.context.properties[2].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[2].name, 'brightness');
            assert.equal(response.context.properties[2].value, 75);

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'ON');
        });

        it('Rgbw allows to change color', async function () {
            const event = await helpers.getSample('ColorController/ColorController.SetColor.request.json');
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'color', 'Properties Name!');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Rgbw allows to set color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.SetColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 5000);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Rgbw allows to increase color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.IncreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2200;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2700);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Rgbw allows to decrease color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.DecreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2700;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2200);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Rgbw allows to set brightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 75, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Rgbw reports state', async function () {
            // Reset current values to force fresh retrieval from mock adapter
            deviceManager.endpoints
                .flatMap(e => e.controls)
                .flatMap(c => c.allCapabilities)
                .flatMap(c => c.properties)
                .forEach(p => (p.currentValue = undefined));

            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController');
            assert.equal(response.context.properties[0].name, 'color');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ColorTemperatureController');
            assert.equal(response.context.properties[1].name, 'colorTemperatureInKelvin');
            assert.equal(response.context.properties[1].value, 2200);

            assert.equal(response.context.properties[2].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[2].name, 'brightness');
            assert.equal(response.context.properties[2].value, 75);

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'ON');
        });
    });

    describe('Dimmer with power', async function () {
        before(async function () {
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';
            const idLevel = helpers.getConfigForName('SET', helpers.dimmerWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.dimmerWithPowerConfig());
            await AdapterProvider.setState(idPower, false, true);
            await AdapterProvider.setState(idLevel, 510, true);

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.dimmerWithPowerControl()],
                }),
            );
        });

        it('Dimmer with power reports state', async function () {
            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 2);

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[0].name, 'powerState');
            //
            assert.equal(response.context.properties[0].value, 'OFF');

            assert.equal(response.context.properties[1].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[1].name, 'brightness');
            assert.equal(response.context.properties[1].value, 2);
        });

        it('Dimmer with power goes ON if brightness is set to non zero value', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            const idLevel = helpers.getConfigForName('SET', helpers.dimmerWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.dimmerWithPowerConfig());
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, true, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 875, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');
            assert.equal(response.context.properties[1].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[1].value, 75, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Dimmer with power does not go OFF if brightness is set to zero value', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            event.directive.payload.brightness = 0;
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            const idLevel = helpers.getConfigForName('SET', helpers.dimmerWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.dimmerWithPowerConfig());
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, true, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 500, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties.length, 1, 'Properties Length!');
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 0, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Brightness in dimmer with power goes ON if dimmer is turned on', async function () {
            const event = await helpers.getSample(
                'PowerController/PowerController.TurnOn.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            const idLevel = helpers.getConfigForName('SET', helpers.dimmerWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.dimmerWithPowerConfig());
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, true, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            // 80% of 1023 = 818.4 ~ 900
            assert.equal(valueState, 900, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');
            assert.equal(response.context.properties[1].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[1].value, 80, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Brightness in dimmer with power does not go OFF if dimmer is turned off', async function () {
            const event = await helpers.getSample(
                'PowerController/PowerController.TurnOff.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            const idLevel = helpers.getConfigForName('SET', helpers.dimmerWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.dimmerWithPowerConfig());
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, false, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            // 80% of 1023 = 818.4 ~ 900
            assert.equal(valueState, 900, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');
            assert.equal(response.context.properties.length, 1, 'Properties Length!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });
    });

    describe('RgbSingle with power', async function () {
        before(function () {
            endpointId = 'endpoint-001';
            friendlyName = 'some-friendly-name';

            deviceManager = new DeviceManager();
            deviceManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    controls: [helpers.rgbSingleWithPowerControl()],
                }),
            );
        });

        it('RgbSingle with power allows to change color', async function () {
            const event = await helpers.getSample('ColorController/ColorController.SetColor.request.json');
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'color', 'Properties Name!');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle with power allows to set color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.SetColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 5000);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle with power allows to increase color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.IncreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2200;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2700);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle with power allows to decrease color temperature', async function () {
            const event = await helpers.getSample(
                'ColorTemperatureController/ColorTemperatureController.DecreaseColorTemperature.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);

            // set the current temp to 2200
            d.controls[0].supported[1].properties[0].currentValue = 2700;

            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.ColorTemperatureController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'colorTemperatureInKelvin', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 2200);

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle with power allows to set brightness', async function () {
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 75, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('RgbSingle with power reports state', async function () {
            // Reset current values to force fresh retrieval from mock adapter
            deviceManager.endpoints
                .flatMap(e => e.controls)
                .flatMap(c => c.allCapabilities)
                .flatMap(c => c.properties)
                .forEach(p => (p.currentValue = undefined));

            const event = await helpers.getSample('StateReport/ReportState.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'StateReport', 'Name!');
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, 'Name!');
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, 'Alexa.ColorController');
            assert.equal(response.context.properties[0].name, 'color');
            assert.equal(response.context.properties[0].value.hue, 351);
            assert.equal(response.context.properties[0].value.saturation, 0.71);
            assert.equal(response.context.properties[0].value.brightness, 0.65);

            assert.equal(response.context.properties[1].namespace, 'Alexa.ColorTemperatureController');
            assert.equal(response.context.properties[1].name, 'colorTemperatureInKelvin');
            assert.equal(response.context.properties[1].value, 2200);

            assert.equal(response.context.properties[2].namespace, 'Alexa.BrightnessController');
            assert.equal(response.context.properties[2].name, 'brightness');
            assert.equal(response.context.properties[2].value, 75);

            assert.equal(response.context.properties[3].namespace, 'Alexa.PowerController');
            assert.equal(response.context.properties[3].name, 'powerState');
            assert.equal(response.context.properties[3].value, 'ON');
        });

        it('RgbSingle with power goes ON if brightness is set to non-zero', async function () {
            // Turn the lamp OFF
            const powerOff = await helpers.getSample(
                'PowerController/PowerController.TurnOff.request.json',
            );
            const d = deviceManager.endpointById(powerOff.directive.endpoint.endpointId);

            let response = await d.handle(powerOff);

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            const idLevel = helpers.getConfigForName('DIMMER', helpers.rgbSingleWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.rgbSingleWithPowerConfig());
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, false, 'Value!');

            // Set the brightness to 75
            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            response = await d.handle(event);
            valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, true, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 75, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[1].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[1].value, 'ON', 'Value!');
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 75, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');

            // Set the brightness to 85
            event.directive.payload.brightness = 85;
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            response = await d.handle(event);
            valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, true, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 85, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            // Power state should state ON and must not be reported
            assert.equal(response.context.properties.length, 1, 'Properties Length!');
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 85, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');

            // Set the lamp off again
            response = await d.handle(powerOff);

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, false, 'Value!');

            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 85, 'Value!');
        });

        it('RgbSingle with power does not goes OFF if brightness is set to zero', async function () {
            const idLevel = helpers.getConfigForName('DIMMER', helpers.rgbSingleWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.rgbSingleWithPowerConfig());
            // Turn ON
            const powerOnEvent = await helpers.getSample(
                'PowerController/PowerController.TurnOn.request.json',
            );
            const d = deviceManager.endpointById(powerOnEvent.directive.endpoint.endpointId);
            let response = await d.handle(powerOnEvent);

            const event = await helpers.getSample(
                'BrightnessController/BrightnessController.SetBrightness.request.json',
            );
            event.directive.payload.brightness = 0;
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            response = await d.handle(event);
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, true, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 0, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.BrightnessController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties.length, 1, 'Properties Length!');
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 0, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Brightness in RgbSingle with power goes ON if dimmer is turned on', async function () {
            const event = await helpers.getSample(
                'PowerController/PowerController.TurnOn.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            const idLevel = helpers.getConfigForName('DIMMER', helpers.rgbSingleWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.rgbSingleWithPowerConfig());
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, true, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 100, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[1].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[1].value, 'ON', 'Value!');
            assert.equal(response.context.properties[0].name, 'brightness', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 100, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('Brightness in RgbSingle with power does not go to 0 if dimmer is turned off', async function () {
            const event = await helpers.getSample(
                'PowerController/PowerController.TurnOff.request.json',
            );
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId);
            assert.notEqual(d, undefined);
            assert.equal(d instanceof Device, true);
            let response = await d.handle(event);
            const idLevel = helpers.getConfigForName('DIMMER', helpers.rgbSingleWithPowerConfig());
            const idPower = helpers.getConfigForName('ON_SET', helpers.rgbSingleWithPowerConfig());
            let valueState = await AdapterProvider.getState(idPower);
            assert.equal(valueState, false, 'Value!');
            valueState = await AdapterProvider.getState(idLevel);
            assert.equal(valueState, 100, 'Value!');

            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PowerController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');
            assert.equal(response.context.properties.length, 1, 'Properties Length!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });
    });
});
