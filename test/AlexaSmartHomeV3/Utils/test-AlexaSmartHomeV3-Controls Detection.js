const assert = require('assert');
const Utils = require('../../../build/lib/AlexaSmartHomeV3/Helpers/Utils');
const helpers = require('../helpers');

// Object from https://github.com/ioBroker/ioBroker.iot/issues/1268
const THERMOSTAT_ID = 'javascript.0.Geraete.Heizung.Temperaturwunsch_Wohnzimmer';

function thermostatObjects(smartName) {
    return {
        [THERMOSTAT_ID]: {
            type: 'state',
            common: {
                read: true,
                write: true,
                max: 25,
                min: 0,
                def: 21,
                name: 'Temperaturwunsch_Wohnzimmer',
                type: 'number',
                role: 'level.temperature',
                unit: '°C',
                smartName,
            },
        },
    };
}

describe('AlexaSmartHomeV3 - Controls Detection', function () {
    it('Thermostat with smartType THERMOSTAT', async function () {
        const adapter = helpers.adapterMock(
            thermostatObjects({ de: 'Temperaturwunsch Wohnzimmer', smartType: 'THERMOSTAT' }),
        );
        const controls = await Utils.controls(adapter, 'de');

        assert.equal(controls.length, 1);
        assert.equal(controls[0].type, 'thermostat');
        assert.equal(controls[0].states.find(s => s.name === 'SET')?.id, THERMOSTAT_ID);
    });

    it('Thermostat without smartType', async function () {
        const adapter = helpers.adapterMock(thermostatObjects({ de: 'Temperaturwunsch Wohnzimmer' }));
        const controls = await Utils.controls(adapter, 'de');

        assert.equal(controls.length, 1);
        assert.equal(controls[0].type, 'thermostat');
        assert.equal(controls[0].states.find(s => s.name === 'SET')?.id, THERMOSTAT_ID);
    });
});
