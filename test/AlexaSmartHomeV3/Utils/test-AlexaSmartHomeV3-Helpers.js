const assert = require('assert');
const Utils = require('../../../build/lib/AlexaSmartHomeV3/Helpers/Utils');
const RateLimiter = require('../../../build/lib/AlexaSmartHomeV3/Helpers/RateLimiter');
const HourlyDeviceRateLimitExceeded = require('../../../build/lib/AlexaSmartHomeV3/Exceptions/HourlyDeviceRateLimitExceeded');
const OverallDailyRateLimitExceeded = require('../../../build/lib/AlexaSmartHomeV3/Exceptions/OverallDailyRateLimitExceeded');
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider');
const helpers = require('../helpers');

async function expectAsyncThrows(promise, exceptionInstance) {
    return promise.then(
        () => {
            throw new Error(`No exception of type ${exceptionInstance} was thrown`);
        },
        e => {
            assert.equal(e instanceof exceptionInstance, true);
        },
    );
}

describe('AlexaSmartHomeV3 - Helpers', function () {
    beforeEach(function () {
        RateLimiter.usage = new Map();
    });

    before(function () {
        AdapterProvider.init(helpers.adapterMock());
    });

    describe('Normalizing from min..max to 0..100', async function () {
        it('Min normilized to 0', async function () {
            const normalized = Utils.normalize_0_100(0, 0, 200);
            assert.equal(normalized, 0);
        });

        it('Max normilized to 100', async function () {
            const normalized = Utils.normalize_0_100(200, 0, 200);
            assert.equal(normalized, 100);
        });

        it('Undefined on min > max', async function () {
            const normalized = Utils.normalize_0_100(200, 200, 0);
            assert.equal(normalized, undefined);
        });

        it('Undefined on min == max', async function () {
            const normalized = Utils.normalize_0_100(200, 200, 200);
            assert.equal(normalized, undefined);
        });

        it('Undefined on value < min', async function () {
            const normalized = Utils.normalize_0_100(1, 100, 200);
            assert.equal(normalized, undefined);
        });

        it('Undefined on value > max', async function () {
            const normalized = Utils.normalize_0_100(201, 100, 200);
            assert.equal(normalized, undefined);
        });

        it('In the range 0..100', async function () {
            let normalized = Utils.normalize_0_100(100, 0, 200);
            assert.equal(normalized, 50);

            normalized = Utils.normalize_0_100(150, 0, 200);
            assert.equal(normalized, 75);
        });
    });

    describe('Denormalizing from 0..100 to min..max', async function () {
        it('0 denormalized to min', async function () {
            const denormalized = Utils.denormalize_0_100(0, 0, 200);
            assert.equal(denormalized, 0);
        });

        it('100 denormalized to max', async function () {
            const denormalized = Utils.denormalize_0_100(100, 0, 200);
            assert.equal(denormalized, 200);
        });

        it('Undefined on min > max', async function () {
            const denormalized = Utils.denormalize_0_100(0, 200, 0);
            assert.equal(denormalized, undefined);
        });

        it('Undefined on min == max', async function () {
            const denormalized = Utils.denormalize_0_100(0, 200, 200);
            assert.equal(denormalized, undefined);
        });

        it('Undefined on normilized < 0', async function () {
            const denormalized = Utils.denormalize_0_100(-1, 0, 200);
            assert.equal(denormalized, undefined);
        });

        it('Undefined on normilized > 100', async function () {
            let denormalized = Utils.denormalize_0_100(101, 0, 200);
            assert.equal(denormalized, undefined);
        });

        it('In the range min..max', async function () {
            let denormalized = Utils.denormalize_0_100(50, 0, 200);
            assert.equal(denormalized, 100);

            denormalized = Utils.denormalize_0_100(75, 0, 200);
            assert.equal(denormalized, 150);
        });
    });

    describe('Distinct by property name', async function () {
        it('All items taken on distinct property values', async function () {
            const list = [
                { id: 1, name: 'one' },
                { id: 2, name: 'two' },
                { id: 3, name: 'three' },
            ];
            const distinct = Utils.distinctByPropertyName(list, 'name');
            assert.equal(JSON.stringify(distinct), JSON.stringify(list));
        });

        it('Last item returned for the same property values', async function () {
            const list = [
                { id: 1, name: 'one' },
                { id: 2, name: 'one' },
                { id: 3, name: 'one' },
            ];
            const distinct = Utils.distinctByPropertyName(list, 'name');
            assert.equal(JSON.stringify(distinct), JSON.stringify([{ id: 3, name: 'one' }]));
        });
    });

    describe('Range ensurance', async function () {
        it('ensureValueInRange0..100 returns 0 for a negative value', async function () {
            const valueInRange = Utils.ensureValueInRange_0_100(-2);
            assert.equal(valueInRange, 0);
        });

        it('ensureValueInRange0..100 returns 100 for a value > 100', async function () {
            const valueInRange = Utils.ensureValueInRange_0_100(102);
            assert.equal(valueInRange, 100);
        });

        it('ensureValueInRange0..100 does not change a value if it is in the range', async function () {
            const valueInRange = Utils.ensureValueInRange_0_100(75);
            assert.equal(valueInRange, 75);
        });

        it('ensureValueInRange returns min for a value smaller than min', async function () {
            const valueInRange = Utils.ensureValueInRange(-2, 1, 3);
            assert.equal(valueInRange, 1);
        });

        it('ensureValueInRange returns max for a value greater than max', async function () {
            const valueInRange = Utils.ensureValueInRange(102, 1, 3);
            assert.equal(valueInRange, 3);
        });

        it('ensureValueInRange does not change a value if it is in the range', async function () {
            const valueInRange = Utils.ensureValueInRange_0_100(2, 1, 3);
            assert.equal(valueInRange, 2);
        });
    });

    describe('Endpoint Id', async function () {
        it('Limited to 256 chars', async function () {
            const input = ''.padEnd(300, 'x');
            const id = Utils.endpointId(input);
            assert.equal(id.length, 256);
        });

        it('Allowed chars are not cut off', async function () {
            let alpha = Array.from(Array(26)).map((e, i) => i + 65);
            const capitals = alpha.map(x => String.fromCharCode(x));
            alpha = Array.from(Array(26)).map((e, i) => i + 97);
            const smalls = alpha.map(x => String.fromCharCode(x));
            const input = `${capitals.join('')}${smalls.join('')}0123456789-_`;
            const id = Utils.endpointId(input);
            assert.equal(id, input);
        });

        it('Invalid chars prepended with hash and replaced', async function () {
            const input = `+++-+++`;
            const id = Utils.endpointId(input);
            assert.equal(id.includes('#'), true);
            assert.equal(id.substring(id.indexOf('#') + 1, id.indexOf('#') + 4), '---');
        });
    });

    describe('Datetime', async function () {
        it('currentHour', async function () {
            const datetime = new Date();
            const currentHour = Utils.currentHour();
            assert.equal(datetime.getDay(), currentHour.getDay());
            assert.equal(datetime.getHours(), currentHour.getHours());
            assert.equal(0, currentHour.getMinutes());
            assert.equal(0, currentHour.getSeconds());
        });

        it('isToday', async function () {
            const datetime = new Date();
            const currentHour = Utils.currentHour();
            assert.equal(Utils.isToday(datetime), true);
            assert.equal(Utils.isToday(currentHour), true);

            datetime.setDate(datetime.getDate() - 1);
            assert.equal(Utils.isToday(datetime), false);
        });

        it('isCurrentHour', async function () {
            const datetime = new Date();
            const currentHour = Utils.currentHour();

            assert.equal(Utils.isCurrentHour(datetime), true);
            assert.equal(Utils.isCurrentHour(currentHour), true);

            assert.equal(Utils.isCurrentHour(Utils.parseISOString(datetime.toISOString())), true);
            assert.equal(Utils.isCurrentHour(Utils.parseISOString(currentHour.toISOString())), true);

            currentHour.setHours(currentHour.getHours() - 1);
            assert.equal(Utils.isCurrentHour(currentHour), false);
        });
    });

    describe('RateLimiter', async function () {
        it('get', async function () {
            const item = RateLimiter.get('endpoint-001');
            const timestamp = Utils.parseISOString(item.timestamp);
            assert.equal(Utils.isToday(timestamp), true);
            assert.equal(Utils.isCurrentHour(timestamp), true);
            assert.equal(item.changeCounter, 0);
        });

        it('incrementAndGet', async function () {
            const item = await RateLimiter.incrementAndGet('endpoint-001');
            const timestamp = Utils.parseISOString(item.timestamp);
            assert.equal(Utils.isToday(timestamp), true);
            assert.equal(Utils.isCurrentHour(timestamp), true);
            assert.equal(item.changeCounter, 1);
        });

        it('incrementAndGet throws exception on exceeding hourly limit', async function () {
            this.timeout(4000);
            RateLimiter.usage.clear();
            for (let i = 0; i < RateLimiter.MAX_DEVICE_STATE_CHANGES_PER_HOUR; i++) {
                await RateLimiter.incrementAndGet('endpoint-001');
            }
            return expectAsyncThrows(RateLimiter.incrementAndGet('endpoint-001'), HourlyDeviceRateLimitExceeded);
        });

        it('incrementAndGet throws exception on exceeding daily limit', async function () {
            this.timeout(4000);
            RateLimiter.usage.clear();
            // 16 * 60 = 960 state changes
            for (let endpoint = 1; endpoint <= 16; endpoint++) {
                for (let i = 0; i < RateLimiter.MAX_DEVICE_STATE_CHANGES_PER_HOUR; i++) {
                    await RateLimiter.incrementAndGet('endpoint-00' + endpoint);
                }
            }
            // plus 40 changes
            for (let i = 0; i < 40; i++) {
                await RateLimiter.incrementAndGet('endpoint-0017');
            }

            // change #1001
            return expectAsyncThrows(RateLimiter.incrementAndGet('endpoint-0017'), OverallDailyRateLimitExceeded);
        });

        it('can store usage in a file', async function () {
            this.timeout(4000);
            RateLimiter.usage.clear();

            assert.equal(RateLimiter.usage.size, 0);
            let value1 = Utils.currentHour().toISOString();
            let value2 = Utils.currentHour().toISOString();
            RateLimiter.usage.set('key-001', value1);
            RateLimiter.usage.set('key-002', value2);

            await RateLimiter.store();

            RateLimiter.usage.clear();

            await RateLimiter.init();

            assert.equal(RateLimiter.usage instanceof Map, true);

            assert.equal(RateLimiter.usage.size, 2);
            assert.equal(true, RateLimiter.usage.has('key-001'));
            assert.equal(value1, RateLimiter.usage.get('key-001'));
            assert.equal(true, RateLimiter.usage.has('key-002'));
            assert.equal(value2, RateLimiter.usage.get('key-002'));
        });
    });

    describe('Closest', async function () {
        it('Returns closest to a trarget value from a list', async function () {
            assert.equal(Utils.closestFromList(5, [4, 9, 15, 6, 2]), 4);
            assert.equal(Utils.closestFromList(1000, [2200, 2700, 4000, 5500, 7000]), 2200);
            assert.equal(Utils.closestFromList(4500, [2200, 2700, 4000, 5500, 7000]), 4000);
            assert.equal(Utils.closestFromList(7000, [2200, 2700, 4000, 5500, 7000]), 7000);
        });
    });

    describe('Enumeration', async function () {
        it('Converts strings to numbers and vice versa', async function () {
            const e = Utils.asEnum(['AUTO', 'ECO', 'OFF']);

            assert.equal(e['AUTO'], 0);
            assert.equal(e['ECO'], 1);
            assert.equal(e['OFF'], 2);
            assert.equal(e[0], 'AUTO');
            assert.equal(e[1], 'ECO');
            assert.equal(e[2], 'OFF');
        });
    });
});
