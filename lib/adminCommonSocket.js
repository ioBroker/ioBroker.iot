const path = require("path");
const fs = require("fs");
const Utils = require("./Utils");

const ALLOW_CACHE = [
    'getRepository',
    'getInstalled',
    'getInstalledAdapter',
    'getVersion',
    'getDiagData',
    'getLocationOnDisk',
    'getDevList',
    'getLogs',
    'getHostInfo',
];

const commandsPermissions = {
    getObject:          {type: 'object',    operation: 'read'},
    getObjects:         {type: 'object',    operation: 'list'},
    getObjectView:      {type: 'object',    operation: 'list'},
    setObject:          {type: 'object',    operation: 'write'},
    requireLog:         {type: 'object',    operation: 'write'}, // just mapping to some command
    delObject:          {type: 'object',    operation: 'delete'},
    extendObject:       {type: 'object',    operation: 'write'},
    getHostByIp:        {type: 'object',    operation: 'list'},
    subscribeObjects:   {type: 'object',    operation: 'read'},
    unsubscribeObjects: {type: 'object',    operation: 'read'},

    getStates:          {type: 'state',     operation: 'list'},
    getState:           {type: 'state',     operation: 'read'},
    setState:           {type: 'state',     operation: 'write'},
    delState:           {type: 'state',     operation: 'delete'},
    createState:        {type: 'state',     operation: 'create'},
    subscribe:          {type: 'state',     operation: 'read'},
    unsubscribe:        {type: 'state',     operation: 'read'},
    getStateHistory:    {type: 'state',     operation: 'read'},
    getVersion:         {type: '',          operation: ''},
    getAdapterName:     {type: '',          operation: ''},

    addUser:            {type: 'users',     operation: 'create'},
    delUser:            {type: 'users',     operation: 'delete'},
    addGroup:           {type: 'users',     operation: 'create'},
    delGroup:           {type: 'users',     operation: 'delete'},
    changePassword:     {type: 'users',     operation: 'write'},

    httpGet:            {type: 'other',     operation: 'http'},
    cmdExec:            {type: 'other',     operation: 'execute'},
    sendTo:             {type: 'other',     operation: 'sendto'},
    sendToHost:         {type: 'other',     operation: 'sendto'},
    readLogs:           {type: 'other',     operation: 'execute'},

    readDir:            {type: 'file',      operation: 'list'},
    createFile:         {type: 'file',      operation: 'create'},
    writeFile:          {type: 'file',      operation: 'write'},
    readFile:           {type: 'file',      operation: 'read'},
    fileExists:         {type: 'file',      operation: 'read'},
    deleteFile:         {type: 'file',      operation: 'delete'},
    readFile64:         {type: 'file',      operation: 'read'},
    writeFile64:        {type: 'file',      operation: 'write'},
    unlink:             {type: 'file',      operation: 'delete'},
    renameFile:         {type: 'file',      operation: 'write'},
    mkdir:              {type: 'file',      operation: 'write'},
    chmodFile:          {type: 'file',      operation: 'write'},
    chownFile:          {type: 'file',      operation: 'write'},

    authEnabled:        {type: '',          operation: ''},
    disconnect:         {type: '',          operation: ''},
    listPermissions:    {type: '',          operation: ''},
    getUserPermissions: {type: 'object',    operation: 'read'}
};

const cache = {};
let cacheGB;
let axios;

function fixAdminUI(obj) {
    if (obj && obj.common && !obj.common.adminUI) {
        if (obj.common.noConfig) {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.config = 'none';
        } else if (obj.common.jsonConfig) {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.config = 'json';
        } else if (obj.common.materialize) {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.config = 'materialize';
        } else {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.config = 'html';
        }

        if (obj.common.jsonCustom) {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.custom = 'json';
        } else if (obj.common.supportCustoms) {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.custom = 'json';
        }

        if (obj.common.materializeTab && obj.common.adminTab) {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.tab = 'materialize';
        } else if (obj.common.adminTab) {
            obj.common.adminUI = obj.common.adminUI || {};
            obj.common.adminUI.tab = 'html';
        }
    }
}

