const MESSAGE_TYPES = {
    MESSAGE: 0,
    PING: 1,
    PONG: 2,
    CALLBACK: 3,
    READY: 4,
    WAIT: 5,
    SENDING_DONE: 6,
    MISSING: 7,
    TIMEOUT: 8,
    HTML: 9
};

let axios;
let zlib;

const MAX_IOT_MESSAGE_LENGTH = 127 * 1024;
const MAX_POST_MESSAGE_LENGTH = 127 * 1024;

class RemoteAccess {
    constructor(adapter, clientId) {
        this.adapter = adapter;
        this.device = null;

        if (this.adapter.config.remote) {
            axios = require('axios');
            zlib = require('zlib');

            this.name = {};
            this.objects = {};
            this.packets = {};
            this.clientId = clientId;

            this.handlers = {
                getObject: {f: this.adapter.getForeignObjectAsync.bind(this.adapter), args: 1},
                setObject: {f: this.adapter.setForeignObjectAsync.bind(this.adapter), args: 2},
                getState: {f: this.adapter.getForeignStateAsync.bind(this.adapter), args: 1},
                setState: {f: this.adapter.setForeignStateAsync.bind(this.adapter), args: 2},
                delState: {f: this.adapter.delForeignStateAsync.bind(this.adapter), args: 2},
                getObjectView: {f: this.adapter.getObjectViewAsync.bind(this.adapter), args: 4},
                delObject: {f: this.adapter.delForeignObjectAsync.bind(this.adapter), args: 2},
                delObjects: {f: this.adapter.delForeignObjectAsync.bind(this.adapter), args: 2},
                extendObject: {f: this.adapter.extendForeignObjectAsync.bind(this.adapter), args: 2},
                getForeignStates: {f: this.adapter.getForeignStatesAsync.bind(this.adapter), args: 1},
            };

            this.subscribes = {};
            this.sockets = {};
        }

        this.gcInterval = null;
    }

    registerDevice(device) {
        this.device = device;
    }

    updateState(id, state) {
        this.adapter.config.remote && setImmediate(async (id, state) => {
            const sids = Object.keys(this.sockets);
            for (let s = 0; s < sids.length; s++) {
                await this._sendEvent({name: 'stateChange', id, obj: state, sid: sids[s]})
            }
        }, id, state);
    }

     updateObject(id, obj) {
         this.adapter.config.remote && setImmediate(async (id, obj) => {
             const sids = Object.keys(this.sockets);
             for (let s = 0; s < sids.length; s++) {
                 await this._sendEvent({name: 'objectChange', id, obj, sid: sids[s]})
             }
         }, id, obj);
    }

    destroy() {
        this.gcInterval && clearInterval(this.gcInterval);
        this.gcInterval = null;
        this._unsubscribeAll();
        this.sockets = null;
    }

    _clearMemory() {
        const now = Date.now();
        const DAY = 36000000 * 3;
        Object.keys(this.sockets).forEach(sid => {
            if (now - this.sockets[sid].ts > DAY) {
                this._unsubscribeSocket(sid, 'stateChange');
                this._unsubscribeSocket(sid, 'objectChange');
                this._unsubscribeSocket(sid, 'log');
                delete this.sockets[sid];
            }
        });

        Object.keys(this.packets).forEach(id => {
            if (now - this.packets[id].ts > 120000) {
                delete this.packets[id];
            }
        });
    }

    _readAllObjects() {
        return this.adapter.getObjectListAsync({include_docs: true})
            .then(res => {
                const objects = {};
                this.adapter.log.info('[REMOTE] received all objects');
                if (res) {
                    res = res.rows;

                    for (let i = 0; i < res.length; i++) {
                        objects[res[i].doc._id] = res[i].doc;
                    }
                }
                return objects;
            });
    }

    pattern2RegEx(pattern) {
        if (!pattern || typeof pattern !== 'string') {
            return null;
        }
        if (pattern !== '*') {
            if (pattern[0] === '*' && pattern[pattern.length - 1] !== '*') pattern += '$';
            if (pattern[0] !== '*' && pattern[pattern.length - 1] === '*') pattern = '^' + pattern;
        }
        pattern = pattern.replace(/\./g, '\\.');
        pattern = pattern.replace(/\*/g, '.*');
        pattern = pattern.replace(/\[/g, '\\[');
        pattern = pattern.replace(/]/g, '\\]');
        pattern = pattern.replace(/\(/g, '\\(');
        pattern = pattern.replace(/\)/g, '\\)');
        return pattern;
    }

