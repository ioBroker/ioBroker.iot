const assert = require('assert')
const Utils = require('../lib/AlexaSmartHomeV3/Helpers/Utils')

describe('AlexaSmartHomeV3 - Friendly Names', function () {

    before(function () {
        // runs before all tests in this file 
    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Single Control', async function () {
        it('With No SmartName/Name/No Room/No Functionality', async function () {
            const controls = [{
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
                            en: "Lamp",
                        },
                        role: "light",
                    },
                },
                type: "light",
            }];


            let name = Utils.endpointName(controls)
            assert.equal(name, 'Lamp');

            name = Utils.endpointName(controls, 'de')
            assert.equal(name, 'Lamp');

        })
        it('With SmartName/Name/No Room/No Functionality', async function () {
            const controls = [{
                states: [
                    {
                        indicator: false,
                        type: "boolean",
                        write: true,
                        name: "SET",
                        required: true,
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
                    type: "channel",
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
            }];

            let name = Utils.endpointName(controls, 'de')
            assert.equal(name, 'Meine Lampe');

            name = Utils.endpointName(controls, 'de', true)
            assert.equal(name, 'Meine Lampe');

            name = Utils.endpointName(controls, 'de', true, ' ')
            assert.equal(name, 'Meine Lampe');
        })

        it('With SmartName/Name/With Room/With Functionality', async function () {
            const controls = [{
                states: [
                    {
                        indicator: false,
                        type: "boolean",
                        write: true,
                        name: "SET",
                        required: true,
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
                    type: "channel",
                    common: {
                        name: {
                            de: "Lampe",
                        },
                        role: "light",
                        smartName: {
                            en: "My lamp",
                        },
                    },
                },
                room: {
                    id: "enum.rooms.living_room",
                    common: {
                        name: {
                            en: "Living Room"
                        },
                    }
                },
                functionality: {
                    id: "enum.functions.light",
                    common: {
                        name: {
                            en: "Light",
                        },
                    }
                },
            }];

            let name = Utils.endpointName(controls, 'de')
            assert.equal(name, 'My lamp');

            name = Utils.endpointName(controls, 'de', true)
            assert.equal(name, 'My lamp');

            name = Utils.endpointName(controls, 'de', true, ' ')
            assert.equal(name, 'My lamp');

        })

        it('With No SmartName/Name/With Room/With Functionality', async function () {
            const controls = [{
                states: [
                    {
                        indicator: false,
                        type: "boolean",
                        write: true,
                        name: "SET",
                        required: true,
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
                    type: "channel",
                    common: {
                        name: {
                            de: "Lampe",
                        },
                        role: "light"
                    },
                },
                room: {
                    id: "enum.rooms.living_room",
                    common: {
                        name: {
                            en: "Living Room"
                        },
                    }
                },
                functionality: {
                    id: "enum.functions.light",
                    common: {
                        name: {
                            en: "Light",
                        },
                    }
                },
            }];

            let name = Utils.endpointName(controls)
            assert.equal(name, 'Living Room Light');

            name = Utils.endpointName(controls, 'en', true)
            assert.equal(name, 'Light Living Room');

            name = Utils.endpointName(controls, 'de')
            assert.equal(name, 'Wohnzimmer Licht');

            name = Utils.endpointName(controls, 'de', true)
            assert.equal(name, 'Licht Wohnzimmer');

            name = Utils.endpointName(controls, 'de', true, 'x')
            assert.equal(name, 'Licht x Wohnzimmer');
        })

        it('With No SmartName/Name/With Room/With No Functionality', async function () {
            const controls = [{
                states: [
                    {
                        indicator: false,
                        type: "boolean",
                        write: true,
                        name: "SET",
                        required: true,
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
                    type: "channel",
                    common: {
                        name: {
                            de: "Lampe",
                        },
                        role: "light"
                    },
                },
                room: {
                    id: "enum.rooms.living_room",
                    common: {
                        name: {
                            en: "Living Room",
                            de: "Wohnzimmer",
                        },
                    }
                }
            }];

            let name = Utils.endpointName(controls, 'de')
            assert.equal(name, 'Wohnzimmer');

            name = Utils.endpointName(controls, 'de', true)
            assert.equal(name, 'Wohnzimmer');

            name = Utils.endpointName(controls, 'de', true, 'x')
            assert.equal(name, 'Wohnzimmer');
        })
    })
})