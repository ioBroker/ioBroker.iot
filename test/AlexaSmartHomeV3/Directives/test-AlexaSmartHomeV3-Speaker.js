const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager');
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device');
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider');
const IotProxy = require('../../../build/lib/AlexaSmartHomeV3/Helpers/IotProxy');
const RateLimiter = require('../../../build/lib/AlexaSmartHomeV3/Helpers/RateLimiter');

describe('AlexaSmartHomeV3 - Speaker', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'some-friendly-name';

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => (stateChange = event);

        volume = helpers.volumeControl();

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName: friendlyName,
                controls: [volume],
            }),
        );
    });

    describe('Matching', async function () {
        it('Speaker AdjustVolume', async function () {
            const event = await helpers.getSample('Speaker/Speaker.AdjustVolume.request.json');
            assert.equal(volume.supports(event), true);
        });
        it('Speaker SetVolume', async function () {
            const event = await helpers.getSample('Speaker/Speaker.SetVolume.request.json');
            assert.equal(volume.supports(event), true);
        });
        it('Speaker SetMute', async function () {
            const event = await helpers.getSample('Speaker/Speaker.SetMute.request.json');
            assert.equal(volume.supports(event), true);
        });
    });

    describe('Handling', async function () {
        beforeEach(function () {
            helpers.resetCurrentValues(deviceManager);
        });

        it('Speaker AdjustVolume for volume', async function () {
            const event = await helpers.getSample('Speaker/Speaker.AdjustVolume.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.Speaker', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'volume', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 15, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(deviceManager.endpoints[0].controls[0].allCapabilities[0].properties[1].currentValue, false);
        });

        it('Speaker SetVolume for volume', async function () {
            const event = await helpers.getSample('Speaker/Speaker.SetVolume.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.Speaker', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'volume', 'Properties Name!');
            assert.equal(response.context.properties[0].value, 50, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(deviceManager.endpoints[0].controls[0].allCapabilities[0].properties[1].currentValue, false);
        });

        it('Speaker SetMute for volume', async function () {
            const event = await helpers.getSample('Speaker/Speaker.SetMute.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.context.properties[0].namespace, 'Alexa.Speaker', 'Properties Namespace!');
            assert.equal(response.context.properties[0].name, 'muted', 'Properties Name!');
            assert.equal(response.context.properties[0].value, true, 'Value!');

            assert.equal(response.event.header.namespace, 'Alexa', 'Namespace!');
            assert.equal(response.event.header.name, 'Response', 'Namespace!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');

            assert.equal(deviceManager.endpoints[0].controls[0].allCapabilities[0].properties[0].currentValue, 0);
        });
    });
});
