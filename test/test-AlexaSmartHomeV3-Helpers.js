const assert = require('assert');
const helpers = require('./helpers')
const alexaHelpers = require('./../lib/AlexaSmartHomeV3/Helpers')

describe('AlexaSmartHomeV3 - Helpers', function () {


    before(function () {

    });

    after(function () {
        // runs after all tests in this file
    });

    describe('Normalizing from min..max to 0..100', async function () {

        it('Min normilized to 0', async function () {
            let normalized = alexaHelpers.normalize_0_100(0, 0, 200);
            assert.equal(normalized, 0)
        })

        it('Max normilized to 100', async function () {
            let normalized = alexaHelpers.normalize_0_100(200, 0, 200);
            assert.equal(normalized, 100)
        })

        it('Undefined on min > max', async function () {
            let normalized = alexaHelpers.normalize_0_100(200, 200, 0);
            assert.equal(normalized, undefined)
        })

        it('Undefined on min == max', async function () {
            let normalized = alexaHelpers.normalize_0_100(200, 200, 200);
            assert.equal(normalized, undefined)
        })

        it('Undefined on value < min', async function () {
            let normalized = alexaHelpers.normalize_0_100(1, 100, 200);
            assert.equal(normalized, undefined)
        })


        it('Undefined on value > max', async function () {
            let normalized = alexaHelpers.normalize_0_100(201, 100, 200);
            assert.equal(normalized, undefined)
        })


        it('In the range 0..100', async function () {
            let normalized = alexaHelpers.normalize_0_100(100, 0, 200);
            assert.equal(normalized, 50)

            normalized = alexaHelpers.normalize_0_100(150, 0, 200);
            assert.equal(normalized, 75)
        })
    })

    describe('Denormalizing from 0..100 to min..max', async function () {

        it('0 denormalized to min', async function () {
            let denormalized = alexaHelpers.denormalize_0_100(0, 0, 200);
            assert.equal(denormalized, 0)
        })

        it('100 denormalized to max', async function () {
            let denormalized = alexaHelpers.denormalize_0_100(100, 0, 200);
            assert.equal(denormalized, 200)
        })

        it('Undefined on min > max', async function () {
            let denormalized = alexaHelpers.denormalize_0_100(0, 200, 0);
            assert.equal(denormalized, undefined)
        })

        it('Undefined on min == max', async function () {
            let denormalized = alexaHelpers.denormalize_0_100(0, 200, 200);
            assert.equal(denormalized, undefined)
        })

        it('Undefined on normilized < 0', async function () {
            let denormalized = alexaHelpers.denormalize_0_100(-1, 0, 200);
            assert.equal(denormalized, undefined)
        })

        it('Undefined on normilized > 100', async function () {
            let denormalized = alexaHelpers.denormalize_0_100(101, 0, 200);
            assert.equal(denormalized, undefined)
        })


        it('In the range min..max', async function () {
            let denormalized = alexaHelpers.denormalize_0_100(50, 0, 200);
            assert.equal(denormalized, 100)

            denormalized = alexaHelpers.denormalize_0_100(75, 0, 200);
            assert.equal(denormalized, 150)
        })
    })
})