const assert = require('assert');
const helpers = require('./helpers')
const Utils = require('./../lib/AlexaSmartHomeV3/Helpers/Utils')

describe('AlexaSmartHomeV3 - Helpers', function () {


    before(function () {
    });

    after(function () {
    });

    describe('Normalizing from min..max to 0..100', async function () {

        it('Min normilized to 0', async function () {
            const normalized = Utils.normalize_0_100(0, 0, 200);
            assert.equal(normalized, 0)
        })

        it('Max normilized to 100', async function () {
            const normalized = Utils.normalize_0_100(200, 0, 200);
            assert.equal(normalized, 100)
        })

        it('Undefined on min > max', async function () {
            const normalized = Utils.normalize_0_100(200, 200, 0);
            assert.equal(normalized, undefined)
        })

        it('Undefined on min == max', async function () {
            const normalized = Utils.normalize_0_100(200, 200, 200);
            assert.equal(normalized, undefined)
        })

        it('Undefined on value < min', async function () {
            const normalized = Utils.normalize_0_100(1, 100, 200);
            assert.equal(normalized, undefined)
        })


        it('Undefined on value > max', async function () {
            const normalized = Utils.normalize_0_100(201, 100, 200);
            assert.equal(normalized, undefined)
        })


        it('In the range 0..100', async function () {
            let normalized = Utils.normalize_0_100(100, 0, 200);
            assert.equal(normalized, 50)

            normalized = Utils.normalize_0_100(150, 0, 200);
            assert.equal(normalized, 75)
        })
    })

    describe('Denormalizing from 0..100 to min..max', async function () {

        it('0 denormalized to min', async function () {
            const denormalized = Utils.denormalize_0_100(0, 0, 200);
            assert.equal(denormalized, 0)
        })

        it('100 denormalized to max', async function () {
            const denormalized = Utils.denormalize_0_100(100, 0, 200);
            assert.equal(denormalized, 200)
        })

        it('Undefined on min > max', async function () {
            const denormalized = Utils.denormalize_0_100(0, 200, 0);
            assert.equal(denormalized, undefined)
        })

        it('Undefined on min == max', async function () {
            const denormalized = Utils.denormalize_0_100(0, 200, 200);
            assert.equal(denormalized, undefined)
        })

        it('Undefined on normilized < 0', async function () {
            const denormalized = Utils.denormalize_0_100(-1, 0, 200);
            assert.equal(denormalized, undefined)
        })

        it('Undefined on normilized > 100', async function () {
            let denormalized = Utils.denormalize_0_100(101, 0, 200);
            assert.equal(denormalized, undefined)
        })


        it('In the range min..max', async function () {
            let denormalized = Utils.denormalize_0_100(50, 0, 200);
            assert.equal(denormalized, 100)

            denormalized = Utils.denormalize_0_100(75, 0, 200);
            assert.equal(denormalized, 150)
        })
    })

    describe('Distinct by property name', async function () {
        it('All items taken on distinct property values', async function () {
            const list = [{ id: 1, name: 'one' }, { id: 2, name: 'two' }, { id: 3, name: 'three' }]
            const distinct = Utils.distinctByPropertyName(list, 'name')
            assert.equal(JSON.stringify(distinct), JSON.stringify(list));
        })

        it('Last item returned for the same property values', async function () {
            const list = [{ id: 1, name: 'one' }, { id: 2, name: 'one' }, { id: 3, name: 'one' }]
            const distinct = Utils.distinctByPropertyName(list, 'name')
            assert.equal(JSON.stringify(distinct), JSON.stringify([{ id: 3, name: 'one' }]));
        })
    })
})