    _subscribe(sid, type, pattern) {
        //console.log((socket._name || socket.id) + ' subscribe ' + pattern);
        const socket = this.sockets[sid];

        this.subscribes[type] = this.subscribes[type] || {};

        let s;
        if (socket) {
            s = socket._subscribe[type] = socket._subscribe[type] || [];
            for (let i = 0; i < s.length; i++) {
                if (s[i].pattern === pattern) {
                    return;
                }
            }
        }

        let p = this.pattern2RegEx(pattern);
        if (p === null) {
            return this.adapter.log.warn('[REMOTE] Empty or invalid pattern on subscribe!');
        }
        if (socket) {
            s.push({pattern: pattern, regex: new RegExp(p)});
        }

        if (this.subscribes[type][pattern] === undefined) {
            this.subscribes[type][pattern] = 1;
            if (type === 'stateChange') {
                this.adapter.log.debug('[REMOTE] Subscribe STATES: ' + pattern);
                this.adapter.subscribeForeignStates(pattern);
            } else if (type === 'objectChange') {
                this.adapter.log.debug('[REMOTE] Subscribe OBJECTS: ' + pattern);
                return this.adapter.subscribeForeignObjects && this.adapter.subscribeForeignObjects(pattern);
            } else if (type === 'log') {
                this.adapter.log.debug('[REMOTE] Subscribe LOGS');
                this.adapter.requireLog && this.adapter.requireLog(true);
            }
        } else {
            this.subscribes[type][pattern]++;
        }
    };

    _showSubscribes(sid, type) {
        const socket = this.sockets[sid];

        if (socket && socket._subscribe) {
            const s = socket._subscribe[type] || [];
            const ids = [];
            for (let i = 0; i < s.length; i++) {
                ids.push(s[i].pattern);
            }
            this.adapter.log.debug('[REMOTE] Subscribes: ' + ids.join(', '));
        } else {
            this.adapter.log.debug('[REMOTE] Subscribes: no subscribes');
        }
    }

    _updateConnectedInfo() {
        if (this.infoTimeout) {
            clearTimeout(this.infoTimeout);
            this.infoTimeout = null;
        }

        // TODO
        // this.adapter.setState('info.connection', text, true);
    }

    _unsubscribe(sid, type, pattern) {
        const socket = this.sockets[sid];
        this.subscribes[type] = this.subscribes[type] || {};

        if (socket && typeof socket === 'object') {
            if (!socket._subscribe || !socket._subscribe[type]) {
                return;
            }

            for (let i = socket._subscribe[type].length - 1; i >= 0; i--) {
                if (socket._subscribe[type][i].pattern === pattern) {

                    // Remove pattern from global list
                    if (this.subscribes[type][pattern] !== undefined) {
                        this.subscribes[type][pattern]--;
                        if (this.subscribes[type][pattern] <= 0) {
                            if (type === 'stateChange') {
                                this.adapter.log.debug('[REMOTE] Unsubscribe STATES: ' + pattern);
                                //console.log((socket._name || socket.id) + ' unsubscribeForeignStates ' + pattern);
                                this.adapter.unsubscribeForeignStates(pattern);
                            } else if (type === 'objectChange') {
                                this.adapter.log.debug('[REMOTE] Unsubscribe OBJECTS: ' + pattern);
                                //console.log((socket._name || socket.id) + ' unsubscribeForeignObjects ' + pattern);
                                this.adapter.unsubscribeForeignObjects && this.adapter.unsubscribeForeignObjects(pattern);
                            } else if (type === 'log') {
                                //console.log((socket._name || socket.id) + ' requireLog false');
                                this.adapter.log.debug('[REMOTE] Unsubscribe LOGS');
                                this.adapter.requireLog && this.adapter.requireLog(false);
                            }
                            delete this.subscribes[type][pattern];
                        }
                    }

                    delete socket._subscribe[type][i];
                    socket._subscribe[type].splice(i, 1);
                    return;
                }
            }
        } else {
            // Remove pattern from global list
            if (this.subscribes[type][pattern] !== undefined) {
                this.subscribes[type][pattern]--;
                if (this.subscribes[type][pattern] <= 0) {
                    if (type === 'stateChange') {
                        this.adapter.log.debug('[REMOTE] Unsubscribe STATES: ' + pattern);
                        this.adapter.unsubscribeForeignStates(pattern);
                    } else if (type === 'objectChange') {
                        this.adapter.log.debug('[REMOTE] Unsubscribe OBJECTS: ' + pattern);
                        this.adapter.unsubscribeForeignObjects && this.adapter.unsubscribeForeignObjects(pattern);
                    } else if (type === 'log') {
                        this.adapter.log.debug('[REMOTE] Unsubscribe LOGS');
                        this.adapter.requireLog && this.adapter.requireLog(false);
                    }
                    delete this.subscribes[type][pattern];
                }
            }
        }
    };

