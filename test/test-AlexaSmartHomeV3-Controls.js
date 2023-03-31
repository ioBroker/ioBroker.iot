const assert = require('assert');
const helpers = require('./helpers')
const Device = require('../lib/AlexaSmartHomeV3/Device')
const DeviceManager = require('../lib/AlexaSmartHomeV3/DeviceManager')
const Dimmer = require('../lib/AlexaSmartHomeV3/Controls/Dimmer');

class AdapterMock {
    async getObjectViewAsync() {
        return { rows: [] };
    }
    async setStateAsync() {
        return {}
    }

    async setForeignStateAsync() {
        return {}
    }
}

let dimmer;
let adapterMock = new AdapterMock()
let deviceManager = new DeviceManager(adapterMock)
const endpointId = 'endpoint-001'
const friendlyName = 'some-friendly-name'

describe('AlexaSmartHomeV3 - Controls', function () {

    before(function () {
        dimmer = new Dimmer(
            {
                states: [
                    {
                        name: "SET",
                        defaultRole: "level.dimmer",
                        defaultUnit: "%",
                        id: "alias.0.Wohnzimmer.Dimmer.SET",
                        smartName: {
                            smartType: "LIGHT",
                            byON: "80",
                        },
                    },
                ],
                type: "dimmer",
                object: {
                    id: "alias.0.Wohnzimmer.Dimmer",
                    common: {
                        name: {
                            de: "Dimmer",
                        },
                        role: "dimmer",
                        max: 1000,
                        min: 500
                    },
                },
                room: {
                    id: "enum.rooms.living_room",
                    common: {
                        name: {
                            en: "Living Room",
                        },
                        members: [
                            "alias.0.Wohnzimmer.Dimmer",
                            "alias.0.Wohnzimmer.Lampe",
                        ],
                    },
                },
                functionality: undefined,
            },
            adapterMock);

        dimmer_device = new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [dimmer]
        })

        deviceManager.addDevice(dimmer_device)
    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Dimmer', async function () {

        it('Dimmer respects values range on setting brightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            let d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            // (1000 - 500) * 0,75 + 500 = 875
            assert.equal(dimmer_device.controls[0].supported[1].stateProxy.currentValue, 875);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })
    })
})