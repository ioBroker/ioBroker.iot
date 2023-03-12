const assert = require('assert')
const capabilities = require('../lib/AlexaSmartHomeV3/Capabilities')
const CapabilityFactory = require('../lib/AlexaSmartHomeV3/CapabilityFactory')


describe('AlexaSmartHomeV3 - Control Mapping', function () {

    before(function () {
        // runs before all tests in this file 
    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Single Control Mapping', async function () {
        it('Light Switch', async function () {
            let controls = [{
                states: [
                    {
                        type: "boolean",
                        write: true,
                        name: "SET",
                        defaultRole: "switch.light",
                        id: "alias.0.Wohnzimmer.Lampe.SET",
                        smartName: {
                            smartType: "LIGHT",
                        },
                    },
                ],
                type: "light",
            }];

            let capabilityCollection = CapabilityFactory.map(controls);
            assert.notEqual(capabilityCollection, undefined)
            assert.equal(Array.isArray(capabilityCollection), true)
            assert.equal(capabilityCollection.length, 1)
            assert.equal(capabilityCollection[0] instanceof capabilities.PowerController, true)
        })

        it('Light Dimmer with SET state only', async function () {
            let controls = [{
                states: [
                    {
                        indicator: false,
                        type: "number",
                        write: true,
                        name: "SET",
                        required: true,
                        defaultRole: "level.dimmer",
                        defaultUnit: "%",
                        id: "alias.0.Wohnzimmer.Dimmer.SET",
                        smartName: {
                            smartType: "LIGHT",
                            byON: "80",
                        },
                    },
                ],
                type: "dimmer"
            }];

            let capabilityCollection = CapabilityFactory.map(controls);
            assert.notEqual(capabilityCollection, undefined)
            assert.equal(Array.isArray(capabilityCollection), true)
            assert.equal(capabilityCollection.length, 2)
            assert.equal(capabilityCollection[0] instanceof capabilities.PowerController, true)
            assert.equal(capabilityCollection[1] instanceof capabilities.BrightnessController, true)

            let power = capabilityCollection[0]
            assert.equal(power.stateProxies.length, 1)
            assert.equal(power.stateProxies[0].alexaValue(45), capabilities.PowerController.ON)
            assert.equal(power.stateProxies[0].alexaValue(100), capabilities.PowerController.ON)
            assert.equal(power.stateProxies[0].alexaValue(0), capabilities.PowerController.OFF)
            assert.equal(power.stateProxies[0].value(capabilities.PowerController.ON), 80)
            assert.equal(power.stateProxies[0].value(capabilities.PowerController.OFF), 0)


            let brightness = capabilityCollection[1]
            assert.equal(brightness.stateProxies.length, 1)
            assert.equal(brightness.stateProxies[0].alexaValue(50), 50)
            assert.equal(brightness.stateProxies[0].value(75), 75)
        })

        it('Light Dimmer with SET and ON_SET states', async function () {
            let controls = [{
                states: [
                    {
                        indicator: false,
                        type: "number",
                        write: true,
                        name: "SET",
                        required: true,
                        defaultRole: "level.dimmer",
                        defaultUnit: "%",
                        id: "alias.0.Wohnzimmer.Dimmer.SET",
                        smartName: {
                            smartType: "LIGHT",
                            byON: "80",
                        },
                    },
                    {
                        indicator: false,
                        type: "boolean",
                        write: true,
                        name: "ON_SET",
                        required: false,
                        defaultRole: "switch.light",
                        defaultUnit: "",
                        id: "alias.0.Wohnzimmer.Dimmer.ON_SET",
                    },
                ],
                type: "dimmer"
            }];

            let capabilityCollection = CapabilityFactory.map(controls);
            assert.notEqual(capabilityCollection, undefined)
            assert.equal(Array.isArray(capabilityCollection), true)
            assert.equal(capabilityCollection.length, 2)
            assert.equal(capabilityCollection[0] instanceof capabilities.PowerController, true)
            assert.equal(capabilityCollection[1] instanceof capabilities.BrightnessController, true)

            let power = capabilityCollection[0]
            assert.equal(power.stateProxies.length, 1)
            assert.equal(power.stateProxies[0].alexaValue(45), capabilities.PowerController.ON)
            assert.equal(power.stateProxies[0].alexaValue(100), capabilities.PowerController.ON)
            assert.equal(power.stateProxies[0].alexaValue(0), capabilities.PowerController.OFF)
            assert.equal(power.stateProxies[0].value(capabilities.PowerController.ON), true)
            assert.equal(power.stateProxies[0].value(capabilities.PowerController.OFF), false)

            let brightness = capabilityCollection[1]
            assert.equal(brightness.stateProxies.length, 1)
            assert.equal(brightness.stateProxies[0].alexaValue(50), 50)
            assert.equal(brightness.stateProxies[0].value(75), 75)
        })

    })
})