const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;
const IotProxy = require('../../../build/lib/AlexaSmartHomeV3/Helpers/IotProxy').default;
const RateLimiter = require('../../../build/lib/AlexaSmartHomeV3/Helpers/RateLimiter').default;

let stateChange;
let endpointId;
let friendlyName;
let deviceManager;
let dimmer;
let light;
let light10_100;
let dimmerWithStoredValueDevice;
let lightDevice;
let dimmerDevice;
let dimmerDeviceWithStoredValue;
let lightDevice10_100;

describe('AlexaSmartHomeV3 - PowerController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => (stateChange = event);

        light = helpers.lightControl();
        dimmer = helpers.dimmerControl();
        dimmerWithStoredValueDevice = helpers.dimmerControlWithStoredValue();
        light10_100 = helpers.lightControl10_100();

        lightDevice = new Device({
            id: 'endpoint-002',
            friendlyName,
            displayCategories: ['LIGHT'],
            controls: [light],
        });

        dimmerDevice = new Device({
            id: 'endpoint-003',
            friendlyName,
            displayCategories: ['LIGHT'],
            controls: [dimmer],
        });

        dimmerDeviceWithStoredValue = new Device({
            id: 'endpoint-004',
            friendlyName,
            displayCategories: ['LIGHT'],
            controls: [dimmerWithStoredValueDevice],
        });

        lightDevice10_100 = new Device({
            id: 'endpoint-005',
            friendlyName,
            displayCategories: ['LIGHT'],
            controls: [light10_100],
        });

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName,
                displayCategories: ['LIGHT'],
                controls: [light, dimmer, dimmerDeviceWithStoredValue],
            }),
        );
    });

    describe('Matching', async function () {
        // device directives
        it('PowerController TurnOff', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            assert.equal(light.supports(event), true);
            assert.equal(dimmer.supports(event), true);
        });
        it('PowerController TurnOn', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            assert.equal(light.supports(event), true);
            assert.equal(dimmer.supports(event), true);
        });
    });

    describe('Handling', async function () {
        it('PowerController TurnOff for a light', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            const response = await lightDevice.handle(event);

            let id = helpers.getConfigForName('SET', helpers.lightConfig());
            let storedValue = await AdapterProvider.getState(id);
            assert.equal(storedValue, false, 'ioBroker.Value!');

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(lightDevice.controls[0].supported[0].properties[0].currentValue, false);
        });

        it('PowerController TurnOff for a dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            const response = await dimmerDevice.handle(event);

            const id = helpers.getConfigForName('SET', helpers.dimmerConfig());
            const storedValue = await AdapterProvider.getState(id);
            // min  = 500, max = 1000
            assert.equal(storedValue, 500, 'ioBroker.Value!');

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(dimmerDevice.controls[0].supported[0].properties[0].currentValue, 0);
        });

        it('PowerController TurnOff for a light+dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            const response = await deviceManager.handleAlexaEvent(event);

            let id = helpers.getConfigForName('SET', helpers.lightConfig());
            let storedValue = await AdapterProvider.getState(id);
            assert.equal(storedValue, false, 'ioBroker.Value!');

            id = helpers.getConfigForName('SET', helpers.dimmerConfig());
            storedValue = await AdapterProvider.getState(id);
            // min  = 500, max = 1000
            assert.equal(storedValue, 500, 'ioBroker.Value!');

            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('PowerController TurnOn Light', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            const response = await lightDevice.handle(event);
            let id = helpers.getConfigForName('SET', helpers.lightConfig());
            let storedValue = await AdapterProvider.getState(id);
            assert.equal(storedValue, true, 'ioBroker.Value!');

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(lightDevice.controls[0].supported[0].properties[0].currentValue, true);
        });

        it('PowerController TurnOn for a dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            const response = await dimmerDevice.handle(event);

            let id = helpers.getConfigForName('SET', helpers.dimmerConfig());
            let storedValue = await AdapterProvider.getState(id);
            // min  = 500, max = 1000, 900 is 80% of the range
            assert.equal(storedValue, 900, 'ioBroker.Value!');

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(dimmerDevice.controls[0].supported[0].properties[0].currentValue, true);
            assert.equal(dimmerDevice.controls[0].supported[1].properties[0].currentValue, 900);
        });

        it('PowerController TurnOn for a light+dimmer', async function () {
            const event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            const response = await deviceManager.handleAlexaEvent(event);

            let id = helpers.getConfigForName('SET', helpers.lightConfig());
            let storedValue = await AdapterProvider.getState(id);
            assert.equal(storedValue, true, 'ioBroker.Value!');

            id = helpers.getConfigForName('SET', helpers.dimmerConfig());
            storedValue = await AdapterProvider.getState(id);
            // min  = 500, max = 1000, 900 is 80% of the range
            assert.equal(storedValue, 900, 'ioBroker.Value!');

            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('PowerController TurnOn for a dimmer with stored value', async function () {
            const id = helpers.getConfigForName('SET', helpers.dimmerConfigWithStoredValue());
            const eventOn = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            await dimmerDeviceWithStoredValue.handle(eventOn);
            let storedValue = await AdapterProvider.getState(id);
            // min  = 500, max = 1000. If no stored value, the dimmer should go to max
            assert.equal(storedValue, 1000, 'ioBroker.Value!');

            // now set the dimmer to 75%
            const eventDimmer = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json');
            await dimmerDeviceWithStoredValue.handle(eventDimmer);

            // and turn it off again
            const eventOff = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            await dimmerDeviceWithStoredValue.handle(eventOff);
            storedValue = await AdapterProvider.getState(id);
            assert.equal(storedValue, 500, 'ioBroker.Value!');

            // now turn it on again - it should go to the stored value of 75%
            const response = await dimmerDeviceWithStoredValue.handle(eventOn);
            storedValue = await AdapterProvider.getState(id);
            // min  = 500, max = 1000, 900 is 80% of the range
            assert.equal(storedValue, 875, 'ioBroker.Value!');

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'ON', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                eventOn.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(dimmerDeviceWithStoredValue.controls[0].supported[0].properties[0].currentValue, true);
            assert.equal(dimmerDeviceWithStoredValue.controls[0].supported[1].properties[0].currentValue, 875);
        });

        it('PowerController TurnOn/Off for a light with number values', async function () {
            const id = helpers.getConfigForName('SET', helpers.lightConfig10_100());
            const eventOn = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            await lightDevice10_100.handle(eventOn);
            let storedValue = await AdapterProvider.getState(id);
            // min  = 500, max = 1000. If no stored value, the dimmer should go to max
            assert.equal(storedValue, 100, 'ioBroker.Value!');

            // and turn it off
            const eventOff = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            const response = await lightDevice10_100.handle(eventOff);
            storedValue = await AdapterProvider.getState(id);
            assert.equal(storedValue, 10, 'ioBroker.Value!');

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                eventOn.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(lightDevice10_100.controls[0].supported[0].properties[0].currentValue, 10);
        });

        it('Numeric PowerController TurnOn/Off', async function () {
            const eventOn = await helpers.getSample('PowerController/PowerController.TurnOn.request.json');
            const devManager = new DeviceManager();
            const idSet = helpers.getConfigForName('SET', helpers.powerNumericConfig());
            const idActual = helpers.getConfigForName('ACTUAL', helpers.powerNumericConfig());
            // set states to 0/1
            await AdapterProvider.setState(idSet, 0);
            await AdapterProvider.setState(idActual, 0);

            const light = helpers.powerNumericControl();
            devManager.addDevice(
                new Device({
                    id: endpointId,
                    friendlyName,
                    displayCategories: ['LIGHT'],
                    controls: [light],
                }),
            );
            let response = await light.handle(eventOn);

            let value = await AdapterProvider.getState(idSet);
            assert.equal(value, 1, 'ioBroker.Value!');
            await AdapterProvider.setState(idActual, value);

            // and turn it off
            const eventOff = await helpers.getSample('PowerController/PowerController.TurnOff.request.json');
            response = await light.handle(eventOff);
            value = await AdapterProvider.getState(idSet);
            assert.equal(value, 0, 'ioBroker.Value!');

            assert.equal(response.context.properties[0].namespace, 'Alexa.PowerController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'powerState', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 'OFF', 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                eventOn.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });
    });
});