    _unsubscribeAll() {
        Object.keys(this.sockets).forEach(sid => {
            this._unsubscribe(sid, 'stateChange');
            this._unsubscribe(sid, 'objectChange');
            this._unsubscribe(sid, 'log');
        });
    };

    _unsubscribeSocket(sid, type) {
        const socket = this.sockets[sid];

        if (!socket || !socket._subscribe || !socket._subscribe[type]) {
            return;
        }

        for (let i = 0; i < socket._subscribe[type].length; i++) {
            const pattern = socket._subscribe[type][i].pattern;
            if (this.subscribes[type][pattern] !== undefined) {
                this.subscribes[type][pattern]--;
                if (this.subscribes[type][pattern] <= 0) {
                    if (type === 'stateChange') {
                        this.adapter.log.debug('[REMOTE] Unsubscribe STATES: ' + pattern);
                        this.adapter.unsubscribeForeignStates(pattern);
                    } else if (type === 'objectChange') {
                        this.adapter.log.debug('[REMOTE] Unsubscribe OBJECTS: ' + pattern);
                        this.adapter.unsubscribeForeignObjects && this.adapter.unsubscribeForeignObjects(pattern);
                    } else if (type === 'log') {
                        this.adapter.log.debug('[REMOTE] Unsubscribe LOGS: ' + pattern);
                        this.adapter.requireLog && this.adapter.requireLog(false);
                    }
                    delete this.subscribes[type][pattern];
                }
            }
        }
    }

    _subscribeSocket(sid, type) {
        const socket = this.sockets[sid];

        if (!socket || !socket._subscribe || !socket._subscribe[type]) {
            return;
        }

        for (let i = 0; i < socket._subscribe[type].length; i++) {
            const pattern = socket._subscribe[type][i].pattern;
            if (this.subscribes[type][pattern] === undefined){
                this.subscribes[type][pattern] = 1;
                if (type === 'stateChange') {
                    this.adapter.log.debug('[REMOTE] Subscribe STATES: ' + pattern);
                    this.adapter.subscribeForeignStates(pattern);
                } else if (type === 'objectChange') {
                    this.adapter.log.debug('[REMOTE] Subscribe OBJECTS: ' + pattern);
                    this.adapter.subscribeForeignObjects && this.adapter.subscribeForeignObjects(pattern);
                } else if (type === 'log') {
                    this.adapter.log.debug('[REMOTE] Subscribe LOGS');
                    this.adapter.requireLog && this.adapter.requireLog(true);
                }
            } else {
                this.subscribes[type][pattern]++;
            }
        }
    }

    _sendEvent(message) {
        return axios.post('https://remote-events.iobroker.in/', message, { validateStatus: status => status === 200 })
            .then(response => {
                console.log(response.data || response.status);
            })
            .catch(error => {
                let errorMessage;
                if (error.response) {
                    errorMessage = error.response.data || error.response.status;
                } else if (error.request) {
                    errorMessage = 'No answer';
                } else {
                    errorMessage = error.message;
                }

                if (errorMessage.error === 'invalid connectionId') {
                    if (this.sockets[message.sid]) {
                        this.adapter.log.warn('[REMOTE] delete connection id ' + message.sid);
                        delete this.sockets[message.sid];
                    }
                }

                this.adapter.log.warn(`[REMOTE] Cannot send status update: ${typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage}`);
            });
    }

