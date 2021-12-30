const Utils = require('./Utils');

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
    HTML: 9,
    COMBINED_CALLBACK: 10,
    COMBINED_MESSAGE: 11,
};

const SUPPORTED_ADAPTERS = ['admin', 'vis', 'flot', 'echarts', 'material', 'eventlist', 'iqontrol'];
let axios;
let zlib;

const MAX_IOT_MESSAGE_LENGTH = 127 * 1024;
const MAX_POST_MESSAGE_LENGTH = 127 * 1024;
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function processWelcome(welcomeScreen, isPro, adapterObj, foundInstanceIDs, list) {
    if (welcomeScreen) {
        welcomeScreen = JSON.parse(JSON.stringify(welcomeScreen));
        if (Array.isArray(welcomeScreen)) {
            for (let w = 0; w < welcomeScreen.length; w++) {
                // temporary disabled for non pro
                if (!isPro && welcomeScreen[w].name === 'vis editor') {
                    continue;
                }
                if (welcomeScreen[w].localLinks && typeof welcomeScreen[w].localLinks === 'string') {
                    welcomeScreen[w].localLink = adapterObj.common.localLinks[welcomeScreen[w].localLinks];
                    if (typeof welcomeScreen[w].localLink === 'object') {
                        welcomeScreen[w].localLink = welcomeScreen[w].localLink.link;
                    }
                } else
                if (welcomeScreen[w].localLink && typeof welcomeScreen[w].localLink === 'boolean') {
                    welcomeScreen[w].localLink = adapterObj.common.localLink;
                }

                welcomeScreen[w].pro = isPro;
                if (welcomeScreen[w].localLink) {
                    if (foundInstanceIDs.length > 1) {
                        foundInstanceIDs.forEach(id => {
                            const _welcomeScreen = JSON.parse(JSON.stringify(welcomeScreen));
                            _welcomeScreen.id = id;
                            _welcomeScreen.instance = parseInt(id.split('.').pop(), 10);
                            _welcomeScreen.adapter = id.replace(/^system\.adapter\./, '').replace(/\.\d+$/, '');
                            list.push(_welcomeScreen);
                        });
                    } else {
                        welcomeScreen[w].id = foundInstanceIDs[0];
                        welcomeScreen[w].instance = adapterObj.common.instance || 0;
                        welcomeScreen[w].adapter = adapterObj.common.name;
                        list.push(welcomeScreen[w]);
                    }
                } else {
                    welcomeScreen[w].instance = adapterObj.common.instance || 0;
                    welcomeScreen[w].adapter = adapterObj.common.name;
                    list.push(welcomeScreen[w]);
                }
            }
        } else {
            if (welcomeScreen.localLinks && typeof welcomeScreen.localLinks === 'string') {
                welcomeScreen.localLink = adapterObj.common.localLinks[welcomeScreen.localLinks];
                if (typeof welcomeScreen.localLink === 'object') {
                    welcomeScreen.localLink = welcomeScreen.localLink.link;
                }
            } else
            if (welcomeScreen.localLink && typeof welcomeScreen.localLink === 'boolean') {
                welcomeScreen.localLink = adapterObj.common.localLink;
            }
            welcomeScreen.pro = isPro;
            if (welcomeScreen.localLink) {
                if (foundInstanceIDs.length > 1) {
                    foundInstanceIDs.forEach(id => {
                        const _welcomeScreen = JSON.parse(JSON.stringify(welcomeScreen));
                        _welcomeScreen.id = id;
                        _welcomeScreen.instance = parseInt(id.split('.').pop(), 10);
                        _welcomeScreen.adapter = id.replace(/^system\.adapter\./, '').replace(/\.\d+$/, '');
                        list.push(_welcomeScreen);
                    });
                } else {
                    welcomeScreen.id = foundInstanceIDs[0];
                    welcomeScreen.instance = adapterObj.common.instance || 0;
                    welcomeScreen.adapter = adapterObj.common.name;
                    list.push(welcomeScreen);
                }
            } else {
                welcomeScreen.instance = adapterObj.common.instance || 0;
                welcomeScreen.adapter = adapterObj.common.name;
                list.push(welcomeScreen);
            }
        }
    }
}

