const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const Directives = require('../../../lib/AlexaSmartHomeV3/Alexa/Directives')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');

describe('AlexaSmartHomeV3 - Discovery', function () {
    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'
        AdapterProvider.init(helpers.adapterMock());
    });

    after(function () {
    });

    describe('Matching', async function () {
        // device manager directives
        it('Discovery', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json')
            const deviceManager = new DeviceManager()
            const directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.Discovery, true)
        })
    })

    describe('Handling', async function () {
        // device manager directives
        it('Discovery of a dimmable light', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json')

            const deviceManager = new DeviceManager()
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [helpers.lightControl(), helpers.dimmerControl()]
            }))

            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 3);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.PowerController");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, "Alexa.BrightnessController");
        })

        it('Discovery of a light', async function () {           
            const event = await helpers.getSample('Discovery/Discovery.request.json')

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [helpers.lightControl()]
            }));

            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.PowerController");
        })

        it('Discovery of a temperature sensor', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json')

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['TEMPERATURE_SENSOR'],
                controls: [helpers.temperatureControl()]
            }));

            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.TemperatureSensor");
        })

        it('Discovery of a thermostat', async function () {
            const event = await helpers.getSample('Discovery/Discovery.request.json')

            const deviceManager = new DeviceManager();
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['TEMPERATURE_SENSOR', 'THERMOSTAT'],
                controls: [helpers.thermostatControl()]
            }));

            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 3);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.TemperatureSensor");

            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, "Alexa.ThermostatController");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].version, "3.2");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].properties.supported.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[2].properties.supported[0].name, "targetSetpoint");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].properties.supported[1].name, "thermostatMode");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].configuration.supportedModes.length, 1);
            assert.equal(response.event.payload.endpoints[0].capabilities[2].configuration.supportedModes[0], "AUTO");
        })
    })
})