    process(request, serviceType) {
        let message;
        try {
            message = JSON.parse(request);
        } catch (err) {
            this.adapter.log.error('[REMOTE] Cannot parse request: ' + request);
            message = null;
        }

        if (message) {
            const [_type, id, name, args] = message.d;

            if (!this.adapter.config.remote) {
                return Promise.resolve(JSON.stringify({sid: message.sid, d: [_type, id, name, ['Not enabled']]}));
            }

            if (_type === MESSAGE_TYPES.MISSING) {
                if (this.packets[id]) {
                    const missing = args[0];
                    this.adapter.log.warn(`[REMOTE] Request for existing trunks: ${id}, "${name}": ${missing}`);

                    this.device && setImmediate(async () => {
                        try {
                            for (let m = 0; m < missing.length; m++) {
                                await new Promise((resolve, reject) => this.device.publish(
                                    `response/${this.clientId}/${serviceType}`,
                                    JSON.stringify(this.packets[id].trunks[m]),
                                    {qos: 1},
                                    error => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            resolve();
                                        }
                                    }
                                ));
                            }
                        } catch (err) {
                            this.adapter.log.error('[REMOTE] Cannot send packet: ' + err);
                        }
                    });
                } else {
                    this.adapter.log.warn(`[REMOTE] Request for non existing trunks: ${id}, "${name}"`);
                }
                return Promise.resolve('___none___');
            } else if (_type === MESSAGE_TYPES.SENDING_DONE) {
                this.adapter.log.debug(`[REMOTE] Packet received: ${id}, "${name}"`);
                delete this.packets[id];
                return Promise.resolve('___none___');
            } else
            if (_type === MESSAGE_TYPES.HTML) {
                // request for html file
                if (name.startsWith('/admin')) {

                } else {
                    const path = name.split('?')[0];
                    const parts = path.split('/');
                    parts.shift();
                    const _adapter = parts.shift();
                    this.adapter.log.debug('[REMOTE] HTML: ' + path);

                    return this.adapter.readFileAsync(_adapter, parts.join('/'))
                        .then(data => {
                            data.file = Buffer.from(data.file).toString('base64');
                            return data;
                        }).
                        catch(err =>
                            // try to read from server
                            // TODO: use settings
                            axios('http://localhost:8082' + path, {responseType: 'arraybuffer', validateStatus: status => status === 200})
                                .then(response => {
                                    // replace port
                                    if (path.endsWith('_socket/info.js')) {
                                        response.data = response.data.toString();
                                        // var socketUrl = ":8084"; var socketSession = ""; window.sysLang = "ru"; window.socketForceWebSockets = false;
                                        // replace ":8084"; => "";
                                        response.data = response.data.replace(/":\d+";/, '"";');
                                    }

                                    return {
                                        file: Buffer.from(response.data).toString('base64'),
                                        mimeType: response.headers['content-type']
                                    };
                                })
                                .catch(error => {
                                    let errorMessage;
                                    if (error.response && error.response.status === 404) {
                                        errorMessage = 'Not exists';
                                    } else if (error.response && error.response.status === 401) {
                                        errorMessage = 'Not authorised';
                                    } else {
                                        if (error.response) {
                                            errorMessage = error.response.data || error.response.status;
                                        } else if (error.request) {
                                            errorMessage = 'No answer';
                                        } else {
                                            errorMessage = error.message;
                                        }
                                    }
                                    return {sid: message.sid, d: [_type, id, '', {error: errorMessage}]};
                                })
                        )
                        .then(data => {
                            // if error
                            if (data.sid) {
                                return data;
                            } else {
                                if (data.file.length > 3000000) {
                                    // file too big
                                    return {sid: message.sid, d: [_type, id, '', {error: 'File is too big: ' + data.file.length + ', max 3.000.000'}]};
                                }

                                let packed = zlib.deflateSync(JSON.stringify(data)).toString('base64');
                                if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                                    const packets = [];
                                    while (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                                        const trunk = packed.substring(0, MAX_IOT_MESSAGE_LENGTH);
                                        packed = packed.substring(MAX_IOT_MESSAGE_LENGTH);
                                        packets.push(trunk);
                                    }
                                    if (packed.length) {
                                        packets.push(packed);
                                    }

                                    const trunks = packets.map((trunk, i) =>
                                        ({sid: message.sid, i, l: packets.length, d: [_type, id, '', trunk]}));

                                    this.packets[id] = {ts: Date.now(), trunks};

                                    // start garbage collector
                                    this.gcInterval = this.gcInterval || setInterval(() => this._clearMemory(), 60000);

                                    return trunks;
                                } else {
                                    return {sid: message.sid, d: [_type, id, '', packed]};
                                }
                            }
                        });
                }
            }

            if (!this.sockets[message.sid]) {
                this.adapter.log.debug('[REMOTE] CONNECT ' + message.sid);
                this.sockets[message.sid] = {_subscribe: {}, ts: Date.now()};
            } else {
                this.sockets[message.sid].ts = Date.now();
            }

            let promiseOne;
            if (this.handlers[name]) {
                if (!this.handlers[name].args) {
                    promiseOne = this.handlers[name].f();
                } else if (this.handlers[name].args === 1) {
                    promiseOne = this.handlers[name].f(args[0]);
                } else if (this.handlers[name].args === 2) {
                    promiseOne = this.handlers[name].f(args[0], args[1]);
                } else if (this.handlers[name].args === 3) {
                    promiseOne = this.handlers[name].f(args[0], args[1], args[2]);
                } else if (this.handlers[name].args === 4) {
                    promiseOne = this.handlers[name].f(args[0], args[1], args[2], args[3]);
                } else if (this.handlers[name].args === 5) {
                    promiseOne = this.handlers[name].f(args[0], args[1], args[2], args[3], args[4]);
                } else if (this.handlers[name].args === 6) {
                    promiseOne = this.handlers[name].f(args[0], args[1], args[2], args[3], args[4], args[5]);
                } else {
                    this.adapter.log.warn('[REMOTE] Unsupported number of arguments');
                }
            } else if (name === 'name') {
                const socket = this.sockets[message.sid];
                if (socket.name === undefined) {
                    socket.name = name;
                    this.adapter.log.info(`[REMOTE] socket ${message.sid} connected with name "${name}"`);
                } else if (socket.name !== name) {
                    this.adapter.log.warn(`[REMOTE] socket ${message.sid} changed socket name from ${socket.name} to ${name}`);
                    socket.name = name;
                }

                // start garbage collector
                this.gcInterval = this.gcInterval || setInterval(() => this._clearMemory(), 60000);

                return Promise.resolve({sid: message.sid, d: [_type, id, name, []]});
            } else if (name === 'authenticate') {
                return Promise.resolve({sid: message.sid, d: [_type, id, name, [true, false]]});
            } else if (name === 'getObjects') {
                promiseOne = this._readAllObjects();
            } else if (name === 'getHostByIp') {
                return this.adapter.getObjectViewAsync('system', 'host', {})
                    .then(data => {
                        const ip = args[0];
                        if (data && data.rows && data.rows.length) {
                            for (let i = 0; i < data.rows.length; i++) {
                                const obj = data.rows[i].value;
                                // if we requested specific name
                                if (obj.common.hostname === ip) {
                                    return {sid: message.sid, d: [_type, id, name, [ip, obj]]};
                                } else
                                // try to find this IP in the list
                                if (obj.native.hardware && obj.native.hardware.networkInterfaces) {
                                    const net = obj.native.hardware.networkInterfaces;
                                    for (const eth in net) {
                                        if (!net.hasOwnProperty(eth)) {
                                            continue;
                                        }
                                        for (let j = 0; j < net[eth].length; j++) {
                                            if (net[eth][j].address === ip) {
                                                return {sid: message.sid, d: [_type, id, name, [ip, obj]]};
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        return {sid: message.sid, d: [_type, id, name, [ip, null]]};
                    });
            } else if (name === 'getStates') {
                promiseOne = this.adapter.getForeignStatesAsync('*');
            } else if (name === 'getBinaryState') {
                promiseOne = this.adapter.getBinaryStateAsync(args[0])
                    .then(data => {
                        if (data) {
                            data = Buffer.from(data).toString('base64');
                        }
                        return data;
                    });
            } else if (name === 'setBinaryState') {
                let data = null;
                try {
                    data = Buffer.from(args[1], 'base64')
                } catch (e) {
                    this.adapter.log.warn('[REMOTE] [setBinaryState] Cannot convert base64 data: ' + e);
                }

                promiseOne = this.adapter.setBinaryStateAsync(args[0], data);
            } else if (name === 'requireLog') {
                const isEnabled = args[0];
                if (isEnabled) {
                    this._subscribe(this, 'log', 'dummy');
                } else {
                    this._unsubscribe(this, 'log', 'dummy');
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'log');

                return Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'DCT') { // disconnect
                const socket = this.sockets[message.sid];
                this.adapter.log.debug('[REMOTE] Disconnect ' + message.sid);
                if (socket) {
                    this._unsubscribeSocket(message.sid, 'stateChange');
                    this._unsubscribeSocket(message.sid, 'objectChange');
                    this._unsubscribeSocket(message.sid, 'log');
                    delete this.sockets[message.sid];
                }
                return Promise.resolve('___none___');
            } else if (name === 'getVersion') {
                return Promise.resolve({sid: message.sid, d: [_type, id, name, [this.adapter.version]]});
            } else if (name === 'subscribe' || name === 'subscribeStates') {
                const pattern = args[0];
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._subscribe(message.sid, 'stateChange', pattern[p]);
                    }
                } else {
                    this._subscribe(message.sid, 'stateChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'stateChange');
                return Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'unsubscribe' || name === 'unsubscribeStates') {
                const pattern = args[0];
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._unsubscribe(message.sid, 'stateChange', pattern[p]);
                    }
                } else {
                    this._unsubscribe(message.sid, 'stateChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'stateChange');
                return Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'subscribeObjects') {
                const pattern = args[0];
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._subscribe(message.sid, 'objectChange', pattern[p]);
                    }
                } else {
                    this._subscribe(message.sid, 'objectChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'objectChange');
                return Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'unsubscribeObjects') {
                const pattern = args[0];
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._unsubscribe(message.sid, 'objectChange', pattern[p]);
                    }
                } else {
                    this._unsubscribe(message.sid, 'objectChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'objectChange');
                return Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'authEnabled') {
                return Promise.resolve({sid: message.sid, d: [_type, id, name, [false, ' admin']]});
            } else if (name === 'readFile') {
                const adapter = args[0];
                const fileName = args[1];
                return this.adapter.readFileAsync(adapter, fileName)
                    .then(data => {
                        let packed = zlib.deflateSync(JSON.stringify([null, data.file, data.mimeType])).toString('base64');
                        return {sid: message.sid, d: [_type, id, name, packed]};
                    })
                    .catch(error => ({sid: message.sid, d: [_type, id, name, [error]]}));
            }

            if (promiseOne) {
                return promiseOne
                    .then(result => {
                        let packed = zlib.deflateSync(JSON.stringify([null, result])).toString('base64');

                        if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                            // too big message. Do not use iot for that and send directly to socket
                            /*const packets = []
                            while (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                                const trunk = packed.substring(0, MAX_IOT_MESSAGE_LENGTH);
                                packed = packed.substring(MAX_IOT_MESSAGE_LENGTH);
                                packets.push(trunk);
                            }
                            if (packed.length) {
                                packets.push(packed);
                            }

                            const trunks = packets.map((trunk, i) =>
                                sid: message.sid, i, l: packets.length, d: [_type, id, name, trunk]}));

                            this.packets[id] = {ts: Date.now(), trunks};

                            // start garbage collector
                            this.gcInterval = this.gcInterval || setInterval(() => this._clearMemory(), 60000);

                            return trunks;*/
                            setImmediate(async () => {
                                if (packed.length > MAX_POST_MESSAGE_LENGTH) {
                                    // too big message. Do not use iot for that and send directly to socket
                                    const packets = []
                                    while (packed.length > MAX_POST_MESSAGE_LENGTH) {
                                        const trunk = packed.substring(0, MAX_POST_MESSAGE_LENGTH);
                                        packed = packed.substring(MAX_POST_MESSAGE_LENGTH);
                                        packets.push(trunk);
                                    }
                                    if (packed.length) {
                                        packets.push(packed);
                                    }

                                    for (let i = 0; i < packets.length; i++) {
                                        await this._sendEvent({sid: message.sid, d: [_type, id, name, packets[i], packets.length, i]});
                                    }
                                } else {
                                    await this._sendEvent({sid: message.sid, d: [_type, id, name, packed]});
                                }
                            });

                            return {sid: message.sid, d: [MESSAGE_TYPES.WAIT, id, name, [packed.length]]};
                        } else {
                            return {sid: message.sid, d: [_type, id, name, packed]};
                        }
                    })
                    .catch(error => ({sid: message.sid, d: [_type, id, name, [error]]}));
            } else {
                return Promise.resolve({sid: message.sid, d: [_type, id, name, ['Unknown command']]});
            }
        }
    }
}

module.exports = RemoteAccess;
