const assert = require('node:assert');
const fs = require('node:fs');
const { join } = require('node:path');
const { createIotDevice } = require('../build/lib/createIotDevice');

describe('createIotDevice', () => {
    let originalExistsSync;
    let calls;

    beforeEach(() => {
        originalExistsSync = fs.existsSync;
        calls = [];
        fs.existsSync = path => {
            calls.push(path);
            return originalExistsSync(path);
        };
    });

    afterEach(() => {
        fs.existsSync = originalExistsSync;
    });

    function create(options) {
        try {
            const device = createIotDevice({
                clientId: `test-${Date.now()}`,
                host: '127.0.0.1',
                port: 1,
                debug: false,
                ...options,
            });
            device.on('error', () => {});
            device.end(true);
        } catch (error) {
            // The dummy certificates are rejected when the TLS stream is created. That happens after the
            // certificate options were checked with fs.existsSync, which is what these tests are about.
            assert.match(String(error), /PEM|key|certificate/i);
        }
    }

    it('does not pass undefined paths to fs.existsSync when certificates are Buffers (DEP0187)', () => {
        create({
            privateKey: Buffer.from('key'),
            clientCert: Buffer.from('cert'),
            caCert: Buffer.from('ca'),
        });
        assert.deepStrictEqual(calls, []);
    });

    it('still checks real paths', () => {
        const caPath = join(__dirname, '..', 'keys', 'root-CA.crt');
        create({
            privateKey: Buffer.from('key'),
            clientCert: Buffer.from('cert'),
            caPath,
        });
        assert.deepStrictEqual(calls, [caPath]);
    });

    it('restores fs.existsSync', () => {
        const spy = fs.existsSync;
        create({
            privateKey: Buffer.from('key'),
            clientCert: Buffer.from('cert'),
            caCert: Buffer.from('ca'),
        });
        assert.strictEqual(fs.existsSync, spy);
    });
});
