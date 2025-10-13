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

describe('AlexaSmartHomeV3 - PercentageController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => (stateChange = event);

        blinds = helpers.blindsControl();

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategories: ['INTERIOR_BLIND'],
                controls: [blinds],
            }),
        );
    });

    describe('Matching', async function () {
        it('PercentageController AdjustPercentage', async function () {
            const event = await helpers.getSample(
                'PercentageController/PercentageController.AdjustPercentage.request.json',
            );
            assert.equal(blinds.supports(event), true);
        });
        it('PercentageController SetPercentage', async function () {
            const event = await helpers.getSample(
                'PercentageController/PercentageController.SetPercentage.request.json',
            );
            assert.equal(blinds.supports(event), true);
        });
    });

    describe('Handling', async function () {
        beforeEach(function () {
            helpers.resetCurrentValues(deviceManager);
        });

        it('PercentageController AdjustPercentage for blinds', async function () {
            const event = await helpers.getSample(
                'PercentageController/PercentageController.AdjustPercentage.request.json',
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PercentageController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'percentage', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 5, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
        });

        it('PercentageController SetPercentage for blinds', async function () {
            const event = await helpers.getSample(
                'PercentageController/PercentageController.SetPercentage.request.json',
            );
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(
                response.context.properties[0].namespace,
                'Alexa.PercentageController',
                'Properties Namespace!',
            );
            assert.equal(response.context.properties[0].name, 'percentage', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 74, 'Value!');

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
