const assert = require('assert');
const helpers = require('../helpers');
const DeviceManager = require('../../../build/lib/AlexaSmartHomeV3/DeviceManager').default;
const Device = require('../../../build/lib/AlexaSmartHomeV3/Device').default;
const AdapterProvider = require('../../../build/lib/AlexaSmartHomeV3/Helpers/AdapterProvider').default;
const IotProxy = require('../../../build/lib/AlexaSmartHomeV3/Helpers/IotProxy').default;
const DiscoveryReporter = require('../../../build/lib/AlexaSmartHomeV3/Helpers/DiscoveryReporter').default;

let reports;
let publishDiscoveryReport;
let device;

function lamp(name) {
    return new Device({ id: name, friendlyName: name, controls: [helpers.lightControl()] });
}

function dimmer(name) {
    return new Device({ id: name, friendlyName: name, controls: [helpers.dimmerControl()] });
}

async function discover(deviceManager) {
    const event = await helpers.getSample('Discovery/Discovery.request.json');
    return deviceManager.handleAlexaEvent(event);
}

function reportsNamed(name) {
    return reports.filter(r => r.event.header.name === name);
}

describe('AlexaSmartHomeV3 - DiscoveryReporter', function () {
    before(function () {
        publishDiscoveryReport = IotProxy.publishDiscoveryReport;
        device = IotProxy.device;
        // capture what would go to the cloud
        IotProxy.publishDiscoveryReport = report => reports.push(report);
        IotProxy.device = {};
    });

    after(function () {
        IotProxy.publishDiscoveryReport = publishDiscoveryReport;
        IotProxy.device = device;
    });

    beforeEach(function () {
        reports = [];
        AdapterProvider.init(helpers.adapterMock());
    });

    it('Reports nothing before the first discovery', async function () {
        await new DiscoveryReporter().sync([lamp('Kitchen'), lamp('Hall')]);
        assert.equal(reports.length, 0);
    });

    it('Remembers the discovered devices', async function () {
        const deviceManager = new DeviceManager();
        deviceManager.addDevice(lamp('Kitchen'));
        deviceManager.addDevice(lamp('Hall'));
        await discover(deviceManager);

        const state = await AdapterProvider.get().getStateAsync(DiscoveryReporter.STATE_ID);
        assert.deepEqual(Object.keys(JSON.parse(state.val)).sort(), ['Hall', 'Kitchen']);

        // nothing changed since the discovery
        await new DiscoveryReporter().sync(deviceManager.endpoints);
        assert.equal(reports.length, 0);
    });

    it('Deletes a device that is gone', async function () {
        const deviceManager = new DeviceManager();
        deviceManager.addDevice(lamp('Kitchen'));
        deviceManager.addDevice(lamp('Hall'));
        await discover(deviceManager);

        const reporter = new DiscoveryReporter();
        await reporter.sync([lamp('Kitchen')]);

        assert.equal(reports.length, 1);
        const report = reports[0];
        assert.equal(report.event.header.namespace, 'Alexa.Discovery');
        assert.equal(report.event.header.name, 'DeleteReport');
        assert.equal(report.event.header.payloadVersion, '3');
        assert.deepEqual(report.event.payload.endpoints, [{ endpointId: 'Hall' }]);
        assert.equal(report.event.payload.scope.type, 'BearerToken');

        // told once only
        await reporter.sync([lamp('Kitchen')]);
        assert.equal(reports.length, 1);

        // also after a restart
        await new DiscoveryReporter().sync([lamp('Kitchen')]);
        assert.equal(reports.length, 1);
    });

    it('Adds a new device and updates a changed one', async function () {
        const deviceManager = new DeviceManager();
        deviceManager.addDevice(lamp('Kitchen'));
        deviceManager.addDevice(lamp('Hall'));
        await discover(deviceManager);

        // Hall is a dimmer now, Garden is new
        await new DiscoveryReporter().sync([lamp('Kitchen'), dimmer('Hall'), lamp('Garden')]);

        assert.equal(reportsNamed('DeleteReport').length, 0);
        const added = reportsNamed('AddOrUpdateReport');
        assert.equal(added.length, 1);
        const endpoints = added[0].event.payload.endpoints;
        assert.deepEqual(endpoints.map(e => e.endpointId).sort(), ['Garden', 'Hall']);
        // described the same way as on discovery
        const hall = endpoints.find(e => e.endpointId === 'Hall');
        assert.ok(hall.capabilities.find(c => c.interface === 'Alexa.BrightnessController'));
        assert.equal(hall.friendlyName, 'Hall');
    });

    it('A renamed device is deleted and added', async function () {
        const deviceManager = new DeviceManager();
        deviceManager.addDevice(lamp('Living room light'));
        await discover(deviceManager);

        await new DiscoveryReporter().sync([lamp('Living room lamp')]);

        assert.deepEqual(reportsNamed('DeleteReport')[0].event.payload.endpoints, [
            { endpointId: 'Living_room_light' },
        ]);
        assert.deepEqual(
            reportsNamed('AddOrUpdateReport')[0].event.payload.endpoints.map(e => e.endpointId),
            ['Living_room_lamp'],
        );
    });

    it('Deletes nothing if no device was found at all', async function () {
        const deviceManager = new DeviceManager();
        deviceManager.addDevice(lamp('Kitchen'));
        await discover(deviceManager);

        const reporter = new DiscoveryReporter();
        await reporter.sync([]);
        assert.equal(reports.length, 0);

        // and still knows what Alexa has
        await reporter.sync([]);
        await reporter.sync([lamp('Hall')]);
        assert.deepEqual(reportsNamed('DeleteReport')[0].event.payload.endpoints, [{ endpointId: 'Kitchen' }]);
    });

    it('Waits for the collection and the end of a pause', async function () {
        const deviceManager = new DeviceManager();
        deviceManager.addDevice(lamp('Kitchen'));
        deviceManager.addDevice(lamp('Hall'));
        await discover(deviceManager);

        const delay = DiscoveryReporter.SYNC_DELAY_MS;
        DiscoveryReporter.SYNC_DELAY_MS = 10;
        const reporter = new DiscoveryReporter();
        try {
            // devices are being collected: half a list must not delete anything
            reporter.schedule(
                () => null,
                () => false,
            );
            await new Promise(resolve => setTimeout(resolve, 50));
            assert.equal(reports.length, 0);

            // paused: retried till the pause is over
            let paused = true;
            reporter.schedule(
                () => [lamp('Kitchen')],
                () => paused,
            );
            await new Promise(resolve => setTimeout(resolve, 50));
            assert.equal(reports.length, 0);
            paused = false;
            await new Promise(resolve => setTimeout(resolve, 50));
            assert.deepEqual(reportsNamed('DeleteReport')[0].event.payload.endpoints, [{ endpointId: 'Hall' }]);
        } finally {
            reporter.destroy();
            DiscoveryReporter.SYNC_DELAY_MS = delay;
        }
    });

    it('Splits big reports', function () {
        const endpoints = [];
        for (let i = 0; i < 250; i++) {
            endpoints.push({ endpointId: `id${i}` });
        }
        const chunks = DiscoveryReporter.chunks(endpoints);
        assert.deepEqual(
            chunks.map(c => c.length),
            [100, 100, 50],
        );

        const big = [];
        for (let i = 0; i < 5; i++) {
            big.push({ endpointId: `id${i}`, description: 'x'.repeat(40_000) });
        }
        const bigChunks = DiscoveryReporter.chunks(big);
        assert.deepEqual(
            bigChunks.map(c => c.length),
            [2, 2, 1],
        );
        bigChunks.forEach(c => assert.ok(JSON.stringify(c).length < 128 * 1024));
    });

    it('IotProxy puts the client ID into the payload scope', function () {
        let published;
        const publish = IotProxy.publish;
        IotProxy.publish = (topic, message) => (published = { topic, message });
        IotProxy.login = 'user@example.com';
        IotProxy.stateChangedTopic = 'response/user_example_com/changeReport';
        try {
            publishDiscoveryReport.call(IotProxy, DiscoveryReporter.report('DeleteReport', [{ endpointId: 'x' }]));
        } finally {
            IotProxy.publish = publish;
        }
        assert.equal(published.topic, 'response/user_example_com/changeReport');
        assert.equal(published.message.event.payload.scope.token, 'user@example.com');
        assert.equal(published.message.event.endpoint, undefined);
    });
});
