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
        it('With No SmartName/Name/No Room/No Functionality', async function () {
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
                            en: "Lamp",
                        },
                        role: "light",
                    },
                },
                type: "light",
            }];


            let name = Helpers.endpointName(controls)
            assert.equal(name, 'Lamp');

            name = Helpers.endpointName(controls, 'de')
            assert.equal(name, 'Lamp');

        })
        it('With SmartName/Name/No Room/No Functionality', async function () {
            let controls = [{
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

            let name = Helpers.endpointName(controls, 'de')
            assert.equal(name, 'Meine Lampe');

            name = Helpers.endpointName(controls, 'de', true)
            assert.equal(name, 'Meine Lampe');

            name = Helpers.endpointName(controls, 'de', true, ' ')
            assert.equal(name, 'Meine Lampe');
        })

        it('With SmartName/Name/With Room/With Functionality', async function () {
            let controls = [{
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

            let name = Helpers.endpointName(controls, 'de')
            assert.equal(name, 'My lamp');

            name = Helpers.endpointName(controls, 'de', true)
            assert.equal(name, 'My lamp');

            name = Helpers.endpointName(controls, 'de', true, ' ')
            assert.equal(name, 'My lamp');

        })

        it('With No SmartName/Name/With Room/With Functionality', async function () {
            let controls = [{
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

            let name = Helpers.endpointName(controls)
            assert.equal(name, 'Living RoomLight');

            name = Helpers.endpointName(controls, 'en', true)
            assert.equal(name, 'LightLiving Room');

            name = Helpers.endpointName(controls, 'de')
            assert.equal(name, 'WohnzimmerLicht');

            name = Helpers.endpointName(controls, 'de', true)
            assert.equal(name, 'LichtWohnzimmer');

            name = Helpers.endpointName(controls, 'de', true, ' ')
            assert.equal(name, 'Licht Wohnzimmer');
        })

        it('With No SmartName/Name/With Room/With No Functionality', async function () {
            let controls = [{
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

            let name = Helpers.endpointName(controls, 'de')
            assert.equal(name, 'Wohnzimmer');

            name = Helpers.endpointName(controls, 'de', true)
            assert.equal(name, 'Wohnzimmer');

            name = Helpers.endpointName(controls, 'de', true, ' ')
            assert.equal(name, 'Wohnzimmer');
        })
    })
})