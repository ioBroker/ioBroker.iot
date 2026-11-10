const assert = require('assert');
const { randomBytes } = require('node:crypto');
const { validateDiscoveryResponse } = require('../../build/lib/AlexaSmartHomeV3/Helpers/DiscoveryValidator');
const { getPackedSize } = require('../../build/lib/iotMessage');

const LIMIT = 127 * 1024;

function capability(iface, property) {
    return {
        type: 'AlexaInterface',
        interface: iface,
        version: '3',
        properties: {
            supported: [{ name: property }],
            proactivelyReported: false,
            retrievable: true,
        },
    };
}

function endpoint(id, name, extra) {
    return {
        endpointId: id,
        friendlyName: name,
        description: `Device ${name} from ioBroker`,
        manufacturerName: 'ioBroker',
        displayCategories: ['LIGHT'],
        capabilities: [
            { type: 'AlexaInterface', interface: 'Alexa', version: '3' },
            capability('Alexa.PowerController', 'powerState'),
            capability('Alexa.BrightnessController', 'brightness'),
            capability('Alexa.EndpointHealth', 'connectivity'),
        ],
        ...extra,
    };
}

function discoveryResponse(endpoints) {
    return {
        event: {
            header: {
                namespace: 'Alexa.Discovery',
                name: 'Discover.Response',
                payloadVersion: '3',
                messageId: 'a7f1b8c2-0000-4000-8000-000000000000',
            },
            payload: { endpoints },
        },
    };
}

function logMock() {
    const messages = [];
    const add = message => messages.push(message);
    return { messages, silly: add, debug: add, info: add, warn: add, error: add };
}

function random(length) {
    return randomBytes(length).toString('base64').substring(0, length);
}

describe('AlexaSmartHomeV3 - DiscoveryValidator', function () {
    it('Keeps all endpoints if the response is over the limit unpacked, but fits packed', function () {
        const endpoints = [];
        for (let i = 1; i <= 250; i++) {
            endpoints.push(endpoint(`alias.0.Rooms.Room${i}.Lamp${i}`, `Lamp ${i}`));
        }
        const response = discoveryResponse(endpoints);
        const json = JSON.stringify(response);
        assert.ok(Buffer.byteLength(json) > LIMIT, 'test data must be bigger than the limit unpacked');
        assert.ok(getPackedSize(json) < LIMIT, 'test data must fit the limit packed');

        const log = logMock();
        validateDiscoveryResponse(response, log);

        assert.equal(response.event.payload.endpoints.length, 250);
        assert.ok(!log.messages.some(m => m.includes('to fit AWS IoT message size limit')));
    });

    it('Removes endpoints if the response is over the limit even packed', function () {
        const endpoints = [];
        for (let i = 1; i <= 250; i++) {
            // random content cannot be compressed well
            endpoints.push(
                endpoint(random(250), `Lamp ${random(110)}`, {
                    description: random(120),
                    manufacturerName: random(120),
                }),
            );
        }
        const original = endpoints.slice();
        const response = discoveryResponse(endpoints);
        assert.ok(getPackedSize(JSON.stringify(response)) > LIMIT, 'test data must be bigger than the limit packed');

        const log = logMock();
        validateDiscoveryResponse(response, log);

        const count = response.event.payload.endpoints.length;
        assert.ok(count > 1 && count < 250, `unexpected count ${count}`);
        const json = JSON.stringify(response);
        assert.ok(getPackedSize(json) <= LIMIT, 'reduced response must fit the limit packed');

        // the largest possible number of endpoints is kept
        const oneMore = discoveryResponse(original.slice(0, count + 1));
        assert.ok(getPackedSize(JSON.stringify(oneMore)) > LIMIT, 'one more endpoint must not fit');

        assert.ok(log.messages.some(m => m.includes(`reduced from 250 to ${count} endpoints`)));
    });
});
