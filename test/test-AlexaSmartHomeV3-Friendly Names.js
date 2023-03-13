const assert = require('assert')
const Helpers = require('../lib/AlexaSmartHomeV3/Helpers')

describe('AlexaSmartHomeV3 - Friendly Names', function () {

    before(function () {
        // runs before all tests in this file 
    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Single Control', async function () {
        it('With No SmartName/En Name/Room/Functionality', async function () {
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
                object: {
                    id: "alias.0.Wohnzimmer.Lampe",
                    type: undefined,
                    common: {
                        name: {
                            de: "Lampe",
                        },
                        role: "light",
                    },
                },
                type: "light",
            }];

            let name = Helpers.endpointName(controls)
            assert.equal(name, 'PleaseGiveMeAName');

        })
    })
})