const assert = require('assert')
const helpers = require('./helpers')
const Device = require('../lib/AlexaSmartHomeV3/Device')
const DeviceManager = require('../lib/AlexaSmartHomeV3/DeviceManager')
const Light = require('../lib/AlexaSmartHomeV3/Controls/Light')
const Dimmer = require('../lib/AlexaSmartHomeV3/Controls/Dimmer')
const AdapterProvider = require('../lib/AlexaSmartHomeV3/AdapterProvider')

class AdapterMock {
    constructor() {
        this.log = {
            silly: this.nop,
            debug: this.nop,
            info: this.nop,
            warn: this.nop,
            error: this.nop
        }
    }

    nop() {
        // left blank intentionally
    }

    async getObjectViewAsync() {
        return { rows: [] };
    }
    async setStateAsync() {
        return {}
    }

    async setForeignStateAsync() {
        return {}
    }

    async getForeignStateAsync(id) {
        if (id.includes('Lampe')) {
            return { val: true } 
        }

        if (id.includes('Dimmer')) {
            return { val: 875 }
        }
    }

}

let dimmer
let light
let adapterMock = new AdapterMock()
const endpointId = 'endpoint-001'
const friendlyName = 'some-friendly-name'

describe('AlexaSmartHomeV3 - Controls', function () {

    before(function () {
        AdapterProvider.init(adapterMock);

        light = new Light(
            {
                states: [
                    {
                        name: "SET",
                        defaultRole: "switch.light",
                        id: "alias.0.Wohnzimmer.Lampe.SET",
                        smartName: {
                            smartType: "LIGHT",
                        },
                    },
                ],
                type: "light",
                object: {
                    id: "alias.0.Wohnzimmer.Lampe",
                    common: {
                        name: {
                            de: "Lampe",
                        },
                        role: "light",
                        smartName: {
                            de: "Meine Lampe",
                        },
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
                functionality: {
                    id: "enum.functions.light",
                    common: {
                        name: {
                            en: "Light",
                        },
                        members: [
                            "alias.0.Wohnzimmer.Lampe",
                            "0_userdata.0.Blinds",
                        ]
                    }
                }
            });

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
            });
    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Light', async function () {
        it('Light reports state', async function () {
            let deviceManager = new DeviceManager(adapterMock);

            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [light]
            }));

            let event = await helpers.getSample('StateReport/ReportState.json')
            let directive = deviceManager.matchDirective(event)

            let response = await directive.handle(event, deviceManager)
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 1);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController");
            assert.equal(response.context.properties[0].name, "powerState");
            assert.equal(response.context.properties[0].value, "ON");
        })
    })

    describe('Dimmer', async function () {
        it('Dimmer respects values range on setting brightness', async function () {

            let deviceManager = new DeviceManager(adapterMock);
            deviceManager.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [dimmer]
            }));

            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            let d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            // (1000 - 500) * 0,75 + 500 = 875
            assert.equal(d.controls[0].supported[1].stateProxy.currentValue, 875);

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('Dimmer reports state', async function () {
            let deviceManagerWithDimmer = new DeviceManager(adapterMock);
            deviceManagerWithDimmer.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [dimmer]
            }));

            let event = await helpers.getSample('StateReport/ReportState.json')
            let directive = deviceManagerWithDimmer.matchDirective(event)

            let response = await directive.handle(event, deviceManagerWithDimmer)
            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "StateReport", "Name!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Name!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(response.context.properties.length, 2);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController");
            assert.equal(response.context.properties[0].name, "powerState");
            assert.equal(response.context.properties[0].value, "ON");

            assert.equal(response.context.properties[1].namespace, "Alexa.BrightnessController");
            assert.equal(response.context.properties[1].name, "brightness");
            assert.equal(response.context.properties[1].value, 75);
        })
    })
})