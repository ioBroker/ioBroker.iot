const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;
const IotProxy = require('../../../build/lib/AlexaSmartHomeV3/Helpers/IotProxy').default;
const RateLimiter = require('../../../build/lib/AlexaSmartHomeV3/Helpers/RateLimiter').default;

const endpointId = 'endpoint-001';
let deviceManager;
let blinds;

function rangeControllerRequest(name, payload) {
    return {
        directive: {
            header: {
                namespace: 'Alexa.RangeController',
                instance: 'Blind.Lift',
                name,
                messageId: 'Unique version 4 UUID',
                correlationToken: 'Opaque correlation token',
                payloadVersion: '3',
            },
            endpoint: {
                scope: { type: 'BearerToken', token: 'OAuth2.0 bearer token' },
                endpointId,
                cookie: {},
            },
            payload,
        },
    };
}

describe('AlexaSmartHomeV3 - Blind', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        AdapterProvider.init(helpers.adapterMock());
        IotProxy.publishStateChange = () => {};

        blinds = helpers.blindsControl();
        deviceManager = new DeviceManager();
        deviceManager.addDevice(
            new Device({
                id: endpointId,
                friendlyName: 'some-friendly-name',
                displayCategories: ['INTERIOR_BLIND'],
                controls: [blinds],
            }),
        );
    });

    describe('Discovery', function () {
        it('RangeController "Blind.Lift" with open/close semantics', function () {
            const capability = blinds.supported[0].alexaResponse;
            assert.equal(capability.interface, 'Alexa.RangeController');
            assert.equal(capability.instance, 'Blind.Lift');
            assert.deepEqual(capability.configuration.supportedRange, {
                minimumValue: 0,
                maximumValue: 100,
                precision: 1,
            });
            assert.equal(capability.configuration.unitOfMeasure, 'Alexa.Unit.Percent');
            assert.equal(capability.capabilityResources.friendlyNames[0].value.assetId, 'Alexa.Setting.Opening');

            const close = capability.semantics.actionMappings.find(m => m.actions.includes('Alexa.Actions.Close'));
            const open = capability.semantics.actionMappings.find(m => m.actions.includes('Alexa.Actions.Open'));
            assert.deepEqual(close.directive, { name: 'SetRangeValue', payload: { rangeValue: 0 } });
            assert.deepEqual(open.directive, { name: 'SetRangeValue', payload: { rangeValue: 100 } });
        });
    });

    describe('Matching', function () {
        it('RangeController directives', function () {
            assert.equal(blinds.supports(rangeControllerRequest('SetRangeValue', { rangeValue: 0 })), true);
        });
        it('no PercentageController directives', async function () {
            const event = await helpers.getSample(
                'PercentageController/PercentageController.SetPercentage.request.json',
            );
            assert.equal(blinds.supports(event), false);
        });
    });

    describe('Handling', function () {
        // payloads as Alexa (de-DE) sends them for the utterance in the comment
        const cases = [
            ['close (Alexa.Actions.Close)', 'SetRangeValue', { rangeValue: 0 }, 0], // "schließe Rollo"
            ['open (Alexa.Actions.Open)', 'SetRangeValue', { rangeValue: 100 }, 100], // "öffne Rollo"
            ['set to 30 %', 'SetRangeValue', { rangeValue: 30 }, 30], // "stelle Rollo auf dreißig Prozent"
            ['lower by 10 %', 'AdjustRangeValue', { rangeValueDelta: -10, rangeValueDeltaDefault: false }, 20], // "senke Rollo um zehn Prozent"
            ['down without amount', 'AdjustRangeValue', { rangeValueDelta: -1, rangeValueDeltaDefault: true }, 0], // "Rollo runter"
            ['up without amount', 'AdjustRangeValue', { rangeValueDelta: 1, rangeValueDeltaDefault: true }, 100], // "Rollo hoch"
            ['all the way down', 'AdjustRangeValue', { rangeValueDelta: -100, rangeValueDeltaDefault: false }, 0], // "fahre Rollo ganz runter"
        ];

        for (const [title, name, payload, expected] of cases) {
            it(`${title} -> ${expected}`, async function () {
                const response = await deviceManager.handleAlexaEvent(rangeControllerRequest(name, payload));
                assert.equal(await helpers.validateAnswer(response), null, 'Schema should be valid');
                assert.equal(response.context.properties[0].namespace, 'Alexa.RangeController', 'Namespace!');
                assert.equal(response.context.properties[0].instance, 'Blind.Lift', 'Instance!');
                assert.equal(response.context.properties[0].value, expected, 'Value!');

                const state = await AdapterProvider.get().getForeignStateAsync('alias.0.Wohnzimmer.Blinds.SET');
                assert.equal(state.val, expected, 'State!');
            });
        }
    });
});
