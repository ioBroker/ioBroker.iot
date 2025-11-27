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
let range;

describe('AlexaSmartHomeV3 - RangeController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => (stateChange = event);

        range = helpers.sliderControl();

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName,
                displayCategories: ['OTHER'],
                controls: [range],
            }),
        );
    });

    describe('Matching', async function () {
        // device directives
        it('RangeController Set', async function () {
            const event = await helpers.getSample('RangeController/RangeController.SetRangeValue.request.json');
            assert.equal(range.supports(event), true);
        });
        it('RangeController Adjust', async function () {
            const event = await helpers.getSample('RangeController/RangeController.AdjustRangeValue.request.json');
            assert.equal(range.supports(event), true);
        });
    });

    describe('Handling', async function () {
        it('RangeController Set', async function () {
            const event = await helpers.getSample('RangeController/RangeController.SetRangeValue.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.context.properties[0].namespace, 'Alexa.RangeController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'rangeValue', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 120, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(deviceManager.devices[0].controls[0].supported[0].properties[0].currentValue, 120);
        });

        it('RangeController Adjust', async function () {
            const event = await helpers.getSample('RangeController/RangeController.AdjustRangeValue.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
            assert.equal(response.context.properties[0].namespace, 'Alexa.RangeController', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'rangeValue', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 115, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(deviceManager.devices[0].controls[0].supported[0].properties[0].currentValue, 115);
        });
    });
});
