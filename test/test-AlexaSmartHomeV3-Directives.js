const assert = require('assert');
const helpers = require('./helpers')
const DeviceManager = require('../lib/AlexaSmartHomeV3/DeviceManager')
const Device = require('../lib/AlexaSmartHomeV3/Device')
const Directives = require('../lib/AlexaSmartHomeV3/Alexa/Directives')
const Light = require('../lib/AlexaSmartHomeV3/Controls/Light');
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

let light_dimmer_device;
let light;
let dimmer;
let adapterMock = new AdapterMock()
let deviceManager = new DeviceManager(adapterMock)
const endpointId = 'endpoint-001'
const friendlyName = 'some-friendly-name'

describe('AlexaSmartHomeV3 - Directives', function () {

    before(function () {
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
            },
            adapterMock);
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

        // runs before all tests in this file 
        light_dimmer_device = new Device({
            id: endpointId,
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [light, dimmer]
        })

        light_device = new Device({
            id: '111',
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [light]
        })

        dimmer_device = new Device({
            id: '222',
            friendlyName: friendlyName,
            displayCategries: ['LIGHT'],
            controls: [dimmer]
        })

        deviceManager.addDevice(light_dimmer_device)
    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Matching', async function () {
        // device manager directives
        it('Discovery', async function () {
            let event = await helpers.getSample('Discovery/Discovery.request.json')
            let directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.Discovery, true)
        })

        it('ReportState', async function () {
            let event = await helpers.getSample('StateReport/ReportState.json')
            let directive = deviceManager.matchDirective(event)
            assert.equal(directive instanceof Directives.ReportState, true)
        })

        // device directives
        it('PowerController TurnOff', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
         //   assert.equal(light_dimmer_device.supports(event), true)
            assert.equal(light.supports(event), true)
            assert.equal(dimmer.supports(event), true)
        })
        it('PowerController TurnOn', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
           // assert.equal(light_dimmer_device.supports(event), true)
            assert.equal(light.supports(event), true)
            assert.equal(dimmer.supports(event), true)
        })
        it('BrightnessController AdjustBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            //assert.equal(light_dimmer_device.supports(event), true)
            assert.equal(light.supports(event), false)
            assert.equal(light.canHandle(event), true)
            assert.equal(dimmer.supports(event), true)
        })
        it('BrightnessController SetBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            //assert.equal(light_dimmer_device.supports(event), true)
            assert.equal(light.supports(event), false)
            assert.equal(light.canHandle(event), true)
            assert.equal(dimmer.supports(event), true)
        })
    })

    describe('Handling', async function () {
        // device manager directives
        it('Discovery of dimmable Light', async function () {
            let event = await helpers.getSample('Discovery/Discovery.request.json')
            let directive = new Directives.Discovery()
            let response = await directive.handle(event, deviceManager)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 3);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.PowerController");
            assert.equal(response.event.payload.endpoints[0].capabilities[2].interface, "Alexa.BrightnessController");
        })


        it('Discovery of Light', async function () {
            let event = await helpers.getSample('Discovery/Discovery.request.json')
            let directive = new Directives.Discovery()
            let deviceManagerWithLightOnly = new DeviceManager(adapterMock);

            deviceManagerWithLightOnly.addDevice(new Device({
                id: endpointId,
                friendlyName: friendlyName,
                displayCategries: ['LIGHT'],
                controls: [light]
            }));

            let response = await directive.handle(event, deviceManagerWithLightOnly)
            assert.equal(response.event.header.namespace, "Alexa.Discovery", "Namespace!");
            assert.equal(response.event.header.name, "Discover.Response", "Name!");
            assert.equal(response.event.payload.endpoints[0].endpointId, endpointId, "Endpoint Id!");
            assert.equal(response.event.payload.endpoints[0].friendlyName, friendlyName, "Friendly Name!");

            assert.equal(response.event.payload.endpoints[0].capabilities.length, 2);
            assert.equal(response.event.payload.endpoints[0].capabilities[0].type, "AlexaInterface");
            assert.equal(response.event.payload.endpoints[0].capabilities[0].interface, "Alexa");
            assert.equal(response.event.payload.endpoints[0].capabilities[1].interface, "Alexa.PowerController");
        })

        // device directives
        it('PowerController TurnOff Light', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            response = await light_device.handle(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(light_device.controls[0].supported[0].stateProxy.currentValue, false);
        })

        it('PowerController TurnOff Dimmer', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            response = await dimmer_device.handle(event);
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");

            assert.equal(dimmer_device.controls[0].supported[0].stateProxy.currentValue, 0);
        })


        it('PowerController TurnOff Light+Dimmer', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOff.request.json')
            let d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "OFF", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('PowerController TurnOn Light', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            let response = await light_device.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(light_device.controls[0].supported[0].stateProxy.currentValue, true);

        })

        it('PowerController TurnOn Dimmer', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            let response = await dimmer_device.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(dimmer_device.controls[0].supported[0].stateProxy.currentValue, 80);

        })

        it('PowerController TurnOn Light+Dimmer', async function () {
            let event = await helpers.getSample('PowerController/PowerController.TurnOn.request.json')
            let d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.PowerController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "powerState", "Properties Name!");
            assert.equal(response.context.properties[0].value, "ON", "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })

        it('BrightnessController AdjustBrightness', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.AdjustBrightness.request.json')
            let d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })


        it('BrightnessController SetBrightness Light', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            let response = await light_device.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
            assert.equal(light_device.controls[0].enforced[0].stateProxy.currentValue, true);
        })

        it('BrightnessController SetBrightness Light+Dimmer', async function () {
            let event = await helpers.getSample('BrightnessController/BrightnessController.SetBrightness.request.json')
            let d = deviceManager.endpointById(event.directive.endpoint.endpointId)
            assert.notEqual(d, undefined)
            assert.equal(d instanceof Device, true)

            let response = await d.handle(event)
            assert.equal(response.context.properties[0].namespace, "Alexa.BrightnessController", "Properties Namespace!");
            assert.equal(response.context.properties[0].name, "brightness", "Properties Name!");
            assert.equal(response.context.properties[0].value, 75, "Value!");

            assert.equal(response.event.header.namespace, "Alexa", "Namespace!");
            assert.equal(response.event.header.name, "Response", "Namespace!");
            assert.equal(response.event.header.correlationToken, event.directive.header.correlationToken, "Correlation Token!");
            assert.equal(response.event.endpoint.endpointId, endpointId, "Endpoint Id!");
        })
    })
})