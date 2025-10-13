const assert = require('assert');
const Utils = require('../../../build/lib/AlexaSmartHomeV3/Helpers/Utils');
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;
const helpers = require('../helpers');

describe('AlexaSmartHomeV3 - Friendly Names', function () {
    before(function () {
        // runs before all tests in this file
        AdapterProvider.init(helpers.adapterMock());
    });

    describe('By SmartName', async function () {
        it('SmartName as Object', async function () {
            const smartName = {
                en: 'Light',
                de: 'Licht',
            };

            let name = Utils.stringify(smartName);
            assert.equal(name, 'Light');

            name = Utils.stringify(smartName, 'de');
            assert.equal(name, 'Licht');
        });

        it('SmartName as String', async function () {
            const smartName = 'Light';

            let name = Utils.stringify(smartName);
            assert.equal(name, 'Light');

            name = Utils.stringify(smartName, 'de');
            assert.equal(name, 'Light');
        });
    });

    describe('By Room and Function', async function () {
        it('With Room and Function', async function () {
            const control = {
                room: {
                    id: 'enum.rooms.living_room',
                    common: {
                        name: {
                            en: 'Living Room',
                        },
                    },
                },
                functionality: {
                    id: 'enum.functions.light',
                    common: {
                        name: {
                            en: 'Light',
                        },
                    },
                },
            };

            let name = Utils.friendlyNameByRoomAndFunctionName(control, 'de');
            assert.equal(name, 'Wohnzimmer Licht');

            name = Utils.friendlyNameByRoomAndFunctionName(control);
            assert.equal(name, 'Living Room Light');
        });
    });
});
