const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider');
const IotProxy = require('../../../lib/AlexaSmartHomeV3/Helpers/IotProxy');
const RateLimiter = require('../../../lib/AlexaSmartHomeV3/Helpers/RateLimiter');


describe('AlexaSmartHomeV3 - LockController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    })

    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => stateChange = event;

        lock = helpers.lockControl()

        deviceManager = new DeviceManager()
        deviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['SMARTLOCK'],
            controls: [lock]
        }))
    });

    after(function () {
    });

    describe('Matching', async function () {

        // device directives
        it('LockController Lock', async function () {
            const event = await helpers.getSample('LockController/LockController.Lock.request.json')
            assert.equal(lock.supports(event), true)
        })
        it('LockController Unlock', async function () {
            const event = await helpers.getSample('LockController/LockController.Unlock.request.json')
            assert.equal(lock.supports(event), true)
        })
    })

    describe('Handling', async function () {
        it('LockController Lock', async function () {
            const event = await helpers.getSample('LockController/LockController.Lock.request.json')
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.LockController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "lockState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "LOCKED", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(deviceManager.devices[0].controls[0].supported[0].properties[0].currentValue, true);
        })

        it('LockController Unlock', async function () {
            const event = await helpers.getSample('LockController/LockController.Unlock.request.json')
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.LockController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "lockState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "UNLOCKED", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(deviceManager.devices[0].controls[0].supported[0].properties[0].currentValue, false);
        })

    })
})