const assert = require('node:assert');
const diagnosticsModule = require('../build/lib/connectionDiagnostics');

const ConnectionDiagnostics = diagnosticsModule.default;
const { formatDuration, MAX_IOT_MESSAGE_BYTES } = diagnosticsModule;

const KEEPALIVE_SEC = 60;

function createDiagnostics() {
    const clock = { now: 1_000_000 };
    const diagnostics = new ConnectionDiagnostics(KEEPALIVE_SEC, () => clock.now);
    return { diagnostics, clock };
}

describe('ConnectionDiagnostics', () => {
    it('formats durations', () => {
        assert.strictEqual(formatDuration(850), '850 ms');
        assert.strictEqual(formatDuration(12_500), '12 s');
        assert.strictEqual(formatDuration(303_000), '5 min 3 s');
        assert.strictEqual(formatDuration(7_500_000), '2 h 5 min');
        assert.strictEqual(formatDuration(93_600_000), '1 d 2 h');
    });

    it('detects invalid certificates, if the first attempt fails immediately', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        clock.now += 200;
        const info = diagnostics.onClose();
        assert.strictEqual(info.wasConnected, false);
        assert.strictEqual(info.attempt, 1);
        assert.ok(info.cause.includes('certificates'), info.cause);

        clock.now += 5000;
        const second = diagnostics.onClose();
        assert.strictEqual(second.attempt, 2);
        assert.strictEqual(second.cause, undefined);
        assert.strictEqual(diagnostics.getFailedAttempts(), 2);
    });

    it('reports errors of failed connection attempts', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        clock.now += 3000;
        diagnostics.onError('"getaddrinfo EAI_AGAIN"');
        const info = diagnostics.onClose();
        assert.strictEqual(info.text, 'connection attempt 1 failed: "getaddrinfo EAI_AGAIN"');
        assert.ok(info.cause.includes('EAI_AGAIN'));
    });

    it('describes the connection and has no cause without hints', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        clock.now += 1000;
        assert.strictEqual(diagnostics.onConnect(), null);
        clock.now += 600_000;
        diagnostics.onPacketReceive();
        diagnostics.onPacketSend({ cmd: 'pingreq' });
        diagnostics.onPacketSend({ cmd: 'publish', topic: 'response/client/remote', payload: 'äö' });
        clock.now += 2000;

        const info = diagnostics.onClose();
        assert.strictEqual(info.wasConnected, true);
        assert.strictEqual(info.intentional, false);
        assert.strictEqual(
            info.text,
            'connected for 10 min 2 s, last data received 2 s ago, last sent "response/client/remote" (4 bytes) 2 s ago',
        );
        assert.strictEqual(info.cause, undefined);
    });

    it('detects too big messages', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        diagnostics.onConnect();
        clock.now += 300_000;
        diagnostics.onPacketReceive();
        diagnostics.onPacketSend({
            cmd: 'publish',
            topic: 'response/client/alexa',
            payload: Buffer.alloc(MAX_IOT_MESSAGE_BYTES + 1),
        });
        clock.now += 300;
        const info = diagnostics.onClose();
        assert.ok(info.cause.includes('too big'), info.cause);
        assert.ok(info.cause.includes('response/client/alexa'), info.cause);
    });

    it('does not blame an old big message', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        diagnostics.onConnect();
        diagnostics.onPacketSend({ cmd: 'publish', topic: 'response/x', payload: Buffer.alloc(MAX_IOT_MESSAGE_BYTES + 1) });
        clock.now += 300_000;
        diagnostics.onPacketReceive();
        clock.now += 1000;
        assert.strictEqual(diagnostics.onClose().cause, undefined);
    });

    it('reports connection errors', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        diagnostics.onConnect();
        clock.now += 300_000;
        diagnostics.onPacketReceive();
        diagnostics.onError('"read ECONNRESET"');
        clock.now += 10;
        const info = diagnostics.onClose();
        assert.ok(info.text.includes('error: "read ECONNRESET"'));
        assert.strictEqual(info.cause, 'connection error: "read ECONNRESET"');
    });

    it('detects interrupted network connections by missing data', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        diagnostics.onConnect();
        clock.now += 300_000;
        diagnostics.onPacketReceive();
        clock.now += 95_000;
        const info = diagnostics.onClose();
        assert.ok(info.cause.includes('no data received for 1 min 35 s'), info.cause);
    });

    it('detects a second system with the same account by repeated short connections', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        const causes = [];
        for (let i = 0; i < 3; i++) {
            diagnostics.onConnect();
            clock.now += 8000;
            diagnostics.onPacketReceive();
            clock.now += 100;
            causes.push(diagnostics.onClose().cause);
            clock.now += 5000;
        }
        assert.strictEqual(causes[0], undefined);
        assert.strictEqual(causes[1], undefined);
        assert.ok(causes[2].includes('same account'), causes[2]);
    });

    it('a long connection resets the short connections', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        const connect = durationMs => {
            diagnostics.onConnect();
            clock.now += durationMs;
            diagnostics.onPacketReceive();
            return diagnostics.onClose().cause;
        };
        connect(8000);
        connect(8000);
        connect(120_000);
        assert.strictEqual(connect(8000), undefined);
    });

    it('recognizes intentional closes', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        diagnostics.onConnect();
        clock.now += 1000;
        diagnostics.markIntentionalClose();
        const info = diagnostics.onClose();
        assert.deepStrictEqual(info, { intentional: true, wasConnected: true, attempt: 0, text: 'closed by adapter' });

        // a new start is not intentional anymore
        diagnostics.onStart();
        clock.now += 200;
        assert.strictEqual(diagnostics.onClose().intentional, false);
    });

    it('reports how long the connection was interrupted', () => {
        const { diagnostics, clock } = createDiagnostics();
        diagnostics.onStart();
        diagnostics.onConnect();
        clock.now += 300_000;
        diagnostics.onPacketReceive();
        diagnostics.onClose();
        clock.now += 5000;
        diagnostics.onClose();
        clock.now += 10_000;
        diagnostics.onClose();
        clock.now += 20_000;
        assert.strictEqual(diagnostics.onConnect(), 'after 35 s and 2 failed attempt(s)');
        assert.strictEqual(diagnostics.getFailedAttempts(), 0);
    });
});
