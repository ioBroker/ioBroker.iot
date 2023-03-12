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

            let capabilitiesCollections = CapabilityFactory.map(controls);
            assert.notEqual(capabilitiesCollections, undefined)
            assert.equal(Array.isArray(capabilitiesCollections), true)
            assert.equal(capabilitiesCollections.length, 1)
            assert.equal(capabilitiesCollections[0] instanceof capabilities.PowerController, true)
        })

        it('Light Dimmer', async function () {
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

            let capabilitiesCollections = CapabilityFactory.map(controls);
            assert.notEqual(capabilitiesCollections, undefined)
            assert.equal(Array.isArray(capabilitiesCollections), true)
            assert.equal(capabilitiesCollections.length, 2)
            assert.equal(capabilitiesCollections[0] instanceof capabilities.PowerController, true)
            assert.equal(capabilitiesCollections[1] instanceof capabilities.BrightnessController, true)
        })
    })
})