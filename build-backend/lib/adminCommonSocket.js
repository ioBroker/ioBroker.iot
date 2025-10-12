"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMANDS_PERMISSIONS = void 0;
exports.getEasyMode = getEasyMode;
exports.getAdapterInstances = getAdapterInstances;
exports.getAdapters = getAdapters;
exports.getCompactInstances = getCompactInstances;
exports.getCompactSystemRepositories = getCompactSystemRepositories;
exports.getCompactAdapters = getCompactAdapters;
exports.sendTo = sendTo;
exports.stopGB = stopGB;
exports.updateLicenses = updateLicenses;
exports.getIsEasyModeStrict = getIsEasyModeStrict;
exports.getCompactInstalled = getCompactInstalled;
exports.getCompactSystemConfig = getCompactSystemConfig;
exports.getCompactRepository = getCompactRepository;
exports.getCompactHosts = getCompactHosts;
exports.readLogs = readLogs;
exports.getRatings = getRatings;
exports.listPermissions = listPermissions;
exports.getHostByIp = getHostByIp;
exports.getListOfAllAdapters = getListOfAllAdapters;
exports.getAllObjects = getAllObjects;
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const axios_1 = __importDefault(require("axios"));
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
exports.COMMANDS_PERMISSIONS = {
    getObject: { type: 'object', operation: 'read' },
    getObjects: { type: 'object', operation: 'list' },
    getObjectView: { type: 'object', operation: 'list' },
    setObject: { type: 'object', operation: 'write' },
    requireLog: { type: 'object', operation: 'write' }, // just mapping to some command
    delObject: { type: 'object', operation: 'delete' },
    extendObject: { type: 'object', operation: 'write' },
    getHostByIp: { type: 'object', operation: 'list' },
    subscribeObjects: { type: 'object', operation: 'read' },
    unsubscribeObjects: { type: 'object', operation: 'read' },
    getStates: { type: 'state', operation: 'list' },
    getState: { type: 'state', operation: 'read' },
    setState: { type: 'state', operation: 'write' },
    delState: { type: 'state', operation: 'delete' },
    createState: { type: 'state', operation: 'create' },
    subscribe: { type: 'state', operation: 'read' },
    unsubscribe: { type: 'state', operation: 'read' },
    getStateHistory: { type: 'state', operation: 'read' },
    getVersion: { type: '', operation: '' },
    getAdapterName: { type: '', operation: '' },
    addUser: { type: 'users', operation: 'create' },
    delUser: { type: 'users', operation: 'delete' },
    addGroup: { type: 'users', operation: 'create' },
    delGroup: { type: 'users', operation: 'delete' },
    changePassword: { type: 'users', operation: 'write' },
    httpGet: { type: 'other', operation: 'http' },
    cmdExec: { type: 'other', operation: 'execute' },
    sendTo: { type: 'other', operation: 'sendto' },
    sendToHost: { type: 'other', operation: 'sendto' },
    readLogs: { type: 'other', operation: 'execute' },
    readDir: { type: 'file', operation: 'list' },
    createFile: { type: 'file', operation: 'create' },
    writeFile: { type: 'file', operation: 'write' },
    readFile: { type: 'file', operation: 'read' },
    fileExists: { type: 'file', operation: 'read' },
    deleteFile: { type: 'file', operation: 'delete' },
    readFile64: { type: 'file', operation: 'read' },
    writeFile64: { type: 'file', operation: 'write' },
    unlink: { type: 'file', operation: 'delete' },
    renameFile: { type: 'file', operation: 'write' },
    rename: { type: 'file', operation: 'write' },
    mkdir: { type: 'file', operation: 'write' },
    chmodFile: { type: 'file', operation: 'write' },
    chownFile: { type: 'file', operation: 'write' },
    subscribeFiles: { type: 'file', operation: 'read' },
    unsubscribeFiles: { type: 'file', operation: 'read' },
    authEnabled: { type: '', operation: '' },
    disconnect: { type: '', operation: '' },
    listPermissions: { type: '', operation: '' },
    getUserPermissions: { type: 'object', operation: 'read' },
};
const cache = {};
let cacheGB = null;
function fixAdminUI(obj) {
    if (obj?.common) {
        if (!obj.common.adminUI) {
            if (obj.common.noConfig) {
                obj.common.adminUI ||= { config: 'none' };
                obj.common.adminUI.config = 'none';
            }
            else if (obj.common.jsonConfig) {
                obj.common.adminUI ||= { config: 'json' };
                obj.common.adminUI.config = 'json';
            }
            else if (obj.common.materialize) {
                obj.common.adminUI ||= { config: 'materialize' };
                obj.common.adminUI.config = 'materialize';
            }
            else {
                obj.common.adminUI ||= { config: 'html' };
                obj.common.adminUI.config = 'html';
            }
            if (obj.common.jsonCustom) {
                obj.common.adminUI ||= { config: 'html' };
                obj.common.adminUI.custom = 'json';
            }
            else if (obj.common.supportCustoms) {
                obj.common.adminUI ||= { config: 'html' };
                obj.common.adminUI.custom = 'json';
            }
            if (obj.common.materializeTab && obj.common.adminTab) {
                obj.common.adminUI ||= { config: 'html' };
                obj.common.adminUI.tab = 'materialize';
            }
            else if (obj.common.adminTab) {
                obj.common.adminUI ||= { config: 'html' };
                obj.common.adminUI.tab = 'html';
            }
            if (obj.common.adminUI) {
                console.warn(`Please add to "${obj._id.replace(/\.\d+$/, '')}" common.adminUI=${JSON.stringify(obj.common.adminUI)}`);
            }
        }
        else {
            let changed = false;
            if (obj.common.materializeTab && obj.common.adminTab) {
                if (obj.common.adminUI.tab !== 'materialize') {
                    obj.common.adminUI.tab = 'materialize';
                    changed = true;
                }
            }
            else if (obj.common.adminTab) {
                if (obj.common.adminUI.tab !== 'html' && obj.common.adminUI.tab !== 'materialize') {
                    obj.common.adminUI.tab = 'html';
                    changed = true;
                }
            }
            if (obj.common.jsonCustom || obj.common.supportCustoms) {
                if (obj.common.adminUI.custom !== 'json') {
                    obj.common.adminUI.custom = 'json';
                    changed = true;
                }
            }
            if (obj.common.noConfig) {
                if (obj.common.adminUI.config !== 'none') {
                    obj.common.adminUI.config = 'none';
                    changed = true;
                }
            }
            else if (obj.common.jsonConfig) {
                if (obj.common.adminUI.config !== 'json') {
                    obj.common.adminUI.config = 'json';
                    changed = true;
                }
                obj.common.adminUI.config = 'json';
            }
            else if (obj.common.materialize) {
                if (obj.common.adminUI.config !== 'materialize') {
                    if (!obj.common.adminUI.config) {
                        obj.common.adminUI.config = 'materialize';
                        changed = true;
                    }
                }
            }
            else if (!obj.common.adminUI.config) {
                obj.common.adminUI.config = 'html';
                changed = true;
            }
            if (changed) {
                console.warn(`Please modify "${obj._id.replace(/\.\d+$/, '')}" common.adminUI=${JSON.stringify(obj.common.adminUI)}`);
            }
        }
    }
}
async function _readInstanceConfig(adapter, id, user, isTab, configs) {
    const obj = await adapter.getForeignObjectAsync(`system.adapter.${id}`, { user });
    if (obj?.common) {
        const instance = id.split('.').pop();
        const config = {
            id,
            title: obj.common.titleLang || obj.common.title,
            desc: obj.common.desc,
            color: obj.common.color,
            url: `/adapter/${obj.common.name}/${isTab ? 'tab' : 'index'}${!isTab && obj.common.materialize ? '_m' : ''}.html${instance ? `?${instance}` : ''}`,
            icon: obj.common.icon,
            materialize: obj.common.adminUI?.config === 'materialize',
            jsonConfig: obj.common.adminUI?.config === 'json',
        };
        if (isTab) {
            config.tab = true;
        }
        else {
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
async function getEasyMode(adapter, adminObj) {
    const adapterConfig = adminObj?.native;
    const configs = [];
    if (adapterConfig?.accessLimit) {
        adapterConfig.accessAllowedConfigs ||= [];
        adapterConfig.accessAllowedTabs ||= [];
        for (let a = 0; a < adapterConfig.accessAllowedConfigs.length; a++) {
            await _readInstanceConfig(adapter, adapterConfig.accessAllowedConfigs[a], 'system.user.admin', false, configs);
        }
        return { strict: true, configs };
    }
    const doc = await adapter.getObjectViewAsync('system', 'instance', {
        startkey: 'system.adapter.',
        endkey: 'system.adapter.\u9999',
    }, { user: 'system.user.admin' });
    if (doc?.rows.length) {
        for (let i = 0; i < doc.rows.length; i++) {
            const obj = doc.rows[i].value;
            if (obj.common.noConfig && !obj.common.adminTab) {
                continue;
            }
            if (!obj.common.enabled) {
                continue;
            }
            if (!obj.common.noConfig) {
                await _readInstanceConfig(adapter, obj._id.substring('system.adapter.'.length), 'system.user.admin', false, configs);
            }
        }
    }
    return { strict: false, configs };
}
function getAdapterInstances(adapter, adapterName) {
    return adapter
        .getObjectViewAsync('system', 'instance', {
        startkey: `system.adapter.${adapterName ? `${adapterName}.` : ''}`,
        endkey: `system.adapter.${adapterName ? `${adapterName}.` : ''}\u9999`,
    })
        .then(doc => doc.rows
        .map(item => {
        const obj = item.value;
        if (obj.common) {
            delete obj.common.news;
        }
        fixAdminUI(obj);
        return obj;
    })
        .filter(obj => obj && (!adapterName || obj.common?.name === adapterName)));
}
function getAdapters(adapter, adapterName) {
    return adapter
        .getObjectViewAsync('system', 'adapter', {
        startkey: `system.adapter.${adapterName || ''}`,
        endkey: `system.adapter.${adapterName || '\u9999'}`,
    })
        .then(doc => doc.rows
        .filter(obj => obj && (!adapterName || obj.value.common?.name === adapterName))
        .map(item => {
        const obj = item.value;
        if (obj.common) {
            delete obj.common.news;
            delete obj.native;
        }
        fixAdminUI(obj);
        return obj;
    }));
}
function getCompactInstances(adapter) {
    return adapter
        .getObjectViewAsync('system', 'instance', { startkey: `system.adapter.`, endkey: `system.adapter.\u9999` })
        .then(doc => {
        // calculate
        const result = {};
        doc.rows.forEach(item => {
            const obj = item.value;
            result[item.id] = {
                adminTab: obj.common.adminTab,
                name: obj.common.name,
                icon: obj.common.icon,
                enabled: obj.common.enabled,
            };
        });
        return result;
    });
}
function getCompactSystemRepositories(adapter) {
    return adapter.getForeignObjectAsync('system.repositories').then(obj => {
        obj?.native?.repositories &&
            Object.keys(obj.native.repositories).forEach(name => {
                if (obj.native.repositories[name].json) {
                    // limit information to _repoInfo
                    obj.native.repositories[name].json = {
                        _repoInfo: obj.native.repositories[name].json._repoInfo,
                    };
                }
            });
        return obj;
    });
}
function getCompactAdapters(adapter) {
    return adapter
        .getObjectViewAsync('system', 'adapter', { startkey: `system.adapter.`, endkey: `system.adapter.\u9999` })
        .then(doc => {
        // calculate
        const result = {};
        doc.rows.forEach(item => {
            const obj = item.value;
            if (obj?.common?.name) {
                result[obj.common.name] = { icon: obj.common.icon, v: obj.common.version };
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
        if (!message && ALLOW_CACHE.includes(command) && cache[`${host}_${command}`]) {
            if (Date.now() - cache[`${host}_${command}`].ts < 500) {
                resolve(JSON.parse(cache[`${host}_${command}`].res));
            }
            else {
                delete cache[`${host}_${command}`];
            }
        }
        void adapter.getForeignStateAsync(`${host}.alive`).then(state => {
            if (state?.val) {
                adapter.sendToHost(host, command, message, res => {
                    if (!message && ALLOW_CACHE.includes(command)) {
                        cache[`${host}_${command}`] = { ts: Date.now(), res: JSON.stringify(res) };
                        cacheGB =
                            cacheGB ||
                                setInterval(() => {
                                    const commands = Object.keys(cache);
                                    commands.forEach(cmd => {
                                        if (Date.now() - cache[cmd].ts > 500) {
                                            delete cache[cmd];
                                        }
                                    });
                                    if (!commands.length) {
                                        if (cacheGB) {
                                            clearInterval(cacheGB);
                                            cacheGB = null;
                                        }
                                    }
                                }, 2000);
                    }
                    resolve(res);
                });
            }
            else {
                resolve({});
            }
        });
    });
}
function sendTo(adapter, adapterInstance, command, message) {
    return adapter.sendToAsync(adapterInstance, command, message);
}
function stopGB() {
    if (cacheGB) {
        clearInterval(cacheGB);
        cacheGB = null;
    }
    const commands = Object.keys(cache);
    commands.forEach(cmd => delete cache[cmd]);
}
function updateLicenses(adapter, login, password, adminObj) {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            if (timeout) {
                timeout = null;
                reject(new Error('updateLicenses timeout'));
            }
        }, 7000);
        void sendToHost(adapter, adminObj?.common.host || adapter.common.host, 'updateLicenses', {
            login,
            password,
        }).then(result => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                result?.error ? reject(new Error(result.error)) : resolve(result?.result);
            }
        });
    });
}
function getIsEasyModeStrict(_adapter, adminObj) {
    return Promise.resolve(!!adminObj?.native?.accessLimit);
}
function getCompactInstalled(adapter, host) {
    return sendToHost(adapter, host, 'getInstalled', null).then(data => {
        const result = {};
        Object.keys(data).forEach(name => (result[name] = { version: data[name].version }));
        return result;
    });
}
function getCompactSystemConfig(adapter) {
    return adapter.getForeignObjectAsync('system.config').then(obj => {
        obj ||= {};
        const secret = obj.native?.secret;
        delete obj.native;
        if (secret) {
            obj.native = { secret };
        }
        return obj;
    });
}
function getCompactRepository(adapter, host) {
    return sendToHost(adapter, host, 'getRepository', null).then(data => {
        // Extract only version and icon
        const result = {};
        if (data) {
            Object.keys(data).forEach(name => (result[name] = {
                version: data[name].version,
                icon: data[name].extIcon,
            }));
        }
        return result;
    });
}
function getCompactHosts(adapter) {
    return adapter
        .getObjectViewAsync('system', 'host', { startkey: 'system.host.', endkey: 'system.host.\u9999' })
        .then(doc => {
        const result = [];
        doc.rows.map(item => {
            const host = item.value;
            if (host) {
                host.common ||= {};
                result.push({
                    _id: host._id,
                    common: {
                        name: host.common.name,
                        icon: host.common.icon,
                        color: host.common.color,
                        installedVersion: host.common.installedVersion,
                    },
                    native: {
                        hardware: {
                            networkInterfaces: host.native?.hardware?.networkInterfaces || undefined,
                        },
                    },
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
                timeout = null;
                const list = [];
                // deliver a file list
                try {
                    const config = adapter.systemConfig;
                    // detect file log
                    if (config?.log?.transport) {
                        for (const transport in config.log.transport) {
                            if (Object.prototype.hasOwnProperty.call(config.log.transport, transport) &&
                                config.log.transport[transport].type === 'file') {
                                let filename = config.log.transport[transport].filename || 'log/';
                                const parts = filename.replace(/\\/g, '/').split('/');
                                parts.pop();
                                filename = parts.join('/');
                                if (filename[0] !== '/' && !filename.match(/^\W:/)) {
                                    const _filename = (0, node_path_1.normalize)(`${__dirname}/../../../`) + filename;
                                    if (!(0, node_fs_1.existsSync)(_filename)) {
                                        filename = (0, node_path_1.normalize)(`${__dirname}/../../`) + filename;
                                    }
                                    else {
                                        filename = _filename;
                                    }
                                }
                                if ((0, node_fs_1.existsSync)(filename)) {
                                    const files = (0, node_fs_1.readdirSync)(filename);
                                    for (let f = 0; f < files.length; f++) {
                                        try {
                                            if (!files[f].endsWith('-audit.json')) {
                                                const stat = (0, node_fs_1.lstatSync)(`${filename}/${files[f]}`);
                                                if (!stat.isDirectory()) {
                                                    list.push({
                                                        fileName: `log/${transport}/${files[f]}`,
                                                        size: stat.size,
                                                    });
                                                }
                                            }
                                        }
                                        catch {
                                            // push unchecked
                                            // result.list.push('log/' + transport + '/' + files[f]);
                                            adapter.log.error(`Cannot check file: ${filename}/${files[f]}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else {
                        reject(new Error('no file loggers'));
                        return;
                    }
                }
                catch (e) {
                    adapter.log.error(e);
                    reject(new Error(e.toString()));
                }
                resolve(list);
            }
        }, 500);
        void sendToHost(adapter, host, 'getLogFiles', null).then(result => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                result.error ? reject(new Error(result.error)) : resolve(result.list);
            }
        });
    });
}
let ratingsCached = {};
let ratingTimeout = null;
function getRatings(adapter, forceUpdate, autoUpdate) {
    if (!forceUpdate && ratingsCached) {
        return Promise.resolve(ratingsCached);
    }
    return adapter.getForeignObjectAsync('system.meta.uuid').then(obj => (0, axios_1.default)(`https://rating.iobroker.net/rating?uuid=${obj.native.uuid}`).then(response => {
        const body = response.data;
        if (body) {
            if (typeof body !== 'object') {
                try {
                    ratingsCached = JSON.parse(body);
                }
                catch (e) {
                    adapter.log.error(`Cannot parse ratings: ${e}`);
                }
            }
            else if (body) {
                ratingsCached = body;
            }
            if (!ratingsCached || typeof ratingsCached !== 'object' || Array.isArray(ratingsCached)) {
                ratingsCached = {};
            }
            ratingsCached.uuid = obj.native.uuid;
            return ratingsCached;
        }
        if (ratingTimeout) {
            clearTimeout(ratingTimeout);
            ratingTimeout = null;
        }
        if (autoUpdate) {
            ratingTimeout = setTimeout(() => {
                ratingTimeout = null;
                void getRatings(adapter, forceUpdate, true).then(() => adapter.log.info('Adapter rating updated'));
            }, 24 * 3_600_000);
        }
        return ratingsCached;
    }));
}
function listPermissions(_adapter) {
    return Promise.resolve(exports.COMMANDS_PERMISSIONS);
}
function getHostByIp(adapter, ip) {
    return adapter.getObjectViewAsync('system', 'host', {}).then(data => {
        if (data?.rows?.length) {
            for (let i = 0; i < data.rows.length; i++) {
                const obj = data.rows[i].value;
                // if we requested specific name
                if (obj.common.hostname === ip) {
                    return { ip, obj };
                }
                else if (obj.native.hardware && obj.native.hardware.networkInterfaces) {
                    // try to find this IP in the list
                    const net = obj.native.hardware.networkInterfaces;
                    for (const eth in net) {
                        if (!Object.prototype.hasOwnProperty.call(net, eth)) {
                            continue;
                        }
                        for (let j = 0; j < net[eth].length; j++) {
                            if (net[eth][j].address === ip) {
                                return { ip, obj };
                            }
                        }
                    }
                }
            }
        }
        return { ip, obj: null };
    });
}
async function getListOfAllAdapters(adapter) {
    // read all instances
    const instances = await adapter.getObjectViewAsync('system', 'instance', {});
    const adapters = await adapter.getObjectViewAsync('system', 'adapter', {});
    // TODO: ignore disabled web adapters
    const objects = {};
    const list = [];
    const mapInstance = {};
    for (let r = 0; r < instances.rows.length; r++) {
        mapInstance[instances.rows[r].id] = instances.rows[r].value;
        objects[instances.rows[r].id] = instances.rows[r].value;
    }
    for (let a = 0; a < adapters.rows.length; a++) {
        const obj = adapters.rows[a].value;
        objects[adapters.rows[a].id] = adapters.rows[a].value;
        let found;
        if (instances?.rows) {
            found = [];
            // find if any instance of this adapter exists and started
            for (let i = 0; i < instances.rows.length; i++) {
                let id = instances.rows[i].id;
                const ids = id.split('.');
                ids.pop();
                id = ids.join('.');
                if (id === obj._id && instances.rows[i].value.common?.enabled) {
                    found.push(instances.rows[i].id);
                }
            }
        }
    }
    const config = adapter.config;
    if (config.remoteWebInstance &&
        objects[`system.adapter.${config.remoteWebInstance}`]?.common?.enabled &&
        objects[`system.adapter.vis-2.0`]?.common?.enabled) {
        list.push({
            link: 'vis-2/index.html',
            // @ts-expect-error fix later
            name: objects[`system.adapter.vis-2.0`].common.welcomeScreen?.[0]?.name || 'vis 2 runtime',
            // @ts-expect-error fix later
            color: objects[`system.adapter.vis-2.0`].common.welcomeScreen?.[0]?.color || '#ffe9c8',
            order: 0,
        });
        list.push({
            link: 'vis-2/edit.html',
            // @ts-expect-error fix later
            name: objects[`system.adapter.vis-2.0`].common.welcomeScreenPro?.[0]?.name || 'vis 2 editor',
            // @ts-expect-error fix later
            color: objects[`system.adapter.vis-2.0`].common.welcomeScreenPro?.[0]?.color || '#c8ffe1',
            order: 1,
        });
    }
    const common = config.remoteAdminInstance
        ? objects[`system.adapter.${config.remoteAdminInstance}`].common
        : undefined;
    if (common?.enabled) {
        list.push({
            link: 'admin/index.html',
            // @ts-expect-error fix later
            name: common.welcomeScreenPro?.[0]?.name || 'Admin',
            // @ts-expect-error fix later
            color: common.welcomeScreenPro?.[0]?.color || 'pink',
            order: 5,
        });
    }
    return list;
}
let objectsTs = null;
let cachedObjects = null;
async function getAllObjects(adapter) {
    const now = Date.now();
    if (cachedObjects && objectsTs && now - objectsTs < 20000) {
        return cachedObjects;
    }
    const res = await adapter.getObjectListAsync({ include_docs: true });
    const objects = {};
    if (res) {
        const rows = res.rows;
        for (let i = 0; i < rows.length; i++) {
            objects[rows[i].doc._id] = rows[i].doc;
        }
    }
    adapter.log.info(`[REMOTE] received all objects in ${Date.now() - now}`);
    objectsTs = Date.now();
    cachedObjects = objects;
    return objects;
}
exports.default = {
    stopGB,
    getListOfAllAdapters,
    getHostByIp,
    getEasyMode,
    getAdapterInstances,
    getIsEasyModeStrict,
    getAdapters,
    updateLicenses,
    getCompactInstances,
    getCompactSystemRepositories,
    getCompactAdapters,
    getCompactInstalled,
    getCompactSystemConfig,
    getCompactRepository,
    getCompactHosts,
    readLogs,
    getRatings,
    listPermissions,
    sendToHost,
    sendTo,
    getAllObjects,
};
//# sourceMappingURL=adminCommonSocket.js.map