const assert = require('node:assert');
const http = require('node:http');
const { inflateSync } = require('node:zlib');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const axios = require('axios');
const remoteModule = require('../build/lib/remote');

const RemoteAccess = remoteModule.default;
const { getLocalUrl } = remoteModule;

const TYPE = {
    MESSAGE: 0,
    CALLBACK: 3,
    WAIT: 5,
    SENDING_DONE: 6,
    MISSING: 7,
    HTML: 9,
    COMBINED_CALLBACK: 10,
    COMBINED_MESSAGE: 11,
    MCP: 12,
};
const MAX_MESSAGE_LENGTH = 127 * 1024;
// limit for messages to the events server (POST)
const MAX_POST_MESSAGE_LENGTH = 65 * 1024;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const tick = () => new Promise(resolve => setImmediate(resolve));
const unpack = data => JSON.parse(inflateSync(Buffer.from(data, 'base64')).toString());

const ADAPTER_METHODS = [
    'setForeignObjectAsync',
    'setForeignStateAsync',
    'delForeignStateAsync',
    'delForeignObjectAsync',
    'extendForeignObjectAsync',
    'getForeignObjectsAsync',
    'fileExistsAsync',
    'chownFileAsync',
    'chmodFileAsync',
    'unlinkAsync',
    'mkdirAsync',
    'renameAsync',
    'readDirAsync',
    'setPasswordAsync',
    'writeFileAsync',
];

function createAdapter(config, data = {}) {
    const objects = data.objects || {};
    const states = data.states || {};
    const files = data.files || {};
    const logs = { debug: [], info: [], warn: [], error: [] };
    const calls = {
        subscribeStates: [],
        unsubscribeStates: [],
        subscribeObjects: [],
        unsubscribeObjects: [],
        requireLog: [],
        getObject: [],
    };

    const adapter = {
        config: { remote: true, collectStatesMs: 10, collectObjectsMs: 10, collectLogsMs: 10, ...config },
        common: { host: 'test-host' },
        logs,
        calls,
        objects,
        states,
        log: {
            level: 'info',
            debug: text => logs.debug.push(text),
            info: text => logs.info.push(text),
            warn: text => logs.warn.push(text),
            error: text => logs.error.push(text),
        },
        subscribeForeignStates: pattern => calls.subscribeStates.push(pattern),
        unsubscribeForeignStates: pattern => calls.unsubscribeStates.push(pattern),
        subscribeForeignObjects: pattern => calls.subscribeObjects.push(pattern),
        unsubscribeForeignObjects: pattern => calls.unsubscribeObjects.push(pattern),
        requireLog: async enabled => calls.requireLog.push(enabled),
        getForeignObjectAsync: async id => {
            calls.getObject.push(id);
            return objects[id] || null;
        },
        getForeignStateAsync: async id => states[id] || null,
        getForeignStatesAsync: async pattern => {
            const regex = new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
            const result = {};
            Object.keys(states)
                .filter(id => regex.test(id))
                .forEach(id => (result[id] = states[id]));
            return result;
        },
        getObjectViewAsync: async () => {
            throw new Error('view failed');
        },
        readFileAsync: async (adapterName, fileName) => {
            const file = files[`${adapterName}/${fileName}`];
            if (!file) {
                throw new Error('Not exists');
            }
            return { ...file };
        },
        calculatePermissionsAsync: async (user, commandsPermissions) => ({
            user,
            groups: ['system.group.administrator'],
            commands: Object.keys(commandsPermissions).length,
        }),
        encrypt: (secret, value) => `enc(${secret}:${value})`,
        decrypt: (secret, value) => `dec(${secret}:${value})`,
    };
    ADAPTER_METHODS.forEach(method => (adapter[method] = async () => null));

    return adapter;
}

const remotes = [];

/**
 * @param {Record<string, any>} [config] adapter configuration
 * @param {{objects?: Record<string, any>, states?: Record<string, any>, files?: Record<string, any>}} [data] database content
 * @param {{realSendEvent?: boolean, patch?: (adapter: any) => void}} [options] options
 */
function createRemote(config, data, options = {}) {
    const adapter = createAdapter(config, data);
    options.patch?.(adapter);
    const remote = new RemoteAccess(adapter, 'client');
    const sent = [];
    if (!options.realSendEvent) {
        remote._sendEvent = async message => {
            sent.push(message);
            return undefined;
        };
    }
    remotes.push(remote);
    return { adapter, remote, sent };
}

async function request(remote, sid, name, args, type = TYPE.CALLBACK, id = 1, extra = {}) {
    const result = await remote.process({ sid, d: [type, id, name, args], ...extra }, 'remote');
    // answers are sent in setImmediate
    await tick();
    return result;
}

function answerOf(sent, sid, id = 1) {
    return sent.find(message => message.sid === sid && message.d && message.d[1] === id);
}

function events(sent, name) {
    return sent.filter(message => message.name === name);
}

