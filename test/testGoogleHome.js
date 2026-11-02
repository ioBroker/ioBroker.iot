const assert = require('node:assert');
const axios = require('axios');
const GoogleHome = require('../build/lib/googleHome').default;

class AdapterMock {
    constructor(objects) {
        const nop = () => {};
        this.log = { silly: nop, debug: nop, info: nop, warn: nop, error: nop };
        this.config = { login: 'user@example.com', functionFirst: false, concatWord: '' };
        this.version = '0.0.0';
        this.objects = {};
        this.states = {};
        Object.keys(objects).forEach(id => {
            this.objects[id] = { _id: id, type: 'state', common: objects[id].common, native: {} };
            if (objects[id].val !== undefined) {
                this.states[id] = { val: objects[id].val, ack: true, ts: objects[id].ts || 1 };
            }
        });
    }

    async getForeignObjectAsync(id) {
        return this.objects[id] || null;
    }

    async getForeignStateAsync(id) {
        return this.states[id] || null;
    }

    async setForeignStateAsync(id, val) {
        this.states[id] = { val, ack: false, ts: Date.now() };
    }
}

function createGoogleHome(objects, devices) {
    const adapter = new AdapterMock(objects);
    const googleHome = new GoogleHome(adapter, { key: 'key' });
    googleHome.urlKeyOk = true;
    devices.forEach(device => {
        googleHome.smartDevices[device.id] = device;
        googleHome.smartDevicesSentToGoogle[device.id] = device;
    });
    return { adapter, googleHome };
}

function device(id, customData, attributes) {
    return {
        id,
        traits: [],
        attributes: attributes || { colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 } },
        customData,
    };
}

async function query(googleHome, id) {
    const response = await googleHome.query('request', [{ id }]);
    return response.payload.devices[id];
}

async function execute(googleHome, id, command, params) {
    return googleHome.execute('request', [{ devices: [{ id }], execution: [{ command, params }] }]);
}