class RemoteAccess {
    constructor(adapter, clientId) {
        this.adapter = adapter;
        this.device = null;

        if (this.adapter.config.remote) {
            this.adminInstance = 'admin.0';
            this.webInstance = 'web.0';

            axios = require('axios');
            zlib = require('zlib');

            this.name = {};
            this.objects = {};
            this.packets = {};
            this.clientId = clientId;
            this.objectsCache = {};
            this.statesCache = {};

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

    static NONE = '___none___';

    setLanguage(_lang) {
        this.lang = _lang || 'de';
    }

    registerDevice(device) {
        this.device = device;
    }

    async _getListOfAllAdapters() {
        // read all instances
        const instances = await this.adapter.getObjectViewAsync('system', 'instance', {});
        const adapters = await this.adapter.getObjectViewAsync('system', 'adapter', {});

        // TODO: ignore disabled web adapters

        const objects = {};

        let list = [];
        const mapInstance = {};
        for (let r = 0; r < instances.rows.length; r++) {
            mapInstance[instances.rows[r].id] = instances.rows[r].value;
            objects[instances.rows[r].id] = instances.rows[r].value;
        }
        for (let a = 0; a < adapters.rows.length; a++) {
            const obj = adapters.rows[a].value;
            objects[adapters.rows[a].id] = adapters.rows[a].value;
            let found;
            if (instances && instances.rows) {
                found = [];
                // find if any instance of this adapter is exists and started
                for (let i = 0; i < instances.rows.length; i++) {
                    let id = instances.rows[i].id;
                    const ids = id.split('.');
                    ids.pop();
                    id = ids.join('.');
                    if (id === obj._id && instances.rows[i].value.common) {// && (true || instances.rows[i].value.common.enabled || instances.rows[i].value.common.onlyWWW)) {
                        found.push(instances.rows[i].id);
                    }
                }
            }

            if (found && found.length) {
                processWelcome(obj.common.welcomeScreen, false, obj, found, list);
                processWelcome(obj.common.welcomeScreenPro, true, obj, found, list);
                /*if (obj.common.welcomeScreen || obj.common.welcomeScreenPro) {
                    if (obj.common.welcomeScreen) {
                        if (obj.common.welcomeScreen instanceof Array) {
                            for (let w = 0; w < obj.common.welcomeScreen.length; w++) {
                                // temporary disabled
                                if (obj.common.welcomeScreen[w].name === 'vis editor') {
                                    continue;
                                }
                                if (obj.common.welcomeScreen[w].localLinks && typeof obj.common.welcomeScreen[w].localLinks === 'string') {
                                    obj.common.welcomeScreen[w].localLink = obj.common.localLinks[obj.common.welcomeScreen[w].localLinks];
                                    if (typeof obj.common.welcomeScreen[w].localLink === 'object') {
                                        obj.common.welcomeScreen[w].localLink = obj.common.welcomeScreen[w].localLink.link;
                                    }
                                } else
                                if (obj.common.welcomeScreen[w].localLink && typeof obj.common.welcomeScreen[w].localLink === 'boolean') {
                                    obj.common.welcomeScreen[w].localLink = obj.common.localLink;
                                }

                                if (obj.common.welcomeScreen[w].localLink) {
                                    if (found.length > 1) {
                                        found.forEach(id => {
                                            const welcomeScreen = JSON.stringify(JSON.parse(obj.common.welcomeScreen[w]));
                                            welcomeScreen.id = id;
                                            list.push(welcomeScreen);
                                        });
                                    } else {
                                        obj.common.welcomeScreen[w].id = found[0];
                                        list.push(obj.common.welcomeScreen[w]);
                                    }
                                } else {
                                    list.push(obj.common.welcomeScreen[w]);
                                }
                            }
                        } else {
                            if (obj.common.welcomeScreen.localLinks && typeof obj.common.welcomeScreen.localLinks === 'string') {
                                obj.common.welcomeScreen.localLink = obj.common.localLinks[obj.common.welcomeScreen.localLinks];
                                if (typeof obj.common.welcomeScreen.localLink === 'object') {
                                    obj.common.welcomeScreen.localLink = obj.common.welcomeScreen.localLink.link;
                                }
                            } else
                            if (obj.common.welcomeScreen.localLink && typeof obj.common.welcomeScreen.localLink === 'boolean') {
                                obj.common.welcomeScreen.localLink = obj.common.localLink;
                            }

                            if (obj.common.welcomeScreen.localLink) {
                                if (found.length > 1) {
                                    found.forEach(id => {
                                        const welcomeScreen = JSON.stringify(JSON.parse(obj.common.welcomeScreen));
                                        welcomeScreen.id = id;
                                        list.push(welcomeScreen);
                                    });
                                } else {
                                    obj.common.welcomeScreen.id = found[0];
                                    list.push(obj.common.welcomeScreen);
                                }
                            } else {
                                list.push(obj.common.welcomeScreen);
                            }
                        }
                    }
                    if (obj.common.welcomeScreenPro) {
                        if (obj.common.welcomeScreenPro instanceof Array) {
                            for (let ww = 0; ww < obj.common.welcomeScreenPro.length; ww++) {
                                const tile = Object.assign({}, obj.common.welcomeScreenPro[ww]);
                                tile.pro = true;
                                if (tile.localLinks && typeof tile.localLinks === 'string') {
                                    tile.localLink = obj.common.localLinks[tile.localLinks];
                                    if (typeof tile.localLink === 'object') {
                                        tile.localLink = tile.localLink.link;
                                    }
                                } else
                                if (tile.localLink && typeof tile.localLink === 'boolean') {
                                    tile.localLink = obj.common.localLink;
                                }
                                if (tile.localLink) {
                                    tile.id = found;
                                }
                                list.push(tile);
                            }
                        } else {
                            const tile_ = Object.assign({}, obj.common.welcomeScreenPro);
                            tile_.pro = true;
                            if (tile_.localLinks && typeof tile_.localLinks === 'string') {
                                tile_.localLink = obj.common.localLinks[tile_.localLinks];
                                if (typeof tile_.localLink === 'object') {
                                    tile_.localLink = tile_.localLink.link;
                                }
                            } else
                            if (tile_.localLink && typeof tile_.localLink === 'boolean') {
                                tile_.localLink = obj.common.localLink;
                            }
                            if (tile_.localLink) {
                                if (found.length > 1) {
                                    found.forEach(id => {
                                        const welcomeScreen = JSON.stringify(JSON.parse(obj.common.tile_));
                                        welcomeScreen.id = id;
                                        list.push(welcomeScreen);
                                    });
                                } else {
                                    tile_.id = found[0];
                                    list.push(obj.common.welcomeScreen);
                                }
                            } else {
                                list.push(tile_);
                            }
                        }
                    }
                }*/
            }
        }

        list.sort((a, b) => {
            const aName = (typeof a.name === 'object' ? a.name[this.lang] || a.name.en : a.name).toLowerCase();
            const bName = (typeof b.name === 'object' ? b.name[this.lang] || b.name.en : b.name).toLowerCase();
            if (a.order === undefined && b.order === undefined) {
                if (aName > bName) {
                    return 1;
                }
                if (aName < bName) {
                    return -1;
                }
                return 0;
            } else if (a.order === undefined) {
                return -1;
            } else if (b.order === undefined) {
                return 1;
            } else {
                if (a.order > b.order) {
                    return 1;
                }
                if (a.order < b.order) {
                    return -1;
                }
                if (aName > bName) {
                    return 1;
                }
                if (aName < bName) {
                    return -1;
                }
                if (a.instance !== undefined && b.instance !== undefined) {
                    if (a.instance > b.instance) {
                        return 1;
                    }
                    if (a.instance < b.instance) {
                        return -1;
                    }
                }

                return 0;
            }
        });

        const context = {
            objects,
            adminInstance: this.adminInstance,
            hostname: this.adapter.common.host,
            protocol: 'https'
        }

        // calculate localLinks
        for (let t = 0; t < list.length; t++) {
            list[t].link = list[t].link ? Utils.replaceLink(list[t].link, list[t].adapter, list[t].instance, context) : null;
        }

        list.forEach(item => item.link = item.link && item.link[0] && item.link[0].url);
        list = list.filter(item => item.link);

        // remove lovelace and all double adapters
        let remove = [];
        for (let i = 0; i < list.length; i++) {
            if (!SUPPORTED_ADAPTERS.includes(list[i].adapter)) {
                !remove.includes(i) && remove.push(i);
                continue;
            }

            // try to find similar links
            for (let j = 0; j < list.length; j++) {
                if (j === i) {
                    continue;
                }
                if (list[i].link === list[j].link && !remove.includes(j)) {
                    remove.push(j);
                }
            }
        }

        for (let r = remove.length - 1; r >= 0; r--) {
            list.splice(remove[r], 1);
        }

        return list;
    }

    updateState(id, state) {
        if (this.adapter.config.remote) {
            const cache = JSON.stringify(state);

            if (this.statesCache[id] && this.statesCache[id] !== cache) {
                this.adapter.log.debug(`[REMOTE] send stateChange "${id}": ${JSON.stringify(state)}`);

                this.statesCache[id] = cache;
                setImmediate(async (id, state) => {
                    const sids = Object.keys(this.sockets);
                    for (let s = 0; s < sids.length; s++) {
                        const error = await this._sendEvent({name: 'stateChange', id, obj: state, sid: sids[s]});
                        if (error) {
                            this.adapter.log.error('[REMOTE] cannot send stateChange: ' + JSON.stringify(error));
                        }
                    }
                }, id, state);
            } else {
                this.adapter.log.debug(`[REMOTE] ignore stateChange "${id}": ${JSON.stringify(state)}`);
            }
        }
    }

    updateObject(id, obj) {
         if (this.adapter.config.remote) {
             const cache = JSON.stringify(obj);
             if (this.objectsCache[id] && this.objectsCache[id] !== cache) {
                 this.objectsCache[id] = cache;
                 setImmediate(async (id, obj) => {
                     const sids = Object.keys(this.sockets);
                     for (let s = 0; s < sids.length; s++) {
                         const error = await this._sendEvent({name: 'objectChange', id, obj, sid: sids[s]});
                         if (error) {
                             this.adapter.log.error('[REMOTE] cannot send objectChange: ' + JSON.stringify(error));
                         }
                     }
                 }, id, obj);
             }
         }
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
        return axios.post('https://remote-events.iobroker.in/', message, { validateStatus: status => status === 200, timeout: 1500 })
            .then(response => {
                /*console.log(response.data || response.status)*/
                return false;
            })
            .catch(error => {
                let errorMessage;
                if (error.response) {
                    errorMessage = error.response.data || error.response.status;
                } else {
                    errorMessage = error.message;
                }

                this.adapter.log.warn(`[REMOTE] Cannot send status update to ${message.sid}: ${JSON.stringify(errorMessage)}`);

                if (errorMessage.error === 'invalid connectionId') {
                    if (this.sockets[message.sid]) {
                        this.adapter.log.warn('[REMOTE] delete connection id ' + message.sid);
                        delete this.sockets[message.sid];
                    }
                }

                return errorMessage;
            });
    }

    async _getStatesManyArgs(args) {
        const response = [];
        for (let a = 0; a < args.length; a++) {
            const id = args[a][0];
            try {
                const result = await this.adapter.getForeignStatesAsync(id || '*');
                response[a] = [null, result];
                result && Object.keys(result)
                    .forEach(id => this.statesCache[id] = result[id]);
            } catch (error) {
                response[a] = [error];
            }
        }
        return response;
    }

    async _getStateManyArgs(args, func) {
        const response = [];
        for (let a = 0; a < args.length; a++) {
            const id = args[a][0];
            try {
                const result = await this.adapter.getForeignStateAsync(id || '*');
                response[a] = [null, result];
                this.statesCache[id] = result;
            } catch (error) {
                response[a] = [error];
            }
        }
        return response;
    }

    async _subscribeManyArgs(sid, args) {
        const response = [];
        for (let a = 0; a < args.length; a++) {
            const pattern = args[a][0];
            if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                for (let p = 0; p < pattern.length; p++) {
                    this._subscribe(sid, 'stateChange', pattern[p]);
                }
            } else {
                this._subscribe(sid, 'stateChange', pattern);
            }
        }
        return response;
    }

    async _unsubscribeManyArgs(sid, args) {
        const response = [];
        for (let a = 0; a < args.length; a++) {
            const pattern = args[a][0];
            if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                for (let p = 0; p < pattern.length; p++) {
                    this._unsubscribe(sid, 'stateChange', pattern[p]);
                }
            } else {
                this._unsubscribe(sid, 'stateChange', pattern);
            }
        }
        return response;
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
            let promiseOne;
            let promiseResult;

            if (!this.adapter.config.remote) {
                promiseResult = Promise.resolve(JSON.stringify({sid: message.sid, d: [_type, id, name, ['Not enabled']]}));
            } else
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
                promiseResult = Promise.resolve(RemoteAccess.NONE);
            } else if (_type === MESSAGE_TYPES.SENDING_DONE) {
                this.adapter.log.debug(`[REMOTE] Packet received: ${id}, "${name}"`);
                delete this.packets[id];
                promiseResult = Promise.resolve(RemoteAccess.NONE);
            } else
            if (_type === MESSAGE_TYPES.HTML) {
                let promiseFile;

                if (name === 'listOfPrograms') {
                    promiseFile = this._getListOfAllAdapters()
                        .then(result => {
                            let packed = zlib.deflateSync(JSON.stringify([null, result])).toString('base64');
                            return {sid: message.sid, d: [_type, id, '', packed]};
                        })
                        .catch(error =>
                            ({sid: message.sid, d: [_type, id, '', [error.toString()]]}));
                } else
                // request for html file
                if (name.startsWith('/admin')) {
                    promiseFile = Promise.resolve({sid: message.sid, d: [_type, id, '', {error: 'Not exists'}]});
                } else {
                    const path = name.split('?')[0];
                    const parts = path.split('/');
                    parts.shift();
                    const _adapter = parts.shift();
                    this.adapter.log.debug('[REMOTE] HTML: ' + path);

                    // html must be returned only by iot channel, as lambda must process the answer
                    promiseFile = this.adapter.readFileAsync(_adapter, parts.join('/'))
                        .then(data => {
                            data.file = Buffer.from(data.file).toString('base64');
                            return data;
                        }).
                        catch(err =>
                            // try to read from server
                            // TODO: use settings
                            axios('http://localhost:8082' + path, {responseType: 'arraybuffer', validateStatus: status => status === 200, timeout: 500})
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
                        );
                }

                return promiseFile
                    .then(data => {
                        // if error
                        if (data.sid) {
                            return data;
                        } else {
                            if (data.file.length > MAX_FILE_SIZE) {
                                // file too big
                                this.adapter.log.warn(`[REMOTE] Requested file ${name} is too big (${Math.round(data.file.length / 1000)}Kb). Max length is ${MAX_FILE_SIZE / 1024}Kb`);
                                return {sid: message.sid, d: [_type, id, '', {error: `File is too big: ${Math.round(data.file.length / 1000)}Kb, max ${MAX_FILE_SIZE / 1024}Kb`}]};
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

            if (!this.sockets[message.sid]) {
                this.adapter.log.debug('[REMOTE] CONNECT ' + message.sid);
                this.sockets[message.sid] = {_subscribe: {}, ts: Date.now()};
            } else {
                this.sockets[message.sid].ts = Date.now();
            }

            if (promiseResult) {
                // this answer will be processed at the very end of function
            } else
            if (_type === MESSAGE_TYPES.COMBINED_CALLBACK || _type === MESSAGE_TYPES.COMBINED_MESSAGE) {
                let promiseMany;
                if (name === 'getStates') {
                    promiseMany = this._getStatesManyArgs(args);
                } else if (name === 'getState') {
                    promiseMany = this._getStateManyArgs(args);
                } else if (name === 'subscribe' || name === 'subscribeStates') {
                    promiseMany = this._subscribeManyArgs(message.sid, args);
                } else if (name === 'unsubscribe' || name === 'unsubscribeStates') {
                    promiseMany = this._unsubscribeManyArgs(message.sid, args);
                } else {
                    // error
                    this.adapter.log.error('[REMOTE] Received unknown multiple request: ' + name);
                    promiseResult = Promise.resolve({sid: message.sid, d: [_type, id, name, ['Unknown command']]});
                }
                if (promiseMany) {
                    promiseResult = promiseMany
                        .then(result => {
                            let packed = zlib.deflateSync(JSON.stringify(result)).toString('base64');

                            if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
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
                                            const error = await this._sendEvent({sid: message.sid, d: [_type, id, name, packets[i], packets.length, i]});
                                            if (error) {
                                                this.adapter.log.error('[REMOTE] cannot send: ' + JSON.stringify(error));
                                                break;
                                            }
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
                }
            } else
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

                promiseResult = Promise.resolve({sid: message.sid, d: [_type, id, name, []]});
            } else if (name === 'authenticate') {
                promiseResult = Promise.resolve({sid: message.sid, d: [_type, id, name, [true, false]]});
            } else if (name === 'getObjects') {
                promiseOne = this._readAllObjects();
            } else if (name === 'getHostByIp') {
                promiseResult = this.adapter.getObjectViewAsync('system', 'host', {})
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
                promiseOne = this.adapter.getForeignStatesAsync(args[0] || '*');
            } else if (name === 'getBinaryState') {
                promiseOne = this.adapter.getBinaryStateAsync(args[0])
                    .then(data => {
                        data = data && Buffer.from(data).toString('base64');
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

                promiseOne = Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'DCT') { // disconnect
                const socket = this.sockets[message.sid];
                this.adapter.log.debug('[REMOTE] Disconnect ' + message.sid);
                if (socket) {
                    this._unsubscribeSocket(message.sid, 'stateChange');
                    this._unsubscribeSocket(message.sid, 'objectChange');
                    this._unsubscribeSocket(message.sid, 'log');
                    delete this.sockets[message.sid];
                }
            } else if (name === 'getVersion') {
                promiseResult = Promise.resolve({sid: message.sid, d: [_type, id, name, [this.adapter.version]]});
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
                promiseOne = Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
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
                promiseOne = Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'subscribeObjects') {
                const pattern = args && args[0] ? args[0] : '*';
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._subscribe(message.sid, 'objectChange', pattern[p]);
                    }
                } else {
                    this._subscribe(message.sid, 'objectChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'objectChange');
                promiseOne = Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
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
                promiseOne = Promise.resolve({sid: message.sid, d: [_type, id, name, [null]]});
            } else if (name === 'authEnabled') {
                promiseResult = Promise.resolve({sid: message.sid, d: [_type, id, name, [false, ' admin']]});
            } else if (name === 'readFile') {
                const adapter = args[0];
                const fileName = args[1];
                promiseResult = this.adapter.readFileAsync(adapter, fileName)
                    .then(data => {
                        let packed = zlib.deflateSync(JSON.stringify([null, data.file, data.mimeType])).toString('base64');
                        return {sid: message.sid, d: [_type, id, name, packed]};
                    })
                    .catch(error => ({sid: message.sid, d: [_type, id, name, [error]]}));
            } else if (name === 'getHistory') {
                const _id = args[0];
                const options = args[1];
                promiseResult = this.adapter.getHistoryAsync(_id, options)
                    .then(data => {
                        let packed = zlib.deflateSync(JSON.stringify([null, data.result, data.step, data.sessionId])).toString('base64');
                        return {sid: message.sid, d: [_type, id, name, packed]};
                    })
                    .catch(error => ({sid: message.sid, d: [_type, id, name, [error]]}));
            } else if (name === 'writeFile64' || name === 'writeFile') {
                const [_adapter, fileName, data64, options] = args;
                // Convert base 64 to buffer
                const buffer = Buffer.from(data64, 'base64');
                promiseOne = this.adapter.writeFileSync(_adapter, fileName, buffer, options);
            }

            // MESSAGE is the only one-way message and no answer is expected
            if (_type === MESSAGE_TYPES.MESSAGE || _type === MESSAGE_TYPES.COMBINED_MESSAGE) {
                promiseResult = promiseOne ?
                    promiseOne
                        .then(() => RemoteAccess.NONE) :
                    Promise.resolve(RemoteAccess.NONE);
            } else
            if (!promiseResult && promiseOne) {
                promiseResult = promiseOne
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
                                        const error = await this._sendEvent({sid: message.sid, d: [_type, id, name, packets[i], packets.length, i]});
                                        if (error) {
                                            this.adapter.log.error('[REMOTE] cannot send: ' + JSON.stringify(error));
                                            break;
                                        }
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
            }

            if (!promiseResult) {
                this.adapter.log.warn('[REMOTE] Received unknown command: ' + name);
                promiseResult =  Promise.resolve({sid: message.sid, d: [_type, id, name, ['Unknown command']]});
            }

            return promiseResult
                .then(result => {
                    if (result !== RemoteAccess.NONE && result.d && result.d[0] !== MESSAGE_TYPES.WAIT) {
                        setImmediate(async () => await this._sendEvent(result));
                    }

                    return RemoteAccess.NONE;
                });
        }
    }
}

module.exports = RemoteAccess;
