const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');

describe('AlexaSmartHomeV3 - ThermostatController', function () {
    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'

        AdapterProvider.init(helpers.adapterMock());
        thermostat = helpers.thermostatControl();
        deviceManager = new DeviceManager()
        deviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['THERMOSTAT'],
            controls: [thermostat]
        }))
    });

    after(function () {
    });

    describe('Matching', async function () {
        it('ThermostatController AdjustTargetTemperature', async function () {
            const event = helpers.thermostatControllerAdjustTargetTemperatureRequest();
            assert.equal(thermostat.supports(event), true)
        })
        it('ThermostatController SetTargetTemperature', async function () {
            const event = helpers.thermostatControllerSetTargetTemperatureRequest();
            assert.equal(thermostat.supports(event), true)
        })
        it('ThermostatController SetThermostatMode', async function () {
            const event = helpers.thermostatControllerSetThermostatModeRequest();
            assert.equal(thermostat.supports(event), true)
        })

        it('ThermostatController does not match v3 Directive SetThermostatMode', async function () {
            const event = await helpers.getSample('ThermostatController/ThermostatController.SetThermostatMode.request.json')
            assert.equal(thermostat.supports(event), false)
        })

    })

    describe('Handling', async function () {

        beforeEach(function () {
            helpers.resetCurrentValues(deviceManager);
        });

        it('ThermostatController AdjustTargetTemperature', async function () {
            const event = helpers.thermostatControllerAdjustTargetTemperatureRequest();
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ThermostatController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "targetSetpoint", "Properties Name!");
            assert.equal(response.context.properties[0].value.value, 21.5, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('ThermostatController SetTargetTemperature', async function () {
            const event = helpers.thermostatControllerSetTargetTemperatureRequest();
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ThermostatController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "targetSetpoint", "Properties Name!");
            assert.equal(response.context.properties[0].value.value, 20.0, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('ThermostatController SetThermostatMode', async function () {
            const event = helpers.thermostatControllerSetThermostatModeRequest();
            //const event = await helpers.getSample('ThermostatController/ThermostatController.SetThermostatMode.request.json')
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ThermostatController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "thermostatMode", "Properties Name!");
            assert.equal(response.context.properties[0].value, "AUTO", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })
    })
})