async function _readInstanceConfig(adapter, id, user, isTab, configs) {
    const obj = await adapter.getForeignObject('system.adapter.' + id, {user});
    if (obj && obj.common) {
        const instance = id.split('.').pop();
        const config = {
            id,
            title:       obj.common.titleLang || obj.common.title,
            desc:        obj.common.desc,
            color:       obj.common.color,
            url:         `/adapter/${obj.common.name}/${isTab ? 'tab' : 'index'}${!isTab && obj.common.materialize ? '_m' : ''}.html${instance ? '?' + instance : ''}`,
            icon:        obj.common.icon,
            materialize: obj.common.materialize,
            jsonConfig:  obj.common.jsonConfig,
        };
        if (isTab) {
            config.tab = true;
        } else {
            config.config = true;
        }
        /*if (typeof config.title === 'object') {
            config.title = config.title[adapter.systemConfig.language] || config.title.en;
        }
        if (typeof config.desc === 'object') {
            config.desc = config.desc[adapter.systemConfig.language] || config.desc.en;
        }*/
        configs.push(config);
    }
}

async function getEasyMode(adapter) {
    const adapterConfig = this.adminObj;

    if (adapterConfig.native.accessLimit) {
        const configs = [];
        adapterConfig.native.accessAllowedConfigs = adapterConfig.native.accessAllowedConfigs || [];
        adapterConfig.native.accessAllowedTabs = adapterConfig.native.accessAllowedTabs || [];

        for (let a = 0; a < adapterConfig.native.accessAllowedConfigs.length; a++) {
            await _readInstanceConfig(adapterConfig.native.accessAllowedConfigs[a], 'system.user.admin', false, configs);
        }

        return {strict: true, configs};
    } else {
        const doc = await adapter.getObjectViewAsync('system', 'instance', {
            startkey: 'system.adapter.',
            endkey: 'system.adapter.\u9999'
        }, {user: 'system.user.admin'});
        const configs = [];
        if (doc && doc.rows.length) {
            for (let i = 0; i < doc.rows.length; i++) {
                const obj = doc.rows[i].value;
                if (obj.common.noConfig && !obj.common.adminTab) {
                    continue;
                }
                if (!obj.common.enabled) {
                    continue;
                }
                if (!obj.common.noConfig) {
                    await this._readInstanceConfig(obj._id.substring('system.adapter.'.length), 'system.user.admin', false, configs);
                }
            }
        }
        return {strict: false, configs};
    }
}

function getAdapterInstances(adapter, adapterName) {
    return adapter.getObjectViewAsync('system', 'instance',
        {startkey: `system.adapter.${adapterName ? adapterName + '.' : ''}`, endkey: `system.adapter.${adapterName ? adapterName + '.' : ''}\u9999`})
        .then(doc => doc.rows
            .map(item => {
                const obj = item.value;
                if (obj.common) {
                    delete obj.common.news;
                }
                fixAdminUI(obj);
                return obj;
            })
            .filter(obj => obj && (!adapterName || (obj.common && obj.common.name === adapterName))));
}

function getAdapters(adapter, adapterName) {
    return adapter.getObjectViewAsync('system', 'adapter',
        {startkey: `system.adapter.${adapterName || ''}`, endkey: `system.adapter.${adapterName || '\u9999'}`},
        (doc => doc.rows
            .filter(obj => obj && (!adapterName || (obj.common && obj.common.name === adapterName)))
            .map(item => {
                const obj = item.value;
                if (obj.common) {
                    delete obj.common.news;
                    delete obj.native;
                }
                fixAdminUI(obj);
                return obj;
            })));
}

function getCompactInstances(adapter) {
    return adapter.getObjectViewAsync('system', 'instance',
        {startkey: `system.adapter.`, endkey: `system.adapter.\u9999`})
        .then(doc => {
            // calculate
            const result = {};

            doc.rows.forEach(item => {
                const obj = item.value;
                result[item.id] = {
                    adminTab: obj.common.adminTab,
                    name: obj.common.name,
                    icon: obj.common.icon,
                    enabled: obj.common.enabled
                };
            });

            return result;
        });
}

function getCompactAdapters(adapter) {
    return adapter.getObjectViewAsync('system', 'adapter',
        {startkey: `system.adapter.`, endkey: `system.adapter.\u9999`})
        .then(doc => {
            // calculate
            const result = {};

            doc.rows.forEach(item => {
                const obj = item.value;
                if (obj && obj.common && obj.common.name) {
                    result[obj.common.name] = {icon: obj.common.icon, v: obj.common.version};
                    if (obj.common.ignoreVersion) {
                        result[obj.common.name].iv = obj.common.ignoreVersion;
                    }
                }
            });

            return result;
        });
}