describe('Remote', function () {
    this.timeout(10000);

    afterEach(() => {
        while (remotes.length) {
            remotes.pop().destroy();
        }
    });

    describe('Helpers', () => {
        it('pattern2RegEx matches like ioBroker patterns', () => {
            const { remote } = createRemote();
            const test = (pattern, id) => new RegExp(remote.pattern2RegEx(pattern)).test(id);

            assert.strictEqual(test('*', 'any.state.id'), true);
            assert.strictEqual(test('system.adapter.*', 'system.adapter.admin.0.alive'), true);
            assert.strictEqual(test('system.adapter.*', 'my.system.adapter.admin'), false);
            assert.strictEqual(test('*.alive', 'system.adapter.admin.0.alive'), true);
            assert.strictEqual(test('*.alive', 'system.adapter.admin.0.alive.old'), false);
            assert.strictEqual(test('hue.0.*.on', 'hue.0.lamp.on'), true);
            assert.strictEqual(test('hue.0.*.on', 'hue.0.lamp.online'), false);
            // IDs may contain characters with special meaning in regular expressions
            assert.strictEqual(test('javascript.0.a+b(1)$', 'javascript.0.a+b(1)$'), true);
            assert.strictEqual(test('javascript.0.a+b(1)$', 'javascript.0.aab1'), false);
            assert.strictEqual(test('javascript.0.state', 'javascript.0.state.sub'), false);
            assert.strictEqual(remote.pattern2RegEx(''), null);
            assert.strictEqual(remote.pattern2RegEx(undefined), null);
        });

        it('getLocalUrl uses the bind address and the protocol of the instance', () => {
            assert.strictEqual(getLocalUrl({ port: 8081 }), 'http://127.0.0.1:8081');
            assert.strictEqual(getLocalUrl({ port: 8081, bind: '0.0.0.0', secure: true }), 'https://127.0.0.1:8081');
            assert.strictEqual(getLocalUrl({ port: 8082, bind: '192.168.1.5' }), 'http://192.168.1.5:8082');
            assert.strictEqual(getLocalUrl({ port: 8082, bind: '::' }), 'http://localhost:8082');
            assert.strictEqual(getLocalUrl({ port: 8082, bind: 'fe80::1' }), 'http://[fe80::1]:8082');

            // instance on another host
            const addresses = ['127.0.0.1', '::1', 'fe80::2', '2001:db8::5', '192.168.1.20'];
            assert.strictEqual(getLocalUrl({ port: 8081 }, addresses), 'http://192.168.1.20:8081');
            assert.strictEqual(getLocalUrl({ port: 8081, bind: '::' }, addresses), 'http://192.168.1.20:8081');
            assert.strictEqual(getLocalUrl({ port: 8081 }, ['::1', '2001:db8::5']), 'http://[2001:db8::5]:8081');
            assert.strictEqual(getLocalUrl({ port: 8081, bind: '10.0.0.3' }, addresses), 'http://10.0.0.3:8081');
            assert.strictEqual(getLocalUrl({ port: 8081 }, ['127.0.0.1']), '');
            assert.strictEqual(getLocalUrl({ port: 8081 }, []), '');
        });

        it('invalid collect intervals fall back to the defaults', () => {
            const { remote } = createRemote({ collectStatesMs: '', collectObjectsMs: 'abc', collectLogsMs: '50' });
            assert.strictEqual(remote.collectStatesMs, 400);
            assert.strictEqual(remote.collectObjectsMs, 400);
            assert.strictEqual(remote.collectLogsMs, 50);
        });
    });

    describe('Commands', () => {
        it('rejects invalid requests', async () => {
            const { remote, adapter } = createRemote();
            await assert.rejects(remote.process('{invalid json', 'remote'));
            await assert.rejects(remote.process({ sid: 's1' }, 'remote'));
            assert.strictEqual(adapter.logs.error.length, 1);
        });

        it('answers "Not enabled" if remote access is disabled', async () => {
            const { remote, sent } = createRemote({ remote: false });
            const result = await request(remote, 's1', 'getObject', ['system.config']);
            assert.strictEqual(result, '___none___');
            assert.deepStrictEqual(answerOf(sent, 's1').d, [TYPE.CALLBACK, 1, 'getObject', ['Not enabled']]);
        });

        it('ppng tells the client whether the socket is known', async () => {
            const { remote, sent } = createRemote();
            await request(remote, 's1', 'ppng', [], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'ppng', [], TYPE.CALLBACK, 2);
            assert.deepStrictEqual(answerOf(sent, 's1', 1).d[3], [null, false]);
            assert.deepStrictEqual(answerOf(sent, 's1', 2).d[3], [null, true]);
        });

        it('answers unknown commands and ignores names of Object.prototype', async () => {
            const { remote, sent } = createRemote();
            const names = ['unknownCommand', 'toString', 'constructor', '__proto__', 'hasOwnProperty'];
            for (let i = 0; i < names.length; i++) {
                await request(remote, 's1', names[i], [], TYPE.CALLBACK, i + 1);
                assert.deepStrictEqual(answerOf(sent, 's1', i + 1).d[3], ['Unknown command'], names[i]);
            }
        });

        it('answers with packed results', async () => {
            const obj = { _id: 'system.config', type: 'config', common: { language: 'de' }, native: {} };
            const { remote, sent } = createRemote({}, { objects: { 'system.config': obj } });
            await request(remote, 's1', 'getObject', ['system.config']);
            assert.deepStrictEqual(unpack(answerOf(sent, 's1').d[3]), [null, obj]);
        });

        it('sends error messages instead of empty objects', async () => {
            const { remote, sent } = createRemote(
                {},
                {},
                {
                    patch: adapter =>
                        (adapter.getForeignObjectAsync = async () => {
                            throw new Error('boom');
                        }),
                },
            );
            await request(remote, 's1', 'getObject', ['system.config']);
            assert.deepStrictEqual(answerOf(sent, 's1').d[3], ['boom']);
        });

        it('answers with an error if a command without own error handling fails', async () => {
            const { remote, sent } = createRemote();
            const result = await request(remote, 's1', 'getHostByIp', ['192.168.1.1']);
            assert.strictEqual(result, '___none___');
            assert.deepStrictEqual(answerOf(sent, 's1').d[3], ['view failed']);
        });

        it('sends no answer for one-way messages', async () => {
            const { remote, sent } = createRemote();
            await request(remote, 's1', 'getObject', ['system.config'], TYPE.MESSAGE);
            assert.strictEqual(sent.length, 0);
        });

        it('stores the socket name', async () => {
            const { remote, sent, adapter } = createRemote();
            await request(remote, 's1', 'name', ['admin']);
            assert.strictEqual(remote.sockets.s1.name, 'admin');
            assert.deepStrictEqual(answerOf(sent, 's1').d[3], []);
            await request(remote, 's1', 'name', ['vis'], TYPE.CALLBACK, 2);
            assert.strictEqual(remote.sockets.s1.name, 'vis');
            assert.strictEqual(adapter.logs.warn.length, 1);
        });

        it('readFile64 sends the file content as base64', async () => {
            const binary = Buffer.from([0, 1, 2, 250, 255]);
            const { remote, sent } = createRemote(
                {},
                {
                    files: {
                        'vis.0/main/vis-views.json': { file: Buffer.from('{"a":"ä"}'), mimeType: 'application/json' },
                        'vis.0/main/img.png': { file: binary, mimeType: 'image/png' },
                    },
                },
            );
            await request(remote, 's1', 'readFile64', ['vis.0', 'main/vis-views.json'], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'readFile64', ['vis.0', 'main/img.png'], TYPE.CALLBACK, 2);

            const [error1, json64, mime1] = unpack(answerOf(sent, 's1', 1).d[3]);
            assert.strictEqual(error1, null);
            assert.strictEqual(mime1, 'application/json');
            assert.strictEqual(decodeURIComponent(Buffer.from(json64, 'base64').toString()), '{"a":"ä"}');

            const [error2, png64, mime2] = unpack(answerOf(sent, 's1', 2).d[3]);
            assert.strictEqual(error2, null);
            assert.strictEqual(mime2, 'image/png');
            assert.deepStrictEqual(Buffer.from(png64, 'base64'), binary);
        });

        it('encrypt and decrypt read the secret only once', async () => {
            const { remote, sent, adapter } = createRemote(
                {},
                { objects: { 'system.config': { common: {}, native: { secret: 'S' } } } },
            );
            await request(remote, 's1', 'encrypt', ['plain'], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'decrypt', ['cipher'], TYPE.CALLBACK, 2);
            assert.deepStrictEqual(unpack(answerOf(sent, 's1', 1).d[3]), [null, 'enc(S:plain)']);
            assert.deepStrictEqual(unpack(answerOf(sent, 's1', 2).d[3]), [null, 'dec(S:cipher)']);
            assert.strictEqual(adapter.calls.getObject.filter(id => id === 'system.config').length, 1);
        });

        it('encrypt answers with an error without system secret', async () => {
            const { remote, sent } = createRemote();
            await request(remote, 's1', 'encrypt', ['plain']);
            assert.deepStrictEqual(answerOf(sent, 's1').d[3], ['No system.config found']);
        });

        it('getUserPermissions answers with the permissions of the admin user', async () => {
            const { remote, sent, adapter } = createRemote();
            await request(remote, 's1', 'getUserPermissions', []);
            const [error, acl] = unpack(answerOf(sent, 's1').d[3]);
            assert.strictEqual(error, null);
            assert.strictEqual(acl.user, 'system.user.admin');
            assert.ok(acl.commands > 10);
            assert.strictEqual(adapter.logs.error.length, 0);
        });

        it('getUserPermissions uses the default user of the admin instance', async () => {
            const { remote, sent } = createRemote(
                { remoteAdminInstance: 'admin.0' },
                { objects: { 'system.adapter.admin.0': { common: {}, native: { port: 8081, defaultUser: 'operator' } } } },
            );
            await tick();
            await request(remote, 's1', 'getUserPermissions', []);
            assert.strictEqual(unpack(answerOf(sent, 's1').d[3])[1].user, 'system.user.operator');
        });

        it('getUserPermissions answers with an error if the permissions cannot be calculated', async () => {
            const { remote, sent } = createRemote(
                {},
                {},
                {
                    patch: adapter =>
                        (adapter.calculatePermissionsAsync = async () => {
                            throw new Error('no user');
                        }),
                },
            );
            await request(remote, 's1', 'getUserPermissions', []);
            assert.deepStrictEqual(answerOf(sent, 's1').d[3], ['no user']);
        });

        function createRepositoryRemote(count) {
            const repository = {};
            for (let i = 0; i < count; i++) {
                repository[`adapter-with-a-long-name-${i}`] = {
                    version: `1.${i}.0`,
                    // random parts, else the repository is packed too well to be split
                    extIcon: `https://raw.githubusercontent.com/${randomBytes(40).toString('hex')}/admin/icon.png`,
                    news: { en: 'not needed' },
                };
            }
            const result = createRemote(
                {},
                { states: { 'system.host.test.alive': { val: true } } },
                { patch: adapter => (adapter.sendToHost = (host, command, msg, cb) => cb(repository)) },
            );
            const compact = {};
            Object.keys(repository).forEach(
                key => (compact[key] = { version: repository[key].version, icon: repository[key].extIcon }),
            );
            return { ...result, compact };
        }

        it('getCompactRepository answers packed', async () => {
            const { remote, sent, compact } = createRepositoryRemote(10);
            await request(remote, 's1', 'getCompactRepository', ['system.host.test']);
            assert.deepStrictEqual(unpack(answerOf(sent, 's1').d[3]), [compact]);
        });

        it('getCompactRepository splits a big repository, which does not fit into one message', async () => {
            const { remote, sent, compact } = createRepositoryRemote(3000);
            assert.ok(JSON.stringify([compact]).length > MAX_MESSAGE_LENGTH);

            await request(remote, 's1', 'getCompactRepository', ['system.host.test']);
            await tick();

            const parts = sent.filter(message => message.d?.[1] === 1);
            assert.ok(parts.length > 1);
            parts.forEach(message => assert.ok(JSON.stringify(message).length <= MAX_POST_MESSAGE_LENGTH));
            assert.deepStrictEqual(unpack(parts.map(message => message.d[3]).join('')), [compact]);
        });
    });

    describe('Subscriptions', () => {
        it('counts the subscriptions of all sockets', async () => {
            const { remote, sent, adapter } = createRemote();
            await request(remote, 's1', 'subscribe', ['javascript.0.*'], TYPE.CALLBACK, 1);
            await request(remote, 's2', 'subscribe', ['javascript.0.*'], TYPE.CALLBACK, 1);
            // the answer is not packed twice
            assert.deepStrictEqual(answerOf(sent, 's1').d, [TYPE.CALLBACK, 1, 'subscribe', [null]]);
            assert.deepStrictEqual(adapter.calls.subscribeStates, ['javascript.0.*']);

            await request(remote, 's1', 'unsubscribe', ['javascript.0.*'], TYPE.CALLBACK, 2);
            assert.deepStrictEqual(adapter.calls.unsubscribeStates, []);
            await request(remote, 's2', 'unsubscribe', ['javascript.0.*'], TYPE.CALLBACK, 2);
            assert.deepStrictEqual(adapter.calls.unsubscribeStates, ['javascript.0.*']);
        });

        it('supports arrays of patterns and combined requests', async () => {
            const { remote, sent, adapter } = createRemote();
            await request(remote, 's1', 'subscribe', [['a.0.*', 'b.0.*']], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'subscribe', [['c.0.*'], ['d.0.*']], TYPE.COMBINED_CALLBACK, 2);
            assert.deepStrictEqual(adapter.calls.subscribeStates, ['a.0.*', 'b.0.*', 'c.0.*', 'd.0.*']);
            assert.deepStrictEqual(unpack(answerOf(sent, 's1', 2).d[3]), [[null], [null]]);
        });

        it('requireLog enables and disables the logs', async () => {
            const { remote, adapter } = createRemote();
            await request(remote, 's1', 'requireLog', [true], TYPE.CALLBACK, 1);
            await request(remote, 's2', 'requireLog', [true], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'requireLog', [false], TYPE.CALLBACK, 2);
            assert.deepStrictEqual(adapter.calls.requireLog, [true]);
            await request(remote, 's2', 'requireLog', [false], TYPE.CALLBACK, 2);
            assert.deepStrictEqual(adapter.calls.requireLog, [true, false]);
        });

        async function subscribeAll(remote, sid) {
            await request(remote, sid, 'subscribe', ['a.0.*'], TYPE.CALLBACK, 101);
            await request(remote, sid, 'subscribeObjects', ['system.adapter.*'], TYPE.CALLBACK, 102);
            await request(remote, sid, 'requireLog', [true], TYPE.CALLBACK, 103);
        }

        function assertAllReleased(adapter) {
            assert.deepStrictEqual(adapter.calls.unsubscribeStates, ['a.0.*']);
            assert.deepStrictEqual(adapter.calls.unsubscribeObjects, ['system.adapter.*']);
            assert.deepStrictEqual(adapter.calls.requireLog, [true, false]);
        }

        it('DCT releases the subscriptions and sends no answer', async () => {
            const { remote, sent, adapter } = createRemote();
            await subscribeAll(remote, 's1');
            sent.length = 0;
            await request(remote, 's1', 'DCT', [], TYPE.CALLBACK, 5);
            assertAllReleased(adapter);
            assert.strictEqual(remote.sockets.s1, undefined);
            assert.strictEqual(sent.length, 0);
            assert.strictEqual(adapter.logs.warn.length, 0);
        });

        it('destroy releases all subscriptions', async () => {
            const { remote, adapter } = createRemote();
            await subscribeAll(remote, 's1');
            remote.destroy();
            assertAllReleased(adapter);
            assert.deepStrictEqual(remote.sockets, {});
        });

        it('cloud disconnect releases all subscriptions', async () => {
            const { remote, adapter } = createRemote();
            await subscribeAll(remote, 's1');
            remote.onCloudDisconnect();
            assertAllReleased(adapter);
        });

        it('inactive sockets and old trunks are deleted', async () => {
            const { remote, adapter } = createRemote();
            await subscribeAll(remote, 's1');
            await subscribeAll(remote, 's2');
            remote.sockets.s1.ts = Date.now() - 31 * 3600 * 1000;
            remote.packets.old = { ts: Date.now() - 200000, trunks: [] };
            remote.packets.new = { ts: Date.now(), trunks: [] };
            remote._clearMemory();
            assert.deepStrictEqual(Object.keys(remote.sockets), ['s2']);
            assert.deepStrictEqual(Object.keys(remote.packets), ['new']);
            // s2 still holds the subscriptions
            assert.deepStrictEqual(adapter.calls.unsubscribeStates, []);
        });

        it('a disconnected client is deleted with its subscriptions', async () => {
            const { remote, adapter } = createRemote({}, {}, { realSendEvent: true });
            const post = axios.post;
            axios.post = async () => {
                const error = new Error('Request failed with status code 410');
                error.response = { status: 410, data: { error: 'invalid connectionId' } };
                throw error;
            };
            try {
                // the answer to subscribe fails
                await subscribeAll(remote, 's1');
                await tick();
            } finally {
                axios.post = post;
            }
            assert.strictEqual(remote.sockets.s1, undefined);
            assert.deepStrictEqual(adapter.calls.unsubscribeStates, ['a.0.*']);
            assert.strictEqual(adapter.logs.warn.length, 0);
        });
    });

    describe('Changes', () => {
        const STATES = {
            'a.0.x': { val: 1, ack: true, ts: 1 },
            'b.0.y': { val: 2, ack: true, ts: 1 },
            'c.0.z': { val: 3, ack: true, ts: 1 },
        };

        it('sends only read states to the subscribed sockets', async () => {
            const { remote, sent } = createRemote({}, { states: { ...STATES } });
            await request(remote, 's1', 'subscribe', ['a.0.*'], TYPE.CALLBACK, 1);
            await request(remote, 's2', 'subscribe', ['b.0.*'], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'getStates', ['*'], TYPE.CALLBACK, 2);
            await request(remote, 's2', 'getState', ['b.0.y'], TYPE.CALLBACK, 2);
            sent.length = 0;

            remote.updateState('a.0.x', { val: 10, ack: true, ts: 2 });
            // unchanged
            remote.updateState('b.0.y', { val: 2, ack: true, ts: 1 });
            // nobody subscribed
            remote.updateState('c.0.z', { val: 30, ack: true, ts: 2 });
            // never read
            remote.updateState('d.0.w', { val: 40, ack: true, ts: 2 });
            await wait(50);

            assert.deepStrictEqual(sent, [
                {
                    name: 'stateChange',
                    sid: 's1',
                    multi: true,
                    args: [['a.0.x'], [{ val: 10, ack: true, ts: 2 }]],
                },
            ]);
        });

        it('sends deleted states', async () => {
            const { remote, sent } = createRemote({}, { states: { ...STATES } });
            await request(remote, 's1', 'subscribe', ['*'], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'getState', ['a.0.x'], TYPE.CALLBACK, 2);
            sent.length = 0;
            remote.updateState('a.0.x', null);
            await wait(50);
            assert.deepStrictEqual(events(sent, 'stateChange')[0].args, [['a.0.x'], [null]]);
        });

        it('sends immediately if many states are collected', async () => {
            const states = {};
            for (let i = 0; i < 80; i++) {
                states[`a.0.s${i}`] = { val: 0 };
            }
            const { remote, sent } = createRemote({ collectStatesMs: 60000 }, { states });
            await request(remote, 's1', 'subscribe', ['a.0.*'], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'getStates', ['a.0.*'], TYPE.CALLBACK, 2);
            sent.length = 0;
            for (let i = 0; i < 71; i++) {
                remote.updateState(`a.0.s${i}`, { val: 1 });
            }
            await tick();
            assert.strictEqual(events(sent, 'stateChange').length, 1);
            assert.strictEqual(events(sent, 'stateChange')[0].args[0].length, 71);
        });

        it('keeps the order of the changes while sending is slow', async () => {
            const { remote, sent } = createRemote({}, { states: { ...STATES } });
            await request(remote, 's1', 'subscribe', ['a.0.*'], TYPE.CALLBACK, 1);
            await request(remote, 's1', 'getState', ['a.0.x'], TYPE.CALLBACK, 2);
            sent.length = 0;

            let active = 0;
            let maxActive = 0;
            remote._sendEvent = async message => {
                active++;
                maxActive = Math.max(maxActive, active);
                await wait(40);
                sent.push(message);
                active--;
            };

            remote.updateState('a.0.x', { val: 1 });
            // the first sending starts after 10 ms and takes 40 ms
            await wait(20);
            remote.updateState('a.0.x', { val: 2 });
            await wait(15);
            remote.updateState('a.0.x', { val: 3 });
            await wait(150);

            const values = events(sent, 'stateChange').flatMap(event => event.args[1].map(state => state.val));
            assert.deepStrictEqual(values, [1, 2, 3]);
            assert.strictEqual(maxActive, 1);
        });

        it('sends object changes while objects change permanently', async () => {
            const { remote, sent } = createRemote({ collectObjectsMs: 20 });
            await request(remote, 's1', 'subscribeObjects', ['system.adapter.*'], TYPE.CALLBACK, 1);
            sent.length = 0;

            for (let i = 0; i < 20; i++) {
                remote.updateObject(`system.adapter.test.${i}`, { _id: `system.adapter.test.${i}`, common: {} });
                // not subscribed
                remote.updateObject(`enum.rooms.${i}`, { _id: `enum.rooms.${i}`, common: {} });
                await wait(5);
            }
            // sent already while the objects are changing
            assert.ok(events(sent, 'objectChange').length > 0);
            await wait(50);
            const ids = events(sent, 'objectChange').flatMap(event => event.args[0]);
            assert.strictEqual(ids.length, 20);
            assert.ok(ids.every(id => id.startsWith('system.adapter.test.')));
        });

        it('does not collect objects and logs without subscriptions', () => {
            const { remote } = createRemote();
            remote.updateObject('system.adapter.test.0', { common: {} });
            remote.onLog({ from: 'test.0', message: 'text', severity: 'info', ts: 1 });
            assert.strictEqual(remote.listOfObjects.ids.length, 0);
            assert.strictEqual(remote.listOfLogs.length, 0);
            assert.strictEqual(remote.sendObjectsTimeout, null);
            assert.strictEqual(remote.sendLogsTimeout, null);
        });

        it('sends logs only to sockets with enabled logs', async () => {
            const { remote, sent } = createRemote();
            await request(remote, 's1', 'requireLog', [true], TYPE.CALLBACK, 1);
            await request(remote, 's2', 'ppng', [], TYPE.CALLBACK, 1);
            sent.length = 0;
            const log = { from: 'test.0', message: 'text', severity: 'info', ts: 1 };
            remote.onLog(log);
            remote.onLog(log);
            await wait(50);
            assert.deepStrictEqual(events(sent, 'log'), [{ name: 'log', sid: 's1', multi: true, args: [[log, log]] }]);
        });

        it('failed log events are not logged as warnings', async () => {
            const { remote, adapter } = createRemote({}, {}, { realSendEvent: true });
            const post = axios.post;
            let posts = 0;
            axios.post = async (url, message) => {
                posts++;
                // answer to requireLog
                if (message.d) {
                    return { status: 200 };
                }
                throw new Error('Network Error');
            };
            try {
                await request(remote, 's1', 'requireLog', [true], TYPE.CALLBACK, 1);
                remote.onLog({ from: 'test.0', message: 'text', severity: 'info', ts: 1 });
                await wait(50);
            } finally {
                axios.post = post;
            }
            assert.strictEqual(posts, 2);
            assert.strictEqual(adapter.logs.warn.length + adapter.logs.error.length, 0);
            assert.ok(adapter.logs.debug.some(text => text.includes('Network Error')));
        });
    });

    describe('Big events', () => {
        it('sends small events unchanged', async () => {
            const { remote, sent } = createRemote();
            const args = [['a.0.x'], [{ val: 1 }]];
            await remote._sendChangeEvent('s1', 'stateChange', args);
            assert.deepStrictEqual(sent, [{ name: 'stateChange', args, sid: 's1', multi: true }]);
        });

        it('packs big events', async () => {
            const { remote, sent } = createRemote();
            const ids = [];
            const states = [];
            for (let i = 0; i < 3000; i++) {
                ids.push(`javascript.0.very.long.state.id.number.${i}`);
                states.push({ val: i, ack: true, ts: 1700000000000, lc: 1700000000000, from: 'system.adapter.test.0' });
            }
            assert.ok(JSON.stringify([ids, states]).length > MAX_MESSAGE_LENGTH);

            await remote._sendChangeEvent('s1', 'stateChange', [ids, states]);
            assert.strictEqual(sent.length, 1);
            assert.strictEqual(typeof sent[0].args, 'string');
            assert.ok(JSON.stringify(sent[0]).length <= MAX_POST_MESSAGE_LENGTH);
            assert.deepStrictEqual(unpack(sent[0].args), [ids, states]);
        });

        it('splits too big events into parts', async () => {
            const { remote, sent } = createRemote();
            const logs = [
                { from: 'test.0', severity: 'info', ts: 1, message: randomBytes(150000).toString('base64') },
                { from: 'test.0', severity: 'info', ts: 2, message: randomBytes(150000).toString('base64') },
            ];

            await remote._sendChangeEvent('s1', 'log', [logs]);

            assert.ok(sent.length > 1);
            const id = sent[0].d[1];
            sent.forEach((message, i) => {
                assert.strictEqual(message.sid, 's1');
                assert.deepStrictEqual(message.d.slice(0, 3), [TYPE.COMBINED_MESSAGE, id, 'log']);
                assert.strictEqual(message.d[4], sent.length);
                assert.strictEqual(message.d[5], i);
                assert.ok(JSON.stringify(message).length <= MAX_POST_MESSAGE_LENGTH);
            });
            assert.deepStrictEqual(unpack(sent.map(message => message.d[3]).join('')), [logs]);
        });

        it('stops sending parts after an error', async () => {
            const { remote } = createRemote();
            let calls = 0;
            remote._sendEvent = async () => {
                calls++;
                return 'error';
            };
            const message = randomBytes(300000).toString('base64');
            await remote._sendChangeEvent('s1', 'log', [[{ from: 'test.0', severity: 'info', ts: 1, message }]]);
            assert.strictEqual(calls, 1);
        });
    });

    describe('Big answers', () => {
        const bigResult = () => ({ data: randomBytes(200000).toString('base64') });

        it('sends small answers packed', async () => {
            const { remote } = createRemote();
            const answer = await remote._sendResponse('s1', TYPE.CALLBACK, 7, 'getObject', [null, { a: 1 }]);
            assert.deepStrictEqual(answer.d.slice(0, 3), [TYPE.CALLBACK, 7, 'getObject']);
            assert.deepStrictEqual(unpack(answer.d[3]), [null, { a: 1 }]);
        });

        it('splits big answers into parts', async () => {
            const { remote, sent } = createRemote();
            const args = [null, bigResult()];
            const answer = await remote._sendResponse('s1', TYPE.CALLBACK, 7, 'getObjects', args);
            assert.strictEqual(answer.d[0], TYPE.WAIT);
            await tick();
            await tick();
            assert.ok(sent.length > 1);
            sent.forEach((message, i) => {
                assert.deepStrictEqual(message.d.slice(0, 3), [TYPE.CALLBACK, 7, 'getObjects']);
                assert.strictEqual(message.d[4], sent.length);
                assert.strictEqual(message.d[5], i);
                assert.ok(JSON.stringify(message).length <= MAX_POST_MESSAGE_LENGTH);
            });
            assert.deepStrictEqual(unpack(sent.map(message => message.d[3]).join('')), args);
        });

        it('splits answers, which fit into an IoT message, but not into one POST', async () => {
            const { remote, sent } = createRemote();
            // packed about 93 KB: more than a POST, less than an IoT message
            const args = [null, { data: randomBytes(70000).toString('base64') }];
            const answer = await remote._sendResponse('s1', TYPE.CALLBACK, 8, 'readFile', args);
            assert.strictEqual(answer.d[0], TYPE.WAIT);
            await tick();
            await tick();
            assert.ok(sent.length > 1);
            sent.forEach(message => assert.ok(JSON.stringify(message).length <= MAX_POST_MESSAGE_LENGTH));
            assert.deepStrictEqual(unpack(sent.map(message => message.d[3]).join('')), args);
        });

        it('uploads big answers if the cloud provides an upload URL', async () => {
            const { remote, sent } = createRemote();
            const uploads = [];
            remote.uploadToServer = async (url, data, raw) => {
                uploads.push({ url, data, raw });
                return true;
            };
            const result = bigResult();
            const answer = await remote._sendResponse(
                's1',
                TYPE.CALLBACK,
                7,
                'getObjects',
                [null, result],
                'https://write',
                'https://read',
            );
            assert.deepStrictEqual(answer.d, [TYPE.CALLBACK, 7, 'getObjects', 'https://read']);
            assert.strictEqual(uploads.length, 1);
            assert.strictEqual(uploads[0].url, 'https://write');
            assert.deepStrictEqual(JSON.parse(uploads[0].data.file), result);
            assert.strictEqual(sent.length, 0);
        });
    });

    describe('HTML files', () => {
        const bigFile = () => ({ file: randomBytes(300000), mimeType: 'application/octet-stream' });

        it('returns small files directly', async () => {
            const { remote } = createRemote(
                {},
                { files: { 'vis-2/index.html': { file: Buffer.from('<html></html>'), mimeType: 'text/html' } } },
            );
            const answer = await remote.process({ sid: 's1', d: [TYPE.HTML, 3, '/vis-2/index.html?x=1'] }, 'remote');
            assert.deepStrictEqual(answer.d.slice(0, 3), [TYPE.HTML, 3, '']);
            const data = unpack(answer.d[3]);
            assert.strictEqual(Buffer.from(data.file, 'base64').toString(), '<html></html>');
            assert.strictEqual(data.mimeType, 'text/html');
        });

        it('splits big files into trunks and resends missing trunks of the right session', async () => {
            const { remote } = createRemote({}, { files: { 'vis-2/big.bin': bigFile() } });
            const published = [];
            remote.registerDevice({
                publish: (topic, payload, options, cb) => {
                    published.push({ topic, trunk: JSON.parse(payload) });
                    cb();
                },
            });

            // two sessions request with the same ID in parallel
            const [trunks1, trunks2] = await Promise.all([
                remote.process({ sid: 's1', d: [TYPE.HTML, 5, '/vis-2/big.bin'] }, 'remote'),
                remote.process({ sid: 's2', d: [TYPE.HTML, 5, '/vis-2/big.bin'] }, 'remote'),
            ]);
            assert.ok(Array.isArray(trunks1) && trunks1.length > 1);
            assert.ok(trunks1.every(trunk => trunk.sid === 's1' && trunk.l === trunks1.length));
            assert.ok(trunks2.every(trunk => trunk.sid === 's2'));
            trunks1.forEach(trunk => assert.ok(JSON.stringify(trunk).length <= MAX_MESSAGE_LENGTH));
            assert.deepStrictEqual(Object.keys(remote.packets).sort(), ['s1_5', 's2_5']);
            const data = unpack(trunks1.map(trunk => trunk.d[3]).join(''));
            assert.strictEqual(Buffer.from(data.file, 'base64').length, 300000);

            await remote.process({ sid: 's1', d: [TYPE.MISSING, 5, '/vis-2/big.bin', [[1, 99]]] }, 'remote');
            await wait(10);
            assert.deepStrictEqual(published, [{ topic: 'response/client/remote', trunk: trunks1[1] }]);

            await remote.process({ sid: 's1', d: [TYPE.SENDING_DONE, 5, '/vis-2/big.bin'] }, 'remote');
            assert.deepStrictEqual(Object.keys(remote.packets), ['s2_5']);
        });

        it('rejects too big files', async () => {
            const { remote } = createRemote(
                {},
                { files: { 'vis-2/huge.bin': { file: Buffer.alloc(3200000), mimeType: 'application/octet-stream' } } },
            );
            const answer = await remote.process({ sid: 's1', d: [TYPE.HTML, 5, '/vis-2/huge.bin'] }, 'remote');
            assert.ok(answer.d[3].error.startsWith('File is too big'));
        });

        it('reads the admin pages from the installation directory of admin', async () => {
            const base = mkdtempSync(join(tmpdir(), 'iot-admin-'));
            const www = join(base, 'adminWww');
            mkdirSync(join(www, 'img'), { recursive: true });
            writeFileSync(join(www, 'img', 'no-image.svg'), '<svg/>');
            writeFileSync(join(www, 'index.html'), '<html>@@socketPath@@</html>');
            writeFileSync(join(base, 'secret.txt'), 'secret');
            try {
                const { remote } = createRemote(
                    {},
                    { files: { 'admin/login-bg.png': { file: Buffer.from('PNG'), mimeType: 'image/png' } } },
                );
                remote.adminWwwDir = www;
                const read = async name => {
                    const answer = await remote.process({ sid: 's1', d: [TYPE.HTML, 1, name] }, 'remote');
                    return typeof answer.d[3] === 'string' ? unpack(answer.d[3]) : answer.d[3];
                };

                const svg = await read('/admin/img/no-image.svg?v=1');
                assert.strictEqual(Buffer.from(svg.file, 'base64').toString(), '<svg/>');
                assert.strictEqual(svg.mimeType, 'image/svg+xml');
                // uploaded files are still read from the file storage
                assert.strictEqual(Buffer.from((await read('/admin/login-bg.png')).file, 'base64').toString(), 'PNG');
                // HTML pages are templates, which only admin can fill
                assert.deepStrictEqual(await read('/admin/index.html'), { error: 'Not exists' });
                assert.deepStrictEqual(await read('/admin/img/../../secret.txt'), { error: 'Not exists' });
            } finally {
                rmSync(base, { recursive: true, force: true });
            }
        });

        it('reads missing admin pages from the admin instance without the prefix', async () => {
            const { remote } = createRemote(
                { remoteAdminInstance: 'admin.0', remoteWebInstance: 'web.0' },
                {
                    objects: {
                        'system.adapter.admin.0': { common: {}, native: { port: 8081, bind: '0.0.0.0' } },
                        'system.adapter.web.0': { common: {}, native: { port: 8082, bind: '0.0.0.0' } },
                    },
                },
            );
            await tick();
            remote.adminWwwDir = null;
            const urls = [];
            remote.readUrlFile = async (url, path, sid, type, id) => {
                urls.push(url + path);
                return { sid, d: [type, id, '', { error: 'Not exists' }] };
            };
            await remote.process({ sid: 's1', d: [TYPE.HTML, 1, '/admin/img/no-image.svg?v=1'] }, 'remote');
            await remote.process({ sid: 's1', d: [TYPE.HTML, 2, '/vis-2/missing.png'] }, 'remote');
            assert.deepStrictEqual(urls, [
                'http://127.0.0.1:8081/img/no-image.svg?v=1',
                'http://127.0.0.1:8082/vis-2/missing.png',
            ]);
        });

        it('reads the admin pages via HTTP from the host of the admin instance', async () => {
            const base = mkdtempSync(join(tmpdir(), 'iot-admin-'));
            const www = join(base, 'adminWww');
            mkdirSync(join(www, 'img'), { recursive: true });
            writeFileSync(join(www, 'img', 'no-image.svg'), '<svg/>');
            try {
                const { remote } = createRemote(
                    { remoteAdminInstance: 'admin.0' },
                    {
                        objects: {
                            'system.adapter.admin.0': {
                                common: { host: 'other-host' },
                                native: { port: 8081, bind: '0.0.0.0', auth: true },
                            },
                            'system.host.other-host': { common: { address: ['127.0.0.1', 'fe80::2', '192.168.1.20'] } },
                        },
                    },
                );
                await tick();
                // the local installation must not be used for an admin on another host
                remote.adminWwwDir = www;
                const urls = [];
                remote.readUrlFile = async (url, path) => {
                    urls.push(url + path);
                    return { file: Buffer.from('SVG').toString('base64'), mimeType: 'image/svg+xml' };
                };
                await remote.process({ sid: 's1', d: [TYPE.HTML, 1, '/admin/img/no-image.svg'] }, 'remote');
                await remote.process({ sid: 's1', d: [TYPE.HTML, 2, '/admin/adapter/admin/admin.svg'] }, 'remote');
                assert.deepStrictEqual(urls, [
                    'http://192.168.1.20:8081/img/no-image.svg',
                    'http://192.168.1.20:8081/adapter/admin/admin.svg',
                ]);
            } finally {
                rmSync(base, { recursive: true, force: true });
            }
        });

        it('treats redirects to the login page as not authorised', async () => {
            const server = http.createServer((req, res) => {
                if (req.url === '/img/no-image.svg') {
                    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
                    res.end('<svg/>');
                } else {
                    res.writeHead(302, { Location: '/login/index.html' });
                    res.end();
                }
            });
            await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
            try {
                const url = `http://127.0.0.1:${server.address().port}`;
                const { remote } = createRemote();
                const file = await remote.readUrlFile(url, '/img/no-image.svg', 's1', TYPE.HTML, 1);
                assert.strictEqual(Buffer.from(file.file, 'base64').toString(), '<svg/>');
                assert.strictEqual(file.mimeType, 'image/svg+xml');
                const denied = await remote.readUrlFile(url, '/adapter/admin/admin.svg', 's1', TYPE.HTML, 2);
                assert.deepStrictEqual(denied.d[3], { error: 'Not authorised' });
            } finally {
                server.close();
            }
        });

        it('reads adapter files with and without the admin prefix from "<adapter>.admin"', async () => {
            const { remote } = createRemote(
                {},
                {
                    files: {
                        'cloud.admin/cloud.png': { file: Buffer.from('PNG'), mimeType: 'image/png' },
                        'cloud.admin/index.html': { file: Buffer.from('<html>'), mimeType: 'text/html' },
                        'docker-manager.admin/img/icon.svg': { file: Buffer.from('<svg/>'), mimeType: 'image/svg+xml' },
                    },
                },
            );
            const read = async name => {
                const answer = await remote.process({ sid: 's1', d: [TYPE.HTML, 1, name] }, 'remote');
                return typeof answer.d[3] === 'string' ? unpack(answer.d[3]) : answer.d[3];
            };

            const withPrefix = await read('/admin/adapter/cloud/cloud.png');
            assert.strictEqual(Buffer.from(withPrefix.file, 'base64').toString(), 'PNG');
            assert.strictEqual(withPrefix.mimeType, 'image/png');
            assert.strictEqual(Buffer.from((await read('/adapter/cloud/cloud.png?0')).file, 'base64').toString(), 'PNG');
            assert.strictEqual(Buffer.from((await read('/admin/adapter/cloud/')).file, 'base64').toString(), '<html>');
            const svg = await read('/admin/adapter/docker-manager/img/icon.svg');
            assert.strictEqual(svg.mimeType, 'image/svg+xml');
            assert.deepStrictEqual(await read('/admin/adapter/cloud/missing.png'), { error: 'Not exists' });
        });

        it('reads missing adapter files from the admin instance and never leaves the adapter directory', async () => {
            const { remote } = createRemote(
                { remoteAdminInstance: 'admin.0', remoteWebInstance: 'web.0' },
                {
                    objects: {
                        'system.adapter.admin.0': { common: {}, native: { port: 8081, bind: '0.0.0.0' } },
                        'system.adapter.web.0': { common: {}, native: { port: 8082, bind: '0.0.0.0' } },
                    },
                },
            );
            await tick();
            const urls = [];
            remote.readUrlFile = async (url, path, sid, type, id) => {
                urls.push(url + path);
                return { file: Buffer.from('SVG').toString('base64'), mimeType: 'image/svg+xml' };
            };

            const answer = await remote.process(
                { sid: 's1', d: [TYPE.HTML, 1, '/admin/adapter/admin/admin.svg?0'] },
                'remote',
            );
            assert.strictEqual(unpack(answer.d[3]).mimeType, 'image/svg+xml');
            const forbidden = await remote.process(
                { sid: 's1', d: [TYPE.HTML, 2, '/admin/adapter/cloud/../../etc/passwd'] },
                'remote',
            );
            assert.deepStrictEqual(forbidden.d[3], { error: 'Not exists' });
            assert.deepStrictEqual(urls, ['http://127.0.0.1:8081/adapter/admin/admin.svg?0']);
        });

        it('reads missing files from the web instance only with an absolute path', async () => {
            const { remote } = createRemote(
                { remoteWebInstance: 'web.0' },
                { objects: { 'system.adapter.web.0': { common: {}, native: { port: 8082, bind: '0.0.0.0' } } } },
            );
            await tick();
            const urls = [];
            remote.readUrlFile = async (url, path, sid, type, id) => {
                urls.push(url + path);
                return { sid, d: [type, id, '', { error: 'Not exists' }] };
            };
            await remote.process({ sid: 's1', d: [TYPE.HTML, 1, '/vis-2/missing.html'] }, 'remote');
            const answer = await remote.process({ sid: 's1', d: [TYPE.HTML, 2, '@evil.com/file.html'] }, 'remote');
            assert.deepStrictEqual(urls, ['http://127.0.0.1:8082/vis-2/missing.html']);
            assert.deepStrictEqual(answer.d[3], { error: 'Not exists' });
        });
    });

    describe('MCP', () => {
        let server;
        let port;
        let received;

        before(async () => {
            server = http.createServer((req, res) => {
                let body = '';
                req.on('data', chunk => (body += chunk));
                req.on('end', () => {
                    received.push({ method: req.method, url: req.url, headers: req.headers, body });
                    // answers of @iobroker/mcp-server for unknown sessions and invalid requests
                    if (req.headers['mcp-session-id'] === 'expired' && req.method === 'DELETE') {
                        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('Invalid or missing session ID');
                    } else if (req.headers['mcp-session-id'] === 'expired' || body.includes('"method":"invalid"')) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(
                            '{"jsonrpc":"2.0","error":{"code":-32000,"message":"Bad Request: No valid session ID provided"},"id":null}',
                        );
                    } else if (req.method === 'POST') {
                        res.writeHead(200, {
                            'Content-Type': 'text/event-stream',
                            'Mcp-Session-Id': 'session-1',
                            'Set-Cookie': 'secret=1',
                        });
                        res.end('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n\n');
                    } else {
                        res.writeHead(200);
                        res.end();
                    }
                });
            });
            await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
            port = server.address().port;
        });

        after(() => server.close());

        beforeEach(() => (received = []));

        const mcpObjects = (native, extra = {}) => ({
            'system.adapter.mcp.0': {
                common: { enabled: true },
                native: { port, bind: '127.0.0.1', auth: false, secure: false, webInstance: '', ...native },
            },
            ...extra,
        });

        /** Sends the request like the cloud (message type 12) and returns `[null, response]` or `[error]` */
        async function mcpRequest(remote, sent, mcp) {
            const answer = await remote.process({ sid: 's1', d: [TYPE.MCP, 1, 'mcp', mcp] }, 'remote/uuid-1');
            await tick();
            assert.strictEqual(sent.length, 0, 'MCP answers must not be sent via the events server');
            const data = answer.d[3];
            return typeof data === 'string' ? [null, unpack(data)] : [data.error];
        }

        it('does not know "mcp" as socket command', async () => {
            const { remote, sent } = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects: mcpObjects() });
            await request(remote, 's1', 'mcp', [{ body: {} }]);
            assert.deepStrictEqual(answerOf(sent, 's1').d[3], ['Unknown command']);
            assert.strictEqual(received.length, 0);
        });

        it('forwards requests to the MCP instance', async () => {
            const { remote, sent } = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects: mcpObjects() });
            const body = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
            const answer = await mcpRequest(remote, sent, {
                method: 'POST',
                headers: { 'Mcp-Session-Id': 'session-1', Authorization: 'Basic YWRtaW46YWRtaW4=', Cookie: 'a=b' },
                body,
            });

            assert.deepStrictEqual(answer, [
                null,
                {
                    status: 200,
                    headers: { 'content-type': 'text/event-stream', 'mcp-session-id': 'session-1' },
                    body: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n\n',
                },
            ]);
            assert.strictEqual(received.length, 1);
            assert.strictEqual(received[0].method, 'POST');
            assert.strictEqual(received[0].url, '/mcp');
            assert.deepStrictEqual(JSON.parse(received[0].body), body);
            assert.strictEqual(received[0].headers['mcp-session-id'], 'session-1');
            assert.strictEqual(received[0].headers['content-type'], 'application/json');
            assert.ok(received[0].headers.accept.includes('application/json'));
            assert.ok(received[0].headers.accept.includes('text/event-stream'));
            assert.strictEqual(received[0].headers.authorization, undefined);
            assert.strictEqual(received[0].headers.cookie, undefined);
        });

        it('forwards the session termination', async () => {
            const { remote, sent } = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects: mcpObjects() });
            const answer = await mcpRequest(remote, sent, {
                method: 'DELETE',
                headers: { 'mcp-session-id': 'session-1' },
            });
            assert.strictEqual(answer[1].status, 200);
            assert.strictEqual(received[0].method, 'DELETE');
            assert.strictEqual(received[0].headers['mcp-session-id'], 'session-1');
        });

        it('answers requests of an unknown session with 404, so the client starts a new session', async () => {
            const { remote, sent, adapter } = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects: mcpObjects() });
            const call = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: { name: 'get_states', arguments: { ids: ['a.0.b'] } },
            };

            const post = await mcpRequest(remote, sent, { headers: { 'mcp-session-id': 'expired' }, body: call });
            assert.strictEqual(post[1].status, 404);
            assert.ok(post[1].body.includes('No valid session ID'));

            const del = await mcpRequest(remote, sent, { method: 'DELETE', headers: { 'mcp-session-id': 'expired' } });
            assert.strictEqual(del[1].status, 404);
            assert.ok(adapter.logs.info.some(text => text.includes('"expired" is unknown')));

            // without a session ID it is a real bad request
            const invalid = await mcpRequest(remote, sent, { body: { jsonrpc: '2.0', id: 3, method: 'invalid' } });
            assert.strictEqual(invalid[1].status, 400);
        });

        it('answers GET with 405, because SSE streams cannot be forwarded', async () => {
            const { remote, sent } = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects: mcpObjects() });
            const answer = await mcpRequest(remote, sent, { method: 'GET', headers: { 'mcp-session-id': 'session-1' } });
            assert.strictEqual(answer[1].status, 405);
            assert.strictEqual(received.length, 0);
        });

        it('uses the web instance if MCP runs as web extension', async () => {
            const objects = mcpObjects(
                { webInstance: 'web.0', port: 1, auth: true },
                { 'system.adapter.web.0': { common: { enabled: true }, native: { port, bind: '127.0.0.1' } } },
            );
            const { remote, sent } = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects });
            const answer = await mcpRequest(remote, sent, { body: { jsonrpc: '2.0', id: 1, method: 'ping' } });
            assert.strictEqual(answer[1].status, 200);
            assert.strictEqual(received[0].url, '/mcp');
        });

        it('uses the configured web instance if MCP extends all web instances', async () => {
            const objects = mcpObjects(
                { webInstance: '*' },
                {
                    'system.adapter.web.1': { common: { enabled: true }, native: { port, bind: '127.0.0.1' } },
                },
            );
            const { remote, sent } = createRemote({ remoteMcpInstance: 'mcp.0', remoteWebInstance: 'web.1' }, { objects });
            const answer = await mcpRequest(remote, sent, { body: '{"jsonrpc":"2.0","id":1,"method":"ping"}' });
            assert.strictEqual(answer[1].status, 200);
            assert.strictEqual(received[0].body, '{"jsonrpc":"2.0","id":1,"method":"ping"}');
        });

        it('answers with errors if MCP cannot be used', async () => {
            const cases = [
                [{}, {}, 'MCP instance is not configured'],
                [{ remoteMcpInstance: 'mcp.1' }, mcpObjects(), 'MCP instance "mcp.1" does not exist'],
                [
                    { remoteMcpInstance: 'mcp.0' },
                    { 'system.adapter.mcp.0': { common: { enabled: false }, native: { port } } },
                    'MCP instance "mcp.0" is not enabled',
                ],
                [{ remoteMcpInstance: 'mcp.0' }, mcpObjects({ auth: true }), 'authentication'],
                [{ remoteMcpInstance: 'mcp.0' }, mcpObjects({ oauth: true, auth: true }), 'authentication'],
                [
                    { remoteMcpInstance: 'mcp.0' },
                    mcpObjects(
                        { webInstance: 'web.0' },
                        { 'system.adapter.web.0': { common: { enabled: true }, native: { port, auth: true } } },
                    ),
                    'authentication',
                ],
                [{ remoteMcpInstance: 'mcp.0' }, mcpObjects({ webInstance: 'web.5' }), 'web.5'],
            ];
            for (const [config, objects, text] of cases) {
                const { remote, sent } = createRemote(config, { objects });
                const answer = await mcpRequest(remote, sent, { body: {} });
                assert.strictEqual(answer.length, 1, text);
                assert.ok(answer[0].includes(text), `"${answer[0]}" does not include "${text}"`);
            }
            assert.strictEqual(received.length, 0);
        });

        it('uses the address of the host, if MCP runs on another host', async () => {
            const objects = mcpObjects(
                { bind: '0.0.0.0' },
                { 'system.host.other-host': { common: { address: ['127.0.0.1', '::1'] } } },
            );
            objects['system.adapter.mcp.0'].common.host = 'other-host';
            const first = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects });
            const error = await mcpRequest(first.remote, first.sent, { body: {} });
            assert.ok(error[0].includes('address of the host "other-host"'), error[0]);

            // a specific bind address is used directly
            objects['system.adapter.mcp.0'].native.bind = '127.0.0.1';
            const second = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects });
            const answer = await mcpRequest(second.remote, second.sent, {
                body: { jsonrpc: '2.0', id: 1, method: 'ping' },
            });
            assert.strictEqual(answer[1].status, 200);
            assert.strictEqual(received.length, 1);
        });

        it('answers with an error if the MCP server is not reachable', async () => {
            const closed = http.createServer();
            await new Promise(resolve => closed.listen(0, '127.0.0.1', resolve));
            const closedPort = closed.address().port;
            await new Promise(resolve => closed.close(resolve));

            const { remote, sent } = createRemote(
                { remoteMcpInstance: 'mcp.0' },
                { objects: mcpObjects({ port: closedPort }) },
            );
            const answer = await mcpRequest(remote, sent, { body: {} });
            assert.strictEqual(answer.length, 1);
            assert.ok(answer[0].includes('ECONNREFUSED'), answer[0]);
        });

        describe('via IoT (message type 12)', () => {
            const MCP_RESPONSE = {
                status: 200,
                headers: { 'content-type': 'application/json', 'mcp-session-id': 'session-1' },
                body: '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
            };

            function mcpIot(remote, mcp, sid = 's1', id = 4) {
                return remote.process({ sid, d: [TYPE.MCP, id, 'mcp', mcp] }, 'remote/uuid-1');
            }

            it('answers "Not enabled" if remote access is disabled', async () => {
                const { remote, sent } = createRemote({ remote: false, remoteMcpInstance: 'mcp.0' });
                let called = false;
                remote._mcpRequest = async () => {
                    called = true;
                    return MCP_RESPONSE;
                };
                const answer = await mcpIot(remote, { body: {} });
                await tick();
                assert.deepStrictEqual(answer, { sid: 's1', d: [TYPE.MCP, 4, '', { error: 'Not enabled' }] });
                assert.strictEqual(called, false);
                assert.strictEqual(sent.length, 0);
            });

            it('returns a small answer as one packed message and not via the events server', async () => {
                const { remote, sent } = createRemote();
                const requests = [];
                remote._mcpRequest = async mcp => {
                    requests.push(mcp);
                    return MCP_RESPONSE;
                };
                const mcp = { method: 'POST', headers: { 'mcp-session-id': 'session-1' }, body: { id: 1 } };
                const answer = await mcpIot(remote, mcp);
                await tick();

                assert.ok(!Array.isArray(answer));
                assert.strictEqual(answer.sid, 's1');
                assert.deepStrictEqual(answer.d.slice(0, 3), [TYPE.MCP, 4, '']);
                assert.strictEqual(answer.d.length, 4);
                assert.deepStrictEqual(unpack(answer.d[3]), MCP_RESPONSE);
                assert.deepStrictEqual(requests, [mcp]);
                assert.strictEqual(sent.length, 0);
                assert.deepStrictEqual(Object.keys(remote.packets), []);
            });

            it('splits a big answer into trunks and resends missing trunks', async () => {
                const { remote, sent } = createRemote();
                const response = { ...MCP_RESPONSE, body: randomBytes(200000).toString('base64') };
                remote._mcpRequest = async () => response;
                const published = [];
                remote.registerDevice({
                    publish: (topic, payload, options, cb) => {
                        published.push({ topic, trunk: JSON.parse(payload) });
                        cb();
                    },
                });

                const trunks = await mcpIot(remote, { body: {} }, 's1', 6);
                await tick();

                assert.ok(Array.isArray(trunks) && trunks.length > 1);
                trunks.forEach((trunk, i) => {
                    assert.strictEqual(trunk.sid, 's1');
                    assert.strictEqual(trunk.i, i);
                    assert.strictEqual(trunk.l, trunks.length);
                    assert.deepStrictEqual(trunk.d.slice(0, 3), [TYPE.MCP, 6, '']);
                    assert.ok(JSON.stringify(trunk).length <= MAX_MESSAGE_LENGTH);
                });
                assert.deepStrictEqual(unpack(trunks.map(trunk => trunk.d[3]).join('')), response);
                assert.strictEqual(sent.length, 0);
                assert.deepStrictEqual(Object.keys(remote.packets), ['s1_6']);

                await remote.process({ sid: 's1', d: [TYPE.MISSING, 6, '', [[1]]] }, 'remote/uuid-1');
                await wait(10);
                assert.deepStrictEqual(published, [{ topic: 'response/client/remote/uuid-1', trunk: trunks[1] }]);

                await remote.process({ sid: 's1', d: [TYPE.SENDING_DONE, 6, ''] }, 'remote/uuid-1');
                assert.deepStrictEqual(Object.keys(remote.packets), []);
            });

            it('answers with the error text if the request fails', async () => {
                const { remote, sent } = createRemote();
                remote._mcpRequest = async () => {
                    throw new Error('MCP server is down');
                };
                const answer = await mcpIot(remote, { body: {} });
                assert.deepStrictEqual(answer, { sid: 's1', d: [TYPE.MCP, 4, '', { error: 'MCP server is down' }] });

                // not configured MCP instance, without stub
                const other = createRemote();
                const notConfigured = await mcpIot(other.remote, { body: {} }, 's2', 5);
                assert.deepStrictEqual(notConfigured, {
                    sid: 's2',
                    d: [TYPE.MCP, 5, '', { error: 'MCP instance is not configured' }],
                });
                await tick();
                assert.strictEqual(sent.length + other.sent.length, 0);
            });

            it('forwards the request to the MCP instance', async () => {
                const { remote } = createRemote({ remoteMcpInstance: 'mcp.0' }, { objects: mcpObjects() });
                const body = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
                const answer = await mcpIot(remote, { headers: { 'mcp-session-id': 'session-1' }, body });
                const response = unpack(answer.d[3]);
                assert.strictEqual(response.status, 200);
                assert.strictEqual(response.headers['mcp-session-id'], 'session-1');
                assert.ok(response.body.includes('"tools":[]'));
                assert.strictEqual(received.length, 1);
                assert.deepStrictEqual(JSON.parse(received[0].body), body);
            });
        });
    });
});