describe('GoogleHome', function () {
    let reported;
    const post = axios.post;

    before(function () {
        axios.post = async (url, json) => {
            reported.push(json);
            return { status: 200, data: {} };
        };
    });

    after(function () {
        axios.post = post;
    });

    beforeEach(function () {
        reported = [];
    });

    describe('query', function () {
        it('converts the brightness from the range of the state into %', async function () {
            const { googleHome } = createGoogleHome(
                { 'zigbee.0.lamp.brightness': { common: { min: 0, max: 254 }, val: 127 } },
                [
                    device('lamp', {
                        set_brightness: 'zigbee.0.lamp.brightness',
                        get_brightness: 'zigbee.0.lamp.brightness',
                    }),
                ],
            );
            const state = await query(googleHome, 'lamp');
            assert.strictEqual(state.brightness, 50);
        });

        it('converts the color temperature in mired into Kelvin', async function () {
            const { googleHome } = createGoogleHome(
                { 'zigbee.0.lamp.colortemp': { common: { unit: 'mired', min: 153, max: 500 }, val: 250 } },
                [device('lamp', { get_color_temperature: 'zigbee.0.lamp.colortemp' })],
            );
            const state = await query(googleHome, 'lamp');
            assert.deepStrictEqual(state.color, { temperatureK: 4000 });
        });

        it('converts the color temperature in % into Kelvin (0 % is the coldest)', async function () {
            const { googleHome } = createGoogleHome(
                { 'tradfri.0.lamp.colorTemperature': { common: { unit: '%', min: 0, max: 100 }, val: 100 } },
                [device('lamp', { get_color_temperature: 'tradfri.0.lamp.colorTemperature' })],
            );
            const state = await query(googleHome, 'lamp');
            assert.deepStrictEqual(state.color, { temperatureK: 2000 });
        });

        it('keeps the color temperature within the range of the device', async function () {
            const { googleHome } = createGoogleHome({ 'hue.0.lamp.ct': { common: {}, val: 10010 } }, [
                device('lamp', { get_color_temperature: 'hue.0.lamp.ct' }),
            ]);
            const state = await query(googleHome, 'lamp');
            assert.deepStrictEqual(state.color, { temperatureK: 9000 });
        });

        it('converts hue and saturation into RGB, independent of the brightness', async function () {
            const { googleHome } = createGoogleHome(
                {
                    'hue.0.lamp.hue': { common: { min: 0, max: 360 }, val: 120 },
                    'hue.0.lamp.sat': { common: { min: 0, max: 100 }, val: 100 },
                    'hue.0.lamp.bri': { common: { min: 0, max: 100 }, val: 30 },
                },
                [
                    device('lamp', {
                        get_color_hue: 'hue.0.lamp.hue',
                        get_color_saturation: 'hue.0.lamp.sat',
                        get_brightness: 'hue.0.lamp.bri',
                    }),
                ],
            );
            const state = await query(googleHome, 'lamp');
            assert.deepStrictEqual(state.color, { spectrumRgb: 0x00ff00 });
            assert.strictEqual(state.brightness, 30);
        });

        it('reports only the color set last, if the light has RGB and a color temperature', async function () {
            const { googleHome } = createGoogleHome(
                {
                    'light.rgb': { common: {}, val: '#ff0000', ts: 2000 },
                    'light.ct': { common: {}, val: 4000, ts: 1000 },
                },
                [device('lamp', { get_color_spectrumRGB: 'light.rgb', get_color_temperature: 'light.ct' })],
            );
            const state = await query(googleHome, 'lamp');
            assert.deepStrictEqual(state.color, { spectrumRgb: 0xff0000 });
        });

        it('reports the actual position of a blind', async function () {
            const { googleHome } = createGoogleHome(
                {
                    'alias.0.blind.SET': { common: { role: 'level.blind', min: 0, max: 100 }, val: 0 },
                    'alias.0.blind.ACTUAL': { common: { role: 'value.blind', min: 0, max: 100 }, val: 40 },
                },
                [],
            );
            const blind = googleHome.processBlind(
                'alias.0.blind',
                {
                    states: [
                        { name: 'SET', id: 'alias.0.blind.SET' },
                        { name: 'ACTUAL', id: 'alias.0.blind.ACTUAL' },
                    ],
                },
                'Blind',
                '',
                '',
                { common: { name: 'Blind' } },
            );
            assert.strictEqual(blind.customData.set_openPercent, 'alias.0.blind.SET');
            googleHome.smartDevices[blind.id] = blind;
            const state = await query(googleHome, blind.id);
            assert.strictEqual(state.openPercent, 40);
        });
    });

    describe('reports a state change', function () {
        it('of a color temperature without the internal attribute name', async function () {
            const { googleHome } = createGoogleHome({ 'hue.0.lamp.ct': { common: {}, val: 3000 } }, [
                device('lamp', { get_color_temperature: 'hue.0.lamp.ct' }),
            ]);
            await googleHome.updateState('hue.0.lamp.ct', { val: 4000, ack: true, ts: 5 });
            assert.deepStrictEqual(reported, [{ lamp: { color: { temperatureK: 4000 } } }]);
        });

        it('of one part of an RGB color together with the other parts', async function () {
            const { googleHome } = createGoogleHome(
                {
                    'zigbee.0.lamp.r': { common: { min: 0, max: 255 }, val: 255 },
                    'zigbee.0.lamp.g': { common: { min: 0, max: 255 }, val: 0 },
                    'zigbee.0.lamp.b': { common: { min: 0, max: 255 }, val: 0 },
                },
                [
                    device('lamp', {
                        get_color_R: 'zigbee.0.lamp.r',
                        get_color_G: 'zigbee.0.lamp.g',
                        get_color_B: 'zigbee.0.lamp.b',
                    }),
                ],
            );
            await googleHome.updateState('zigbee.0.lamp.g', { val: 128, ack: true, ts: 5 });
            assert.deepStrictEqual(reported, [{ lamp: { color: { spectrumRgb: 0xff8000 } } }]);
        });

        it('only if the value for Google changed', async function () {
            const { googleHome } = createGoogleHome(
                {
                    'zigbee.0.lamp.state': { common: {}, val: true },
                    'zigbee.0.lamp.brightness': { common: { min: 0, max: 254 }, val: 254 },
                },
                [
                    device('lamp', {
                        get_on: 'zigbee.0.lamp.state',
                        get_brightness: 'zigbee.0.lamp.brightness',
                    }),
                ],
            );
            await googleHome.updateState('zigbee.0.lamp.brightness', { val: 127, ack: true, ts: 5 });
            await googleHome.updateState('zigbee.0.lamp.brightness', { val: 127, ack: true, ts: 6 });
            assert.deepStrictEqual(reported, [{ lamp: { on: true, brightness: 50 } }]);
        });
    });

    describe('executes', function () {
        it('the brightness in the range of the state', async function () {
            const { adapter, googleHome } = createGoogleHome(
                { 'zigbee.0.lamp.brightness': { common: { min: 0, max: 254 }, val: 0 } },
                [
                    device('lamp', {
                        set_brightness: 'zigbee.0.lamp.brightness',
                        get_brightness: 'zigbee.0.lamp.brightness',
                    }),
                ],
            );
            const response = await execute(googleHome, 'lamp', 'action.devices.commands.BrightnessAbsolute', {
                brightness: 50,
            });
            assert.strictEqual(adapter.states['zigbee.0.lamp.brightness'].val, 127);
            assert.deepStrictEqual(response.payload.commands[0].states, { brightness: 50 });
        });

        it('the color temperature in mired and in %', async function () {
            const { adapter, googleHome } = createGoogleHome(
                {
                    'zigbee.0.lamp.colortemp': { common: { unit: 'mired', min: 153, max: 500 } },
                    'tradfri.0.lamp.colorTemperature': { common: { unit: '%', min: 0, max: 100 } },
                },
                [
                    device('mired', { set_color_temperature: 'zigbee.0.lamp.colortemp' }),
                    device(
                        'percent',
                        { set_color_temperature: 'tradfri.0.lamp.colorTemperature' },
                        {
                            colorTemperatureRange: { temperatureMinK: 2200, temperatureMaxK: 4000 },
                        },
                    ),
                ],
            );
            let response = await execute(googleHome, 'mired', 'action.devices.commands.ColorAbsolute', {
                color: { temperature: 4000 },
            });
            assert.strictEqual(adapter.states['zigbee.0.lamp.colortemp'].val, 250);
            assert.deepStrictEqual(response.payload.commands[0].states, { color: { temperatureK: 4000 } });

            response = await execute(googleHome, 'percent', 'action.devices.commands.ColorAbsolute', {
                color: { temperature: 2200 },
            });
            assert.strictEqual(adapter.states['tradfri.0.lamp.colorTemperature'].val, 100);
        });

        it('a color on hue and saturation without changing the brightness', async function () {
            const { adapter, googleHome } = createGoogleHome(
                {
                    'hue.0.lamp.hue': { common: { min: 0, max: 360 }, val: 0 },
                    'hue.0.lamp.sat': { common: { min: 0, max: 254 }, val: 0 },
                    'hue.0.lamp.bri': { common: { min: 0, max: 100 }, val: 30 },
                },
                [
                    device('lamp', {
                        set_color_hue: 'hue.0.lamp.hue',
                        set_color_saturation: 'hue.0.lamp.sat',
                        set_brightness: 'hue.0.lamp.bri',
                    }),
                ],
            );
            await execute(googleHome, 'lamp', 'action.devices.commands.ColorAbsolute', {
                color: { spectrumRGB: 0x0000ff },
            });
            assert.strictEqual(adapter.states['hue.0.lamp.hue'].val, 240);
            assert.strictEqual(adapter.states['hue.0.lamp.sat'].val, 254);
            assert.strictEqual(adapter.states['hue.0.lamp.bri'].val, 30);
        });

        it('with an own convert function instead of the automatic conversion', async function () {
            const { adapter, googleHome } = createGoogleHome(
                { 'zigbee.0.lamp.brightness': { common: { min: 0, max: 254 }, val: 0 } },
                [
                    {
                        ...device('lamp', { set_brightness: 'zigbee.0.lamp.brightness' }),
                        conv2iob: { 'zigbee.0.lamp.brightness': 'return value * 2;' },
                    },
                ],
            );
            await execute(googleHome, 'lamp', 'action.devices.commands.BrightnessAbsolute', { brightness: 50 });
            assert.strictEqual(adapter.states['zigbee.0.lamp.brightness'].val, 100);
        });
    });
});
