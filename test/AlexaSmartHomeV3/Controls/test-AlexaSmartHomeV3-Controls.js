const assert = require('assert')
const helpers = require('../helpers')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider')

describe('AlexaSmartHomeV3 - Controls', function () {

    before(function () {
        AdapterProvider.init(helpers.adapterMock());
    });

    after(function () {
    });

    describe('Light', async function () {
        before(function () {
            dimmer = helpers.dimmerControl()
            light = helpers.lightControl()
            endpointId = 'endpoint-001'
            friendlyName = 'some-friendly-name'

            lightDeviceManager = new DeviceManager();
            lightDeviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [light]
            }));

            dimmerDeviceManager = new DeviceManager();
            dimmerDeviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [dimmer]
            }));
        });

        it('Light reports state', async function () {

            const event = await helpers.getSample('StateReport/ReportState.json')
            const response = await lightDeviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController");
            assert.equal(response.context.properties[0].name, "powerState");
            assert.equal(response.context.properties[0].value, "ON");
        })
    })

    describe('Dimmer', async function () {
        it('Dimmer respects values range on setting brightness', async function () {

            const event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            const d = dimmerDeviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)
            const response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            // (1000 - 500) * 0,75 + 500 = 875
            assert.equal(d.controls[0].supported[1].properties[0].currentValue, 875);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('Dimmer reports state', async function () {

            const event = await helpers.getSample('StateReport/ReportState.json')
            const response = await dimmerDeviceManager.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController");
            assert.equal(response.context.properties[0].name, "powerState");
            assert.equal(response.context.properties[0].value, "ON");

            assert.equal(response.context.properties[1].namespace, "Alexa.BrightnessController");
            assert.equal(response.context.properties[1].name, "brightness");
            assert.equal(response.context.properties[1].value, 75);
        })
    })

    describe('AirConditioner', async function () {

        before(function () {

            endpointId = 'endpoint-001'
            friendlyName = 'some-friendly-name'

            deviceManager = new DeviceManager();
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                controls: [helpers.airConditionControl()]
            }));
        })

        it('AirConditioner allows to set mode', async function () {

            const event = helpers.thermostatControllerSetThermostatModeRequest();

            for (const mode of ['AUTO', 'HEAT', 'ECO', 'OFF']) {
                event.directive.payload.thermostatMode.value = mode;
                const d = deviceManager.endpointById(event.directive.endpoint.endpointId)
                assert.notEqual(d, undefined)
                assert.equal(d instanceof Device, true)
                let response = await d.handle(event)
                assert.equal(response.context.properties[0].namespace, "Alexa.ThermostatController", "Properties Namespace!");
                assert.equal(response.context.properties[0].name, "thermostatMode", "Properties Name!");
                assert.equal(response.context.properties[0].value, mode, "Value!");

                // check the powerState 
                assert.equal(d.controls[0].supported[2].properties[0].currentValue, mode !== 'OFF');

                assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
                assert.equal(response.event.header.name, "Response", "Namespace!");
                assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
                assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            }
        })

        it('AirCondition reports state', async function () {

            const event = await helpers.getSample('StateReport/ReportState.json')
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 4);

            assert.equal(response.context.properties[0].namespace, "Alexa.TemperatureSensor");
            assert.equal(response.context.properties[0].name, "temperature");
            assert.equal(response.context.properties[0].value.value, 23.5);
            assert.equal(response.context.properties[0].value.scale, "CELSIUS");

            assert.equal(response.context.properties[1].namespace, "Alexa.ThermostatController");
            assert.equal(response.context.properties[1].name, "targetSetpoint");
            assert.equal(response.context.properties[1].value.value, 23.5);
            assert.equal(response.context.properties[1].value.scale, "CELSIUS");

            assert.equal(response.context.properties[2].namespace, "Alexa.ThermostatController");
            assert.equal(response.context.properties[2].name, "thermostatMode");
            assert.equal(response.context.properties[3].value, "OFF");

            assert.equal(response.context.properties[3].namespace, "Alexa.PowerController");
            assert.equal(response.context.properties[3].name, "powerState");
            assert.equal(response.context.properties[3].value, "OFF");
        })

    })

    describe('Hue', async function () {

        before(function () {

            endpointId = 'endpoint-001'
            friendlyName = 'some-friendly-name'

            deviceManager = new DeviceManager();
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                controls: [helpers.hueControl()]
            }));
        })

        it('Hue allows to change color', async function () {

            const event = await helpers.getSample('ColorController/ColorController.SetColor.request.json')
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)
            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ColorController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "color", "Properties Name!");
            assert.equal(response.context.properties[0].value.hue, 350.5);
            assert.equal(response.context.properties[0].value.saturation, 0.7138);
            assert.equal(response.context.properties[0].value.brightness, 0.6524);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('Hue allows to set color temperature', async function () {

            const event = await helpers.getSample('ColorTemperatureController/ColorTemperatureController.SetColorTemperature.request.json')
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)
            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ColorTemperatureController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "colorTemperatureInKelvin", "Properties Name!");
            assert.equal(response.context.properties[0].value, 5000);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('Hue allows to increase color temperature', async function () {

            const event = await helpers.getSample('ColorTemperatureController/ColorTemperatureController.IncreaseColorTemperature.request.json')
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            // set current temp to 2200
            d.controls[0].supported[2].properties[0].currentValue = 2200;

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ColorTemperatureController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "colorTemperatureInKelvin", "Properties Name!");
            assert.equal(response.context.properties[0].value, 2700);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('Hue allows to decrease color temperature', async function () {

            const event = await helpers.getSample('ColorTemperatureController/ColorTemperatureController.DecreaseColorTemperature.request.json')
            const d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            // set current temp to 2200
            d.controls[0].supported[2].properties[0].currentValue = 2200;

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ColorTemperatureController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "colorTemperatureInKelvin", "Properties Name!");
            assert.equal(response.context.properties[0].value, 2200);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

    })
})