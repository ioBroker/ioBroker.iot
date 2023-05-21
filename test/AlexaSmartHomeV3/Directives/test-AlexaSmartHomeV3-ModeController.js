const assert = require('assert');
const helpers = require('../helpers')
const DeviceManager = require('../../../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../../../lib/AlexaSmartHomeV3/Device')
const AdapterProvider = require('../../../lib/AlexaSmartHomeV3/Helpers/AdapterProvider')
const IotProxy = require('../../../lib/AlexaSmartHomeV3/Helpers/IotProxy');
const RateLimiter = require('../../../lib/AlexaSmartHomeV3/Helpers/RateLimiter');

describe('AlexaSmartHomeV3 - ModeController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    })

    before(function () {
        endpointId = 'endpoint-001'
        friendlyName = 'some-friendly-name'

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => stateChange = event;

        gate = helpers.gateControl()

        deviceManager = new DeviceManager()
        deviceManager.addDevice(new Device({
            id: endpointId,
            friendlyName: friendlyName,
            controls: [gate]
        }))
    });

    after(function () {
    });

    describe('Matching', async function () {
        it('ModeController SetMode', async function () {
            const event = helpers.modeControllerSetGatePositionRequest();
            assert.equal(gate.supports(event), true)
        })
    })

    describe('Handling', async function () {

        beforeEach(function () {
            helpers.resetCurrentValues(deviceManager);
        });


        it('ModeController SetPosition for a gate', async function () {
            const event = helpers.modeControllerSetGatePositionRequest();
            const response = await deviceManager.handleAlexaEvent(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.ModeController", "Properties Namespace!");
            assert.equal(response.context.properties[0].instance, "Gate.Position", "Properties Name!");
            assert.equal(response.context.properties[0].name, "mode", "Properties Name!");
            assert.equal(response.context.properties[0].value, 'Gate.Position.Closed', "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(deviceManager.endpointById(endpointId).controls[0].supported[0].properties[0].currentValue, false);
        })
    })
})