function sendToHost(adapter, host, command, message) {
    return new Promise(resolve => {
        if (!message && ALLOW_CACHE.includes(command) && cache[host + '_' + command]) {
            if (Date.now() - cache[host + '_' + command].ts < 500) {
                resolve(JSON.parse(cache[host + '_' + command].res));
            } else {
                delete cache[host + '_' + command];
            }
        }

        adapter.sendToHost(host, command, message, res => {
            if (!message && ALLOW_CACHE.includes(command)) {
                cache[host + '_' + command] = {ts: Date.now(), res: JSON.stringify(res)};
                cacheGB = cacheGB || setInterval(() => {
                    const commands = Object.keys(cache);
                    commands.forEach(cmd => {
                        if (Date.now() - cache[cmd].ts > 500) {
                            delete cache[cmd];
                        }
                    });
                    if (!commands.length) {
                        clearInterval(cacheGB);
                        cacheGB = null;
                    }
                }, 2000);
            }
            resolve(res);
        });
    });
}

function sendTo(adapter, adapterInstance, command, message) {
    return adapter.sendToAsync(adapterInstance, command, message);
}

function stopGB() {
    clearInterval(cacheGB);
    cacheGB = null;

    const commands = Object.keys(cache);
    commands.forEach(cmd => delete cache[cmd]);
}

function updateLicenses(login, password, adminObj) {
    if (this.adapter.supportsFeature('CONTROLLER_LICENSE_MANAGER')) {
        return new Promise(async (resolve, reject) => {
            let timeout = setTimeout(() => {
                if (timeout) {
                    timeout = null;
                    reject('updateLicenses timeout');
                }
            }, 7000);

            sendToHost(adminObj.common.host, 'updateLicenses', {login, password})
                .then(result => {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                        result && result.error ? reject(result.error) : resolve(result && result.result);
                    }
                });
        });
    } else {
        // remove this branch when js-controller 4.x will be mainstream
        return Promise.reject('Not supported');
    }
}

function getIsEasyModeStrict(adapter, adminObj) {
    return Promise.resolve(adminObj.native.accessLimit);
}

function getCompactInstalled(adapter, host) {
    return sendToHost(host, 'getInstalled', null)
        .then(data => {
            const result = {};
            Object.keys(data).forEach(name => result[name] = {version: data[name].version});
            return result;
        });
}

function getCompactSystemConfig(adapter) {
    return adapter.getForeignObjectAsync('system.config')
        .then(obj => {
            obj = obj || {};
            const secret = obj.native && obj.native.secret;
            delete obj.native;
            if (secret) {
                obj.native = {secret};
            }
            return obj;
        });
}

function getCompactRepository(adapter, host) {
    return sendToHost(host, 'getRepository', null)
        .then(data => {
            // Extract only version and icon
            const result = {};
            data && Object.keys(data).forEach(name => result[name] = {
                version: data[name].version,
                icon: data[name].extIcon
            });
            return result;
        });
}

function getCompactHosts(adapter) {
    return adapter.getObjectViewAsync('system', 'host',
        {startkey: 'system.host.', endkey: 'system.host.\u9999'})
        .then(doc => {
            const result = [];
            doc.rows.map(item => {
                const host = item.value;
                if (host) {
                    host.common = host.common || {};
                    result.push({
                        _id: host._id,
                        common: {
                            name: host.common.name,
                            icon: host.common.icon,
                            color: host.common.color,
                            installedVersion: host.common.installedVersion
                        },
                        native: {
                            hardware: {
                                networkInterfaces: (host.native && host.native.hardware && host.native.hardware.networkInterfaces) || undefined
                            }
                        }
                    });
                }
            });

            return result;
        });
}

