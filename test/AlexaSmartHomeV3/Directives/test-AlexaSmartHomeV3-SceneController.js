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
let scene;

describe('AlexaSmartHomeV3 - SceneController', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        endpointId = 'endpoint-001';
        friendlyName = 'Living Room Movie';

        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = event => (stateChange = event);

        scene = helpers.sceneControl();

        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName,
                displayCategories: ['SCENE_TRIGGER'],
                controls: [scene],
            }),
        );
    });

    describe('Matching', async function () {
        it('SceneController Activate', async function () {
            const event = require('../Resources/SceneController.Activate.request.json');
            assert.equal(scene.supports(event), true);
        });
    });

    describe('Handling', async function () {
        it('SceneController Activate', async function () {
            const event = require('../Resources/SceneController.Activate.request.json');
            const response = await deviceManager.handleAlexaEvent(event);
            assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');

            assert.equal(response.event.header.namespace, 'Alexa.SceneController', 'Namespace!');
            assert.equal(response.event.header.name, 'ActivationStarted', 'Name!');
            assert.equal(
                response.event.header.correlationToken,
                event.directive.header.correlationToken,
                'Correlation Token!',
            );
            assert.equal(response.event.endpoint.endpointId, endpointId, 'Endpoint Id!');
            assert.equal(response.event.payload.cause.type, 'VOICE_INTERACTION', 'Cause type!');
            assert.ok(response.event.payload.timestamp, 'Timestamp!');

            // Scenes don't have context properties since they don't report state
            assert.equal(response.context, undefined, 'Context should be undefined for scenes');
        });
    });

    describe('Discovery', async function () {
        it('Scene has correct category', function () {
            assert.deepEqual(scene.categories, ['SCENE_TRIGGER']);
        });

        it('Scene has SceneController capability', function () {
            assert.equal(scene.supported.length, 1);
            assert.equal(scene.supported[0].namespace, 'Alexa.SceneController');
        });

        it('SceneController is not retrievable', function () {
            assert.equal(scene.supported[0].retrievable, false);
        });

        it('SceneController is not proactively reported', function () {
            assert.equal(scene.supported[0].proactivelyReported, false);
        });

        it('SceneController has no properties', function () {
            assert.equal(scene.supported[0].properties.length, 0);
        });
    });
});