function readLogs(adapter, host) {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            if (timeout) {
                let result = {list: []};

                // deliver file list
                try {
                    const config = adapter.systemConfig;
                    // detect file log
                    if (config && config.log && config.log.transport) {
                        for (const transport in config.log.transport) {
                            if (config.log.transport.hasOwnProperty(transport) && config.log.transport[transport].type === 'file') {
                                let filename = config.log.transport[transport].filename || 'log/';
                                const parts = filename.replace(/\\/g, '/').split('/');
                                parts.pop();
                                filename = parts.join('/');
                                if (filename[0] !== '/' && !filename.match(/^\W:/)) {
                                    const _filename = path.normalize(__dirname + '/../../../') + filename;
                                    if (!fs.existsSync(_filename)) {
                                        filename = path.normalize(__dirname + '/../../') + filename;
                                    } else {
                                        filename = _filename;
                                    }
                                }
                                if (fs.existsSync(filename)) {
                                    const files = fs.readdirSync(filename);

                                    for (let f = 0; f < files.length; f++) {
                                        try {
                                            if (!files[f].endsWith('-audit.json')) {
                                                const stat = fs.lstatSync(filename + '/' + files[f]);
                                                if (!stat.isDirectory()) {
                                                    result.list.push({fileName: 'log/' + transport + '/' + files[f], size: stat.size});
                                                }
                                            }
                                        } catch (e) {
                                            // push unchecked
                                            // result.list.push('log/' + transport + '/' + files[f]);
                                            adapter.log.error(`Cannot check file: ${filename}/${files[f]}`);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        result = {error: 'no file loggers'};
                    }
                } catch (e) {
                    adapter.log.error(e);
                    result = {error: e};
                }
                result.error ? reject(result.error) : resolve(result.list);
            }
        }, 500);

        sendToHost(host, 'getLogFiles', null)
            .then(result => {
                clearTimeout(timeout);
                timeout = null;
                result.error ? reject(result.error) : resolve(result.list);
            });
    });
}

function getRatings(adapter, forceUpdate, autoUpdate) {
    axios = axios || require('axios');

    if (!forceUpdate && adapter._ratings) {
        return Promise.resolve(adapter._ratings);
    }

    return adapter.getForeignObjectAsync('system.meta.uuid')
        .then(obj => axios('https://rating.iobroker.net/rating?uuid=' + obj.native.uuid)
            .then(response => {
                let body = response.body;
                if (body) {
                    if (typeof body !== 'object') {
                        try {
                            body = JSON.parse(body);
                            adapter._ratings = body;
                        } catch (e) {
                            adapter.log.error('Cannot parse ratings: ' + e);
                        }
                    } else if (body) {
                        adapter._ratings = body;
                    }
                    if (!adapter._ratings || typeof adapter._ratings !== 'object' || Array.isArray(adapter._ratings)) {
                        adapter._ratings = {};
                    }
                    adapter._ratings.uuid = obj.native.uuid;
                    return adapter._ratings;
                }

                adapter.ratingTimeout && clearTimeout(adapter.ratingTimeout);

                if (autoUpdate) {
                    adapter.ratingTimeout = setTimeout(() => {
                        adapter.ratingTimeout = null;
                        getRatings(adapter, forceUpdate, true)
                            .then(() => adapter.log.info('Adapter rating updated'));
                    }, 24 * 3600000);
                }
            }));
}

function listPermissions(adapter) {
    return Promise.resolve(commandsPermissions);
}

function getHostByIp(adapter, ip) {
    return adapter.getObjectViewAsync('system', 'host', {})
        .then(data => {
            if (data && data.rows && data.rows.length) {
                for (let i = 0; i < data.rows.length; i++) {
                    const obj = data.rows[i].value;
                    // if we requested specific name
                    if (obj.common.hostname === ip) {
                        return {ip, obj};
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
                                    return {ip, obj};
                                }
                            }
                        }
                    }
                }
            }
            return {ip, obj: null};
        });
}

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

async function _getListOfAllAdapters(adapter) {
    // read all instances
    const instances = await adapter.getObjectViewAsync('system', 'instance', {});
    const adapters = await adapter.getObjectViewAsync('system', 'adapter', {});

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

    if (!this.adapter.config.remoteAdminInstance || objects['system.adapter.' + this.adapter.config.remoteAdminInstance].common.auth) {
        // delete all admin links
        list = list.filter(item => item.adapter !== 'admin');
    }

    if (!this.adapter.config.remoteWebInstance || objects['system.adapter.' + this.adapter.config.remoteWebInstance].common.auth) {
        // delete all admin links
        list = list.filter(item => item.adapter === 'admin');
    }

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


module.exports = {
    getAdapterInstances,
    getAdapters,
    getCompactInstances,
    getCompactAdapters,
    getCompactInstalled,
    updateLicenses,
    getIsEasyModeStrict,
    getCompactRepository,
    getCompactHosts,
    getCompactSystemConfig,
    getRatings,
    readLogs,
    stopGB,
    sendToHost,
    sendTo,
    getEasyMode,
    listPermissions,
    getHostByIp,
    commandsPermissions,
}
