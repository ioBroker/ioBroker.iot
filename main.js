/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var utils         = require(__dirname + '/lib/utils'); // Get common adapter utils
var IOSocket      = require(utils.appName + '.socketio/lib/socket.js');
var request       = require('request');
var translateRooms;
var translateFunctions;
var translateDevices;
var socket        = null;
var ioSocket      = null;
var smartDevices  = [];
var recalcTimeout = null;
var lang          = 'de';
var translate     = false;
var enums         = [];
var valuesON      = {};
var words         = {
    'No name':  {'en': 'No name', 'de': 'Kein Name', 'ru': 'Нет имени'},
    'Group':    {'en': 'Group',   'de': 'Gruppe',    'ru': 'Группа'}
};
var detectDisconnect = null;
var pingTimer     = null;
var connected     = false;
var connectTimer  = null;
var statesAI      = null;

var adapter       = new utils.Adapter({
    name: 'cloud',
    objectChange: function (id, obj) {
        if (socket) socket.emit('objectChange', id, obj);
        if (!obj || (obj.type === 'state' || obj.type === 'enum')) {
            if (recalcTimeout) clearTimeout(recalcTimeout);
            recalcTimeout = setTimeout(function () {
                recalcTimeout = null;
                getDevices(function (err, result) {
                    smartDevices = result;
                });
            }, 1000);
        } else if (id === 'system.config' && obj && !translate) {
            lang = obj.common.language;
            if (lang !== 'en' && lang !== 'de') lang = 'en';
        }
    },
    stateChange: function (id, state) {
        if (socket) {
            if (id === adapter.namespace + '.services.ifttt' && state && !state.ack) {
                sendDataToIFTTT({
                    id: id,
                    val: state.val,
                    ack: false
                });
            } else {
                socket.emit('stateChange', id, state);
            }
        }
    },
    unload: function (callback) {
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
        if (detectDisconnect) {
            clearTimeout(detectDisconnect);
            detectDisconnect = null;
        }
        try {
            if (socket) socket.close();
            ioSocket = null;
            callback();
        } catch (e) {
            callback();
        }
    },
    message: function (obj) {
        if (obj) {
            switch (obj.command) {
                case 'browse':
                    if (obj.callback) {
                        adapter.log.info('Request devices');
                        adapter.sendTo(obj.from, obj.command, smartDevices, obj.callback);
                    }
                    break;

                case 'enums':
                    if (obj.callback) {
                        adapter.log.info('Request enums');
                        adapter.sendTo(obj.from, obj.command, enums, obj.callback);
                    }
                    break;

                case 'ifttt':
                    sendDataToIFTTT(obj.message);
                    break;

                default:
                    adapter.log.warn('Unknown command: ' + obj.command);
                    break;
            }
        }
    },
    ready: function () {
        main();
    }
});

function sendDataToIFTTT(obj) {
    if (!connected || !socket) {
        adapter.log.warn('Cannot send IFTTT message, while not connected: ' + JSON.stringify(obj));
        return;
    }
    if (!obj) {
        adapter.log.warn('No data to send to IFTTT');
        return;
    }
    if (!adapter.config.iftttKey && (typeof obj !== 'object' || !obj.key)) {
        adapter.log.warn('No IFTTT key is defined');
        return;
    }
    if (typeof obj !== 'object') {
        socket.emit('ifttt', {
            id: adapter.namespace + '.services.ifttt',
            key: adapter.config.iftttKey,
            val: obj
        });
    } else if (obj.event) {
        socket.emit('ifttt', {
            event: obj.event,
            key: obj.key || adapter.config.iftttKey,
            value1: obj.value1,
            value2: obj.value2,
            value3: obj.value3
        });
    } else {
        if (obj.val === undefined) {
            adapter.log.warn('No value is defined');
            return;
        }
        obj.id = obj.id || (adapter.namespace + '.services.ifttt');
        socket.emit('ifttt', {
            id: obj.id,
            key: obj.key || adapter.config.iftttKey,
            val: obj.val,
            ack: obj.ack
        });
    }
}

function createAiConnection() {
    var tools  = require(utils.controllerDir + '/lib/tools');
    var fs     = require('fs');
    var config = null;
    var getConfigFileName = tools.getConfigFileName;

    if (fs.existsSync(getConfigFileName())) {
        config = JSON.parse(fs.readFileSync(getConfigFileName()));
        if (!config.states)  config.states  = {type: 'file'};
        if (!config.objects) config.objects = {type: 'file'};
    } else {
        adapter.log.warn('Cannot find ' + getConfigFileName());
        return;
    }
    var States;
    if (config.states && config.states.type) {
        if (config.states.type === 'file') {
            States = require(utils.controllerDir + '/lib/states/statesInMemClient');
        } else if (config.states.type === 'redis') {
            States = require(utils.controllerDir + '/lib/states/statesInRedis');
        } else {
            throw 'Unknown objects type: ' + config.states.type;
        }
    } else {
        States  = require(utils.controllerDir + '/lib/states');
    }

    statesAI = new States({
        namespace:  adapter.namespace + 'ai',
        connection: config.states,
        connected: function () {
            statesAI.subscribe('*');
        },
        logger: adapter.log,
        change: function (id, state) {
            adapter.inputCount++;
            if (typeof id !== 'string' || !id || state === 'null' || !state) {
                return;
            }

            // do not send "system. ..."
            if (id.match(/^system\./)) {
                return;
            }

            if (id.match(/^smartmeter\./) || id.match(/^b-control-em/)) return;

            var type = typeof state.val;

            if (type === 'string') {
                var f = parseFloat(state.val);
                if (f.toString() === state.val) {
                    state.val = f;
                } else if (state.val === 'true') {
                    state.val = true;
                } else if (state.val === 'false') {
                    state.val = false;
                } else {
                    // ignore strings
                    return;
                }
            }

            if (type !== 'number' && type !== 'boolean') {
                return;
            } else if (type === 'boolean') {
                state.val = state.val ? 1 : 0;
            }

            if (socket) {
                // extract additional information about this
                adapter.getForeignObject(id, function (err, obj) {
                    if (obj && obj.common) {
                        if (obj.common.unit === '°C' || obj.common.unit === 'C°' || (obj.common.unit === '%' && obj.common.max !== 1)) {
                            // we do not need exact information
                            state.val = Math.round(state.val);
                        }
                        if (state.from) {
                            state.from = state.from.replace(/^system\.adapter\./, '');
                        }
                        if (!state.ts) {
                            state.ts = new Date().getTime();
                        }

                        if (type)

        /*                if (sentStates[id] && sentStates[id].timer) {
                            clearTimeout(sentStates[id].timer);
                        }
                        sentStates[id] = sentStates[id] || {};
                        sentStates[id].timer = setTimeout(function (_id, _state))
          */
                        delete state.lc;
                        delete state.q;
                        socket.emit('ai', id, state);
                    }
                });
            }
        }
    });
}

function validateName(name) {
    if (!name) return false;

    for (var n = 0; n < name.length; n++) {
        if (name[n] === ';' || name[n] === '.' || name[n] === '-' || name[n] === ':') return false;
    }

    return true;
}

function findRole(states, id, role) {
    var parts = id.split('.');
    parts.pop();
    var channel = parts.join('.') + '.';
    for (var i in states) {
        if (states.hasOwnProperty(i) &&
            i.substring(0, channel.length) === channel &&
            i !== id &&
            states[i].common &&
            states[i].common.role === role) {
            return i;
        }
    }
    return null;
}

function processState(states, id, room, func, alexaIds, groups, names, result) {
    try {
        var actions;
        var friendlyName = states[id].common.smartName;
        var nameModified = false;
        var byON;
        if (!id) {
            return;
        }
        if (states[id] && states[id].native) {
            if (states[id].native.byON) {
                byON = states[id].native.byON;
                delete states[id].native.byON;
                var smartName = states[id].common.smartName;

                if (!smartName || typeof smartName !== 'object') {
                    smartName = {
                        byON:   byON,
                        en:     smartName
                    };
                    smartName[lang] = smartName.en;
                } else {
                    smartName.byON = byON;
                }
                states[id].common.smartName = smartName || {};
                friendlyName = states[id].common.smartName;
            } else if (typeof states[id].common.smartName === 'string') {
                var nnn = states[id].common.smartName;
                states[id].common.smartName = {};
                states[id].common.smartName[lang] = nnn;
                friendlyName = states[id].common.smartName;
            }
        } else {
            adapter.log.warn('Invalid state "' + id + '". Not exist or no native part.');
            return null;
        }

        byON = (states[id].common.smartName && typeof states[id].common.smartName === 'object') ? states[id].common.smartName.byON : '';

        if (typeof friendlyName === 'object' && states[id].common.smartName) {
            friendlyName = states[id].common.smartName[lang] || states[id].common.smartName.en;
        }

        if (friendlyName === 'ignore' || friendlyName === false) return null;

        if (!friendlyName && !room && !func) return null;

        var friendlyNames = [];
        if (!friendlyName) {
            if (room) {
                // translate room
                if (translate) {
                    translateRooms     = translateRooms     || require(__dirname + '/lib/rooms.js');
                    translateFunctions = translateFunctions || require(__dirname + '/lib/functions.js');
                    room = translateRooms(lang, room);
                    func = translateFunctions(lang, func);
                }

                if (adapter.config.functionFirst) {
                    if (lang === 'en') {
                        friendlyName = func + (adapter.config.concatWord ? ' ' + adapter.config.concatWord : '') + ' ' + room;
                    } else {
                        friendlyName = func + (adapter.config.concatWord ? ' ' + adapter.config.concatWord : '') + ' ' + room;
                    }
                } else {
                    if (lang === 'en') {
                        friendlyName = room + (adapter.config.concatWord ? ' ' + adapter.config.concatWord : '') + ' ' + func;
                    } else {
                        friendlyName = room + (adapter.config.concatWord ? ' ' + adapter.config.concatWord : '') + ' ' + func;
                    }
                }
            } else {
                friendlyName = states[id].common.name;
                if (adapter.config.replaces) {
                    for (var r = 0; r < adapter.config.replaces.length; r++) {
                        friendlyName = friendlyName.replace(adapter.config.replaces[r], '');
                    }
                }
            }
            friendlyNames[0] = friendlyName;
            nameModified = false;
        } else if (translate) {
            translateDevices = translateDevices || require(__dirname + '/lib/devices.js');
            friendlyName = translateDevices(lang, friendlyName);
            nameModified = true;
            friendlyNames = friendlyName.split(',');
        } else {
            friendlyNames = friendlyName.split(',');
            nameModified = true;
        }
        for (var i = friendlyNames.length - 1; i >= 0; i--) {
            friendlyNames[i] = (friendlyNames[i] || '').trim();
            if (!friendlyNames[i]) {
                friendlyNames.splice(i, 1);
            } else {
                // friendlyName may not be longer than 128
                friendlyNames[i] = friendlyNames[i].substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');
            }
        }

        if (!friendlyNames[0]) {
            adapter.log.warn('State ' + id + ' is invalid.');
            return
        }

        var friendlyDescription = (states[id].common.name || id);

        var type = states[id].common.type;

        if (states[id].common.write === false) {
            if (states[id].common.unit === 'C' || states[id].common.unit === 'C°' || states[id].common.unit === '°C' ||
                states[id].common.unit === 'F' || states[id].common.unit === 'F°' || states[id].common.unit === '°F' ||
                states[id].common.unit === 'K' || states[id].common.unit === 'K°' || states[id].common.unit === '°K') {
                actions = ['getTemperatureReading'];
                type = '';
            } else {
                adapter.log.debug('Name "' + (states[id].common.name || id) + '" cannot be written and will be ignored');
                return;
            }
        } else {
            if (type === 'number') {
                if (states[id].common.unit === 'C' || states[id].common.unit === 'C°' || states[id].common.unit === '°C' ||
                    states[id].common.unit === 'F' || states[id].common.unit === 'F°' || states[id].common.unit === '°F' ||
                    states[id].common.unit === 'K' || states[id].common.unit === 'K°' || states[id].common.unit === '°K') {
                    actions = ['setTargetTemperature', 'incrementTargetTemperature', 'decrementTargetTemperature', 'getTargetTemperature'];
                    type = '';
                } else if (states[id].common.role === 'level.color.saturation') {
                    actions = ['setColor', /*'incrementColorTemperature', 'decrementColorTemperature', 'setColorTemperature', */'turnOn', 'turnOff'];
                } else {
                    actions = ['setPercentage', 'incrementPercentage', 'decrementPercentage', 'turnOn', 'turnOff'];
                }
            } else if (states[id].common.role === 'switch.lock') {
                actions = ['setLockState', 'getLockState'];
                type = '';
            } else if (states[id].common.role && states[id].common.role.match(/^button/)) {
                actions = ['turnOn'];
                type = '';
            } else {
                actions = ['turnOn', 'turnOff'];
                type = '';
            }
        }

        friendlyDescription = friendlyDescription.substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');
        // any letter or number and _ - = # ; : ? @ &
        var applianceId = id.substring(0, 256).replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_');

        var pos;
        if (alexaIds && (pos = alexaIds.indexOf(id)) !== -1) {
            alexaIds.splice(pos, 1);
        }

        type = type ? (byON || '100') : false;
        var name = states[id].common.name ? states[id].common.name.substring(0, 128) : '';

        for (var n = 0; n < friendlyNames.length; n++) {
            var obj = {
                applianceId:		 applianceId + (friendlyNames.length > 1 ? '_' + n : ''),
                manufacturerName:	 'ioBroker',
                modelName:		     (states[id].common.name || words['No name'][lang]).substring(0, 128),
                version:			 '1',
                friendlyName:		 friendlyNames[n],
                friendlyDescription: friendlyDescription,
                isReachable:         true,
                actions:             actions,
                additionalApplianceDetails: {
                    id:            id.substring(0, 1024),
                    name:          name,
                    friendlyNames: friendlyNames.join(', '),
                    byON:          type,
                    nameModified:  nameModified,
                    room:          room,
                    func:          func
                }
            };

            if (names[friendlyNames[n]]) {
                // Ignore it, because yet in the list
                if (names[friendlyNames[n]].additionalApplianceDetails.id === id) return;

                // create virtual group
                if (groups[friendlyNames[n]]) {
                    var ids    = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.ids);
                    var _names = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.names || '[]');
                    var types  = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.byONs || '[]');
                    ids.push(id);
                    _names.push(name);
                    types.push(type);

                    // merge actions
                    for (var a = 0; a < actions.length; a++) {
                        if (groups[friendlyNames[n]].actions.indexOf(actions[a]) === -1) {
                            groups[friendlyNames[n]].actions.push(actions[a]);
                        }
                    }

                    groups[friendlyNames[n]].additionalApplianceDetails.ids   = JSON.stringify(ids);
                    groups[friendlyNames[n]].additionalApplianceDetails.names = JSON.stringify(_names);
                    groups[friendlyNames[n]].additionalApplianceDetails.byONs = JSON.stringify(types);

                    if (groups[friendlyNames[n]].additionalApplianceDetails.idhs && states[id].common.role === 'level.color.saturation') {
                        var idhs = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.idhs);
                        idhs.push(findRole(states, id, 'level.color.hue'));
                        groups[friendlyNames[n]].additionalApplianceDetails.idhs   = JSON.stringify(idhs);

                        var idbs = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.idbs);
                        idbs.push(findRole(states, id, 'level.dimmer'));
                        groups[friendlyNames[n]].additionalApplianceDetails.idbs   = JSON.stringify(idbs);

                        var idos = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.idos);
                        idos.push(findRole(states, id, 'switch'));
                        groups[friendlyNames[n]].additionalApplianceDetails.idos   = JSON.stringify(idos);
                    }
                } else {
                    groups[friendlyNames[n]] = {
                        applianceId:		 friendlyNames[n].replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_'),
                        manufacturerName:	 'ioBroker group',
                        modelName:		     (states[id].common.name || words['No name'][lang]).substring(0, 128),
                        version:			 '1',
                        friendlyName:		 friendlyNames[n],
                        friendlyDescription: words['Group'][lang] + ' ' + friendlyNames[n],
                        isReachable:         true,
                        actions:             actions,
                        additionalApplianceDetails: {
                            ids:   JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.id,   id]),
                            names: JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.name, name]),
                            byONs: JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.byON, type]),
                            room:  room,
                            func:  func
                        }
                    };

                    if (states[id].common.role === 'level.color.saturation') {
                        groups[friendlyNames[n]].additionalApplianceDetails.idhs = JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.idh,   findRole(states, id, 'level.color.hue')]);
                        groups[friendlyNames[n]].additionalApplianceDetails.idbs = JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.idb,   findRole(states, id, 'level.dimmer')]);
                        groups[friendlyNames[n]].additionalApplianceDetails.idos = JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.ido,   findRole(states, id, 'switch')]);
                    }

                    result.push(groups[friendlyNames[n]]);
                    names[friendlyNames[n]].disabled = true;
                }
                obj = null;
            } else {
                names[friendlyNames[n]] = obj;
                if (states[id].common.role === 'level.color.saturation') {
                    obj.additionalApplianceDetails.idh = findRole(states, id, 'level.color.hue');
                    obj.additionalApplianceDetails.idb = findRole(states, id, 'level.dimmer');
                    obj.additionalApplianceDetails.ido = findRole(states, id, 'switch');
                }
            }

            if (obj) result.push(obj);
        }
    } catch (e) {
        adapter.log.error('Cannot process "' + id + '": ' + e);
    }
}

function getDevices(callback) {
    adapter.objects.getObjectView('system', 'state', {}, function (err, _states) {
        var states   = {};
        var ids      = [];
        var alexaIds = [];
        var groups   = {};
        var names    = {};
        enums        = [];
        if (_states && _states.rows) {
            for (var i = 0; i < _states.rows.length; i++) {
                if (_states.rows[i].value) {
                    states[_states.rows[i].id] = _states.rows[i].value;
                    ids.push(_states.rows[i].id);
                    if (_states.rows[i].value.common && _states.rows[i].value.common.smartName && _states.rows[i].value.common.smartName !== 'ignore') {
                        alexaIds.push(_states.rows[i].id);
                    }
                }
            }
        }
        ids.sort();
        adapter.objects.getObjectView('system', 'enum', {}, function (err, doc) {
            // Build overlap from rooms and functions
            var rooms = [];
            var funcs = [];
            if (doc && doc.rows) {
                for (var i = 0, l = doc.rows.length; i < l; i++) {
                    if (doc.rows[i].value) {
                        var _id = doc.rows[i].id;
                        if (_id.match(/^enum\.rooms\./)     && doc.rows[i].value.common.smartName !== 'ignore' && doc.rows[i].value.common.smartName !== false) {
                            rooms.push(doc.rows[i].value);
                        }
                        if (_id.match(/^enum\.functions\./) && doc.rows[i].value.common.smartName !== 'ignore' && doc.rows[i].value.common.smartName !== false) {
                            funcs.push(doc.rows[i].value);
                        }
                        if (_id.match(/^enum\.rooms\./) || _id.match(/^enum\.functions\./)) {
                            enums.push({
                                id:         _id,
                                name:       doc.rows[i].value.common.name,
                                smartName:  doc.rows[i].value.common.smartName
                            });
                        }
                    }
                }
            }
            var result = [];
            var smartName;
            for (var f = 0; f < funcs.length; f++) {
                if (!funcs[f].common || !funcs[f].common.members || typeof funcs[f].common.members !== 'object' || !funcs[f].common.members.length) continue;

                for (var s = 0; s < funcs[f].common.members.length; s++) {
                    var id = funcs[f].common.members[s];
                    smartName = funcs[f].common.smartName;
                    if (smartName && typeof smartName === 'object') smartName = smartName[lang] || smartName.en;
                    var func = smartName || funcs[f].common.name;

                    if (!func) {
                        func = funcs[f]._id.substring('enum.functions.'.length);
                        func = func[0].toUpperCase() + func.substring(1);
                    }

                    // Find room
                    var room = '';
                    for (var r = 0; r < rooms.length; r++) {
                        if (!rooms[r].common || !rooms[r].common.members || typeof rooms[r].common.members !== 'object' || !rooms[r].common.members.length) continue;

                        if (rooms[r].common.members.indexOf(id) !== -1) {
                            smartName = rooms[r].common.smartName;
                            if (smartName && typeof smartName === 'object') smartName = smartName[lang] || smartName.en;
                            room = smartName || rooms[r].common.name;
                            if (!room) {
                                room = rooms[r]._id.substring('enum.rooms.'.length);
                                room = room[0].toUpperCase() + room.substring(1);
                            }
                        }

                        if (!room) {
                            // may be the channel is in the room
                            var _parts = id.split('.');
                            _parts.pop();
                            var channel = _parts.join('.');
                            if (rooms[r].common.members.indexOf(channel) !== -1) {
                                smartName = funcs[f].common.smartName;
                                if (smartName && typeof smartName === 'object') smartName = smartName[lang] || smartName.en;
                                room = smartName || rooms[r].common.name;
                                if (!room) {
                                    room = rooms[r]._id.substring('enum.rooms.'.length);
                                    room = room[0].toUpperCase() + room.substring(1);
                                }
                            }
                        }
                        if (room) break;
                    }

                    if (!states[id]) {
                        var m = new RegExp('^' + id.replace(/\./g, '\\.'));
                        for (var ii = 0; ii < ids.length; ii++) {
                            if (ids[ii] < id) continue;
                            if (m.exec(ids[ii])) {
                                if (states[ids[ii]].common.role && (
                                    states[ids[ii]].common.role === 'state'  ||
                                    states[ids[ii]].common.role.match(/^switch/) ||
                                    states[ids[ii]].common.role.match(/^level/)
                                )) {
                                    processState(states, ids[ii], room, func, alexaIds, groups, names, result);
                                }
                                continue;
                            }
                            break;
                        }
                    } else {
                        processState(states, id, room, func, alexaIds, groups, names, result);
                    }
                }
            }

            // process states with defined smartName
            for (var j = 0; j < alexaIds.length; j++) {
                processState(states, alexaIds[j], null, null, null, groups, names, result);
            }
            result.sort(function (a, b) {
                if (a.friendlyName > b.friendlyName) return 1;
                if (a.friendlyName < b.friendlyName) return -1;
                return 0;
            });

            for (var k = result.length - 1; k >= 0; k--) {
                if (result[k].disabled) {
                    result.splice(k, 1);
                } else {
                    adapter.log.debug('Created ALEXA device: ' + result[k].friendlyName + ' ' + JSON.stringify(result[k].actions));
                }
            }
            callback(err, result);
        });
    });
}

function controlOnOff(id, value, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        if (obj.common.type === 'number') {
            var byON = (obj.common.smartName && typeof obj.common.smartName === 'object') ? obj.common.smartName.byON : null;

            // if ON
            if (value) {
                if (byON === '-' && valuesON[id]) {
                    adapter.log.debug('Use stored ON value for "' + id + '": ' + valuesON[id]);
                    value = valuesON[id];
                } else {
                    if (typeof obj.common.max !== 'undefined') {
                        value = byON ? parseFloat(byON) || obj.common.max : obj.common.max;
                    } else {
                        value = byON ? parseFloat(byON) || 100 : 100;
                    }
                }
            } else {
                // if OFF
                if (byON === '-') {
                    // remember last state
                    adapter.getForeignState(id, function (err, state) {
                        if (err) adapter.log.error('Cannot get state: ' + err);
                        if (state) valuesON[id] = state.val;

                        if (typeof obj.common.min !== 'undefined') {
                            value = obj.common.min;
                        } else {
                            value = 0;
                        }

                        adapter.setForeignState(id, value, function (err) {
                            if (err) adapter.log.error('Cannot switch device: ' + err);
                            if (callback) callback();
                        });
                    });
                    return;
                } else {
                    // blinds
                    if (typeof obj.common.min !== 'undefined') {
                        value = obj.common.min;
                    } else {
                        value = 0;
                    }
                }
            }
        }
        adapter.log.debug('Set "' + id + '" to ' + value);

        if (writeStates) {
            adapter.setState('smart.lastObjectID', id,    true);
        }

        adapter.setForeignState(id, value, function (err) {
            if (err) adapter.log.error('Cannot switch device: ' + err);
            if (callback) callback();
        });
    });
}

function controlPercent(id, value, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }

        var max = 100;
        var min = 0;

        if (typeof obj.common.max !== 'undefined') max = parseFloat(obj.common.max);
        if (typeof obj.common.min !== 'undefined') min = parseFloat(obj.common.min);
        if (value < 0)   value = 0;
        if (value > 100) value = 100;

        value = (value / 100) * (max - min) + min;

        if (obj.common.type === 'boolean') {
            value = (value >= adapter.config.deviceOffLevel);
        } else if (adapter.config.deviceOffLevel && value >= adapter.config.deviceOffLevel && (!obj.common.role || obj.common.role.indexOf('blind') === -1)) {
            valuesON[id] = value;
            adapter.log.debug('Remember ON value for  "' + id + '": ' + value);
        }

        if (writeStates) {
            adapter.setState('smart.lastObjectID', id, true);
        }

        adapter.setForeignState(id, value, function (err) {
            if (err) adapter.log.error('Cannot switch device: ' + err);
            if (callback) callback();
        });
    });
}

function controlDelta(id, delta, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        adapter.getForeignState(id, function (err, state) {
            var value = state ? (state.val || 0) : 0;
            var max = 100;
            var min = 0;
            if (typeof obj.common.max !== 'undefined') max = parseFloat(obj.common.max);
            if (typeof obj.common.min !== 'undefined') min = parseFloat(obj.common.min);

            // Absolute value => percent => add delta
            value = (max - min) / (value - min) * 100 + delta;
            if (value > 100) value = 100;
            if (value < 0)   value = 0;
            // percent => absolute value
            value = (value / 100) * (max - min) + min;

            if (obj.common.type === 'boolean') {
                value = (value >= adapter.config.deviceOffLevel);
            } else if (adapter.config.deviceOffLevel && value >= adapter.config.deviceOffLevel) {
                adapter.log.debug('Remember ON value for  "' + id + '": ' + value);
                valuesON[id] = value;
            }

            if (writeStates) {
                adapter.setState('smart.lastObjectID', id, true);
            }

            adapter.setForeignState(id, value, function (err) {
                if (err) adapter.log.error('Cannot set device: ' + err);
                if (callback) callback();
            });
        });
    });
}

function controlTemperature(id, value, writeStates, callback) {
    //{
    //    "header" : {
    //    "namespace" : "Alexa.ConnectedHome.Control",
    //        "name" : "SetTargetTemperatureConfirmation",
    //        "payloadVersion" : "2",
    //        "messageId" : "cc36e80c-6357-41e0-9dd4-b76cb3a394e3"
    //    },
    //    "payload" : {
    //        "targetTemperature" : {
    //            "value" : 25.0
    //        },
    //        "temperatureMode" : {
    //            "value" : "AUTO"
    //        },
    //        "previousState" : {
    //            "targetTemperature" : {
    //                "value" : 21.0
    //            },
    //            "mode" : {
    //                "value" : "AUTO"
    //            }
    //        }
    //    }
    //}

    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        value = parseFloat(value);
        var max;
        var min;
        if (typeof obj.common.max !== 'undefined') max = parseFloat(obj.common.max);
        if (typeof obj.common.min !== 'undefined') min = parseFloat(obj.common.min);

        if (min !== undefined && value < min) value = min;
        if (max !== undefined && value > max) value = max;

        if (obj.common.type === 'boolean') value = !!value;

        adapter.getForeignState(id, function (err, state) {
            if (err) adapter.log.error('Cannot read device: ' + err);

            if (writeStates) {
                adapter.setState('smart.lastObjectID', id, true);
            }

            adapter.setForeignState(id, value, function (err) {
                if (err) adapter.log.error('Cannot switch device: ' + err);
                var response = {
                    payload: {
                        targetTemperature: {
                            value: value
                        },
                        /*temperatureMode: {
                         value: 'AUTO'
                         },*/
                        previousState: {
                            targetTemperature: {
                                value: state ? parseFloat(state.val) || 0 : 0
                            },
                            mode: {
                                value: 'AUTO'
                            }
                        }
                    }
                };

                if (callback) callback(null, response);
            });
        });
    });
}

function getTemperature(id, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }

        adapter.getForeignState(id, function (err, state) {
            if (err) adapter.log.error('Cannot read device: ' + err);

            if (writeStates) {
                adapter.setState('smart.lastObjectID', id, true);
            }

            if (callback) callback(null, state ? state.val : null, state ? state.ts : null);
        });
    });
}

function getTargetTemperature(id, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }

        adapter.getForeignState(id, function (err, state) {
            if (err) adapter.log.error('Cannot read device: ' + err);

            if (writeStates) {
                adapter.setState('smart.lastObjectID', id, true);
            }

            if (callback) callback(null, state ? state.val : null, state ? state.ts : null);
        });
    });
}

function controlTemperatureDelta(id, delta, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        adapter.getForeignState(id, function (err, state) {
            var value = state ? state.val || 0 : 0;
            var max;
            var min;
            if (typeof obj.common.max !== 'undefined') max = parseFloat(obj.common.max);
            if (typeof obj.common.min !== 'undefined') min = parseFloat(obj.common.min);

            // Absolute value => percent => add delta
            value = value + delta;
            if (max !== undefined && value > max) value = max;
            if (min !== undefined && value < min) value = min;

            if (obj.common.type === 'boolean') value = !!value;

            adapter.getForeignState(id, function (err, state) {
                if (err) adapter.log.error('Cannot read device: ' + err);

                if (writeStates) {
                    adapter.setState('smart.lastObjectID', id, true);
                }

                adapter.setForeignState(id, value, function (err) {
                    if (err) adapter.log.error('Cannot switch device: ' + err);
                    var response = {
                        payload: {
                            targetTemperature: {
                                value: value
                            },
                            /*temperatureMode: {
                                value: 'AUTO'
                            },*/
                            previousState: {
                                targetTemperature: {
                                    value: state ? parseFloat(state.val) || 0 : 0
                                },
                                mode: {
                                    value: 'AUTO'
                                }
                            }
                        }
                    };

                    if (callback) callback(null, response);
                });
            });
        });
    });
}

function controlLock(id, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        adapter.log.debug('Lock "' + id + '"');

        if (writeStates) {
            adapter.setState('smart.lastObjectID', id, true);
        }
        if (obj.native.LOCK_VALUE === undefined) {
            adapter.log.warn('Cannot choose value for lock: Please define in "' + id + '" the "native.LOCK_VALUE" with locking value');
            if (callback) callback('Cannot choose value for lock');
        } else {
            adapter.setForeignState(id, obj.native.LOCK_VALUE, function (err) {
                if (err) adapter.log.error('Cannot switch device: ' + err);
                if (callback) callback();
            });
        }
    });
}

function getLock(id, writeStates, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        adapter.log.debug('Get lock state "' + id + '"');

        if (writeStates) {
            adapter.setState('smart.lastObjectID', id, true);
        }
        if (obj.native.LOCK_VALUE === undefined) {
            adapter.log.warn('Cannot choose value for lock: Please define in "' + id + '" the "native.LOCK_VALUE" with locking value');
            if (callback) callback('Cannot choose value for lock');
        } else {
            adapter.getForeignState(id, function (err, state) {
                if (err || !state) adapter.log.error('Cannot switch device: ' + err);
                if (callback) {
                    if (obj.native.LOCK_VALUE === 'true'  || obj.native.LOCK_VALUE === '1' || obj.native.LOCK_VALUE === 1 || obj.native.LOCK_VALUE === 'locked')   obj.native.LOCK_VALUE = true;
                    if (obj.native.LOCK_VALUE === 'false' || obj.native.LOCK_VALUE === '0' || obj.native.LOCK_VALUE === 0 || obj.native.LOCK_VALUE === 'unlocked') obj.native.LOCK_VALUE = false;
                    if (state.val === 'true'  || state.val === '1' || state.val === 1 || state.val === 'locked')   state.val = true;
                    if (state.val === 'false' || state.val === '0' || state.val === 0 || state.val === 'unlocked') state.val = false;

                    callback(err, state.val !== obj.native.LOCK_VALUE, state.lc || state.ts);
                }
            });
        }
    });
}

function controlColor(idh, ids, idb, color, writeStates, callback) {
    // "color": {
    //     "hue": 0.0,
    //     "saturation": 1.0000,
    //     "brightness": 1.0000
    // }
    adapter.getForeignObject(idh, function (err, obj) {
        if (obj.common && obj.common.min !== undefined && obj.common.max !== undefined) {
            color.hue = Math.round((obj.common.max - obj.common.min) * (color.hue / 360)+ obj.common.min);
        }
        adapter.setForeignState(idh, color.hue, function (err) {
            if (err) adapter.log.error('Cannot read device: ' + err);

            if (writeStates) {
                adapter.setState('smart.lastObjectID', idh, true);
            }
            adapter.getForeignObject(ids, function (err, obj) {
                if (obj.common && obj.common.min !== undefined && obj.common.max !== undefined) {
                    color.saturation = (obj.common.max - obj.common.min) * color.saturation + obj.common.min;
                } else {
                    color.saturation *= 100;
                }

                adapter.setForeignState(ids, color.saturation, function (err) {
                    if (err) adapter.log.error('Cannot read device: ' + err);

                    adapter.getForeignObject(idb, function (err, obj) {
                        if (obj.common && obj.common.min !== undefined && obj.common.max !== undefined) {
                            color.brightness = (obj.common.max - obj.common.min) * color.brightness + obj.common.min;
                        } else {
                            color.brightness *= 100;
                        }

                        adapter.setForeignState(idb, color.brightness, function (err) {
                            if (err) adapter.log.error('Cannot read device: ' + err);
                            if (callback) callback(err);
                        });
                    });
                });
            });
        });
    });
}

function pingConnection() {
    if (!detectDisconnect) {
        if (connected) {
            // cannot use "ping" because reserved by socket.io
            socket.emit('pingg');

            detectDisconnect = setTimeout(function () {
                detectDisconnect = null;
                adapter.log.error('Ping timeout');
                if (connected) {
                    socket.close();
                    connected = false;
                    adapter.log.info('Connection changed: DISCONNECTED1');
                    adapter.setState('info.connection', false, true);
                    if (adapter.config.restartOnDisconnect) {
                        setTimeout(function () {
                            process.exit(-100); // simulate scheduled restart
                        }, 10000);
                    } else {
                        if (!connectTimer) {
                            connectTimer = setTimeout(connect, 10000);
                        }
                        checkPing();
                    }
                }
            }, 5000);
        }
    }
}

function writeResponse(applianceId, operation, value) {
    for (var d = 0; d < smartDevices.length; d++) {
        if (smartDevices[d].applianceId === applianceId) {
            var text;
            var obj = smartDevices[d];
            switch (operation) {
                case 'ONOFF':
                    if (value) {
                        if (lang === 'de') {
                            text = obj.friendlyName + ' ist <emphasis>eingeschaltet</emphasis>!';
                        } else if (lang === 'ru') {
                            text = obj.friendlyName + ' в состоянии включено';
                        } else {
                            text = obj.friendlyName + ' turned on';
                        }
                    } else {
                        if (lang === 'de') {
                            text = obj.friendlyName + ' ist <emphasis>ausgeschaltet</emphasis>!';
                        } else if (lang === 'ru') {
                            text = obj.friendlyName + ' в состоянии <emphasis>выключено</emphasis>';
                        } else {
                            text = obj.friendlyName + ' turned off';
                        }
                    }
                    break;

                case '%':
                    if (lang === 'de') {
                        text = obj.friendlyName + ' wird auf ' + value + ' Prozent <emphasis>gesetzt</emphasis>';
                    } else if (lang === 'ru') {
                        text = 'Состояние ' + obj.friendlyName + ' <emphasis>установлено</emphasis> на ' + value;
                    } else {
                        text = obj.friendlyName + ' set to ' + value + ' <emphasis>percent</emphasis>';
                    }
                    break;

                case '<>':
                    if (value >= 0) {
                        if (lang === 'de') {
                            text = obj.friendlyName + ' ist <emphasis>erhöht</emphasis> um ' + value + ' Prozent';
                        } else if (lang === 'ru') {
                            text = 'Состояние ' + obj.friendlyName + ' <emphasis>увеличено</emphasis> на ' + value;
                        } else {
                            text = obj.friendlyName + ' <emphasis>increased</emphasis> on ' + value + ' percent';
                        }
                        value = '+' + value;
                    } else {
                        if (lang === 'de') {
                            text = obj.friendlyName + ' ist <emphasis>verkleinert</emphasis> um ' + value + ' Prozent';
                        } else if (lang === 'ru') {
                            text = 'Состояние ' + obj.friendlyName + ' <emphasis>уменьшено</emphasis> на ' + value;
                        } else {
                            text = obj.friendlyName + ' <emphasis>decreased</emphasis> on ' + value + ' percent';
                        }
                        value = '-' + value;
                    }
                    break;
            }
            if (text) {
                adapter.setState('smart.lastResponse', text, true);
                if (adapter.config.responseOID) {
                    adapter.setForeignState(adapter.config.responseOID, text, false);
                }

                adapter.setState('smart.lastFunction', obj.additionalApplianceDetails.func, true);
                adapter.setState('smart.lastRoom',     obj.additionalApplianceDetails.room, true);
                adapter.setState('smart.lastCommand',  value, true);
            }
            return;
        }
    }
    adapter.log.warn('Unknown applianceId: ' + applianceId);
}

function checkPing() {
    if (connected) {
        if (!pingTimer) {
            pingTimer = setInterval(pingConnection, 10000);
        }
    } else {
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
        if (detectDisconnect) {
            clearTimeout(detectDisconnect);
            detectDisconnect = null;
        }
    }
}

function processIfttt(data, callback) {
    adapter.log.debug('Received IFTTT object: ' + data);

    if (typeof data === 'string' && data[0] === '{') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            adapter.log.debug('Cannot parse: ' + data);
        }
    }

    if (typeof data === 'object') {
        if (data.id) {
            if (data.id === adapter.namespace + '.services.ifttt') {
                data.ack = true;
            }
            if (data.val === undefined) {
                callback && callback({error: 'No value set'});
                return;
            }
            adapter.getForeignObject(data.id, function (err, obj) {
                if (!obj || !obj.common) {
                    callback && callback({error: 'Unknown ID: ' + data.id});
                } else {
                    if (typeof data.val === 'string') data.val = data.val.replace(/^@ifttt\s?/, '');
                    if (obj.common.type === 'boolean') {
                        data.val = data.val === true || data.val === 'true' || data.val === 'on' || data.val === 'ON' || data.val === 1 || data.val === '1';
                    } else if (obj.common.type === 'number') {
                        data.val = parseFloat(data.val);
                    }

                    adapter.setForeignState(data.id, data.val, data.ack);
                }
            });
        } else if (data.val !== undefined) {
            if (typeof data.val === 'string') data.val = data.val.replace(/^@ifttt\s?/, '');
            adapter.setState('services.ifttt', data.val, true, callback);
        } else {
            if (typeof data === 'string') data = data.replace(/^@ifttt\s?/, '');
            adapter.setState('services.ifttt', JSON.stringify(data), true, callback);
        }
    } else {
        if (typeof data === 'string') data = data.replace(/^@ifttt\s?/, '');
        adapter.setState('services.ifttt', data, true, callback);
    }
}

function connect() {
    if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
    }

    if (socket) {
        socket.close();
    }

    socket = require('socket.io-client')(adapter.config.cloudUrl || 'https://iobroker.net:10555', {
        reconnection: true,
        rejectUnauthorized: !adapter.config.allowSelfSignedCertificate,
        reconnectionDelay:    5000,
        timeout:              5000,
        reconnectionDelayMax: 10000
    });

    socket.on('connect', function () {
        if (!connected) {
            adapter.log.info('Connection changed: CONNECTED1');
            connected = true;
            adapter.setState('info.connection', true, true);
            checkPing();
        } else {
            adapter.log.info('Connection changed: CONNECTED4');
        }
        socket.emit('apikey', adapter.config.apikey);
    });
    socket.on('reconnect', function () {
        if (!connected) {
            adapter.log.info('Connection changed: CONNECTED2');
            connected = true;
            adapter.setState('info.connection', true, true);
            checkPing();
        }
        socket.emit('apikey', adapter.config.apikey);
    });
    socket.on('reconnecting', function () {
        if (connected) {
            adapter.log.info('Connection changed: DISCONNECTED2');
            connected = false;
            adapter.setState('info.connection', false, true);
            if (adapter.config.restartOnDisconnect) {
                setTimeout(function () {
                    process.exit(-100); // simulate scheduled restart
                }, 10000);
            } else {
                checkPing();
            }
        }
    });
    socket.on('disconnect', function () {
        adapter.log.info('Connection changed: DISCONNECTED3');
        if (connected) {
            connected = false;
            adapter.setState('info.connection', false, true);
            if (adapter.config.restartOnDisconnect) {
                setTimeout(function () {
                    process.exit(-100); // simulate scheduled restart
                }, 10000);
            } else {
                checkPing();
            }
        }
    });

    socket.on('error', function (error) {
        adapter.log.error('Connection error: ' + error);
        if (connected) {
            socket.close();
            connected = false;
            adapter.log.info('Connection changed: DISCONNECTED4');
            adapter.setState('info.connection', false, true);
            if (adapter.config.restartOnDisconnect) {
                setTimeout(function () {
                    process.exit(-100); // simulate scheduled restart
                }, 10000);
            } else {
                if (!connectTimer) {
                    connectTimer = setTimeout(connect, 10000);
                }
                checkPing();
            }
        }
    });

    // cannot use "pong" because reserved by socket.io
    socket.on('pongg', function (error) {
        clearTimeout(detectDisconnect);
        detectDisconnect = null;
    });

    var server = 'http://localhost:8082';
    socket.on('html', function (url, cb) {
        request({url: server + url, encoding: null}, function (error, response, body) {
            cb(error, response ? response.statusCode : 501, response ? response.headers : [], body);
        });
    });

    socket.on('alexa', function (request, callback) {
        adapter.log.debug(new Date().getTime() + ' ALEXA: ' + JSON.stringify(request));
        var ids;
        var idos;
        var count;
        var i;
        if (request && request.payload && request.payload.appliance && request.payload.appliance.additionalApplianceDetails) {
            if (request.payload.appliance.additionalApplianceDetails.ids) {
                ids = JSON.parse(request.payload.appliance.additionalApplianceDetails.ids);
            } else {
                ids = [request.payload.appliance.additionalApplianceDetails.id];
            }
            if (request.payload.appliance.additionalApplianceDetails.ido || request.payload.appliance.additionalApplianceDetails.idos) {
                if (request.payload.appliance.additionalApplianceDetails.idos) {
                    idos = JSON.parse(request.payload.appliance.additionalApplianceDetails.idos);
                } else {
                    idos = [request.payload.appliance.additionalApplianceDetails.ido];
                }
            }
            count = ids.length;
        }

        switch (request.header.name) {
            case 'DiscoverAppliancesRequest':
                //{
                //      "header": {
                //          "messageId": "6d6d6e14-8aee-473e-8c24-0d31ff9c17a2",
                //          "name": "DiscoverAppliancesRequest",
                //          "namespace": "Alexa.ConnectedHome.Discovery",
                //          "payloadVersion": "2"
                //      },
                //      "payload": {
                //          "accessToken": "*OAuth Token here*"
                //      }
                //}
                request.header.name = 'DiscoverAppliancesResponse';
                //if (smartDevices.length > 100) smartDevices.splice(50, smartDevices.length - 50);
                //console.log(JSON.stringify(smartDevices));
                var smartDevicesCopy = JSON.parse(JSON.stringify(smartDevices));
                for (var j = 0; j < smartDevicesCopy.length; j++) {
                    if (!smartDevicesCopy[j].additionalApplianceDetails) continue;
                    if (smartDevicesCopy[j].additionalApplianceDetails.names        !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.names;
                    if (smartDevicesCopy[j].additionalApplianceDetails.name         !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.name;
                    if (smartDevicesCopy[j].additionalApplianceDetails.byON         !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.byON;
                    if (smartDevicesCopy[j].additionalApplianceDetails.byONs        !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.byONs;
                    if (smartDevicesCopy[j].additionalApplianceDetails.nameModified !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.nameModified;
                    if (smartDevicesCopy[j].additionalApplianceDetails.room         !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.room;
                    if (smartDevicesCopy[j].additionalApplianceDetails.func         !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.func;
                }

                var response = {
                    header: request.header,
                    payload: {
                        discoveredAppliances: smartDevicesCopy/*[
                         {
                         "applianceId":          "hm-rpc",
                         "manufacturerName":     "ioBroker",
                         "modelName":            "Bad.Hauptlicht.Aktor.STATE",
                         "version":              "1",
                         "friendlyName":         "Licht im Bad",
                         "friendlyDescription":  "Bad Hauptlicht Aktor STATE",
                         "isReachable":          true,
                         "actions": [
                         "incrementTargetTemperature",
                         "decrementTargetTemperature",
                         "setTargetTemperature"
                         ],
                         "additionalApplianceDetails": {
                         id: 'hm-rpc.1.1'
                         }
                         },{
                         "applianceId":          "hm-rpc-1",
                         "manufacturerName":     "ioBroker",
                         "modelName":            "Bad.Hauptlicht.Aktor.STATE",
                         "version":              "1",
                         "friendlyName":         "Licht im Bad",
                         "friendlyDescription":  "Bad Hauptlicht Aktor STATE",
                         "isReachable":          true,
                         "actions": [
                         "incrementTargetTemperature",
                         "decrementTargetTemperature",
                         "setTargetTemperature"
                         ],
                         "additionalApplianceDetails": {}
                         },
                         {
                         "applianceId":      "uniqueThermostatDeviceId",
                         "manufacturerName": "yourManufacturerName",
                         "modelName":        "fancyThermostat",
                         "version":          "your software version number here.",
                         "friendlyName":     "Bedroom Thermostat",
                         "friendlyDescription": "descriptionThatIsShownToCustomer",
                         "isReachable":      true,
                         "actions": [
                         "incrementTargetTemperature",
                         "decrementTargetTemperature",
                         "setTargetTemperature"
                         ],
                         "additionalApplianceDetails": {
                         }
                         },
                         {
                         "actions": [
                         "incrementPercentage",
                         "decrementPercentage",
                         "setPercentage",
                         "turnOn",
                         "turnOff"
                         ],
                         "additionalApplianceDetails": {},
                         "applianceId":          "uniqueLightDeviceId",
                         "friendlyDescription":  "descriptionThatIsShownToCustomer",
                         "friendlyName":         "Living Room",
                         "isReachable":          true,
                         "manufacturerName":      "yourManufacturerName",
                         "modelName":            "fancyLight",
                         "version":              "your software version number here."
                         }
                         ]*/
                    }
                };
                callback(response);
                //console.log(JSON.stringify(response, null, 2));
                request = null;
                smartDevicesCopy = null;
                break;

            case 'TurnOnRequest':
                //  {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "TurnOnRequest",
                //          "namespace": "Alexa.ConnectedHome.Control",
                //          "payloadVersion": "2"
                //      },
                //      "payload": {
                //          "accessToken": "[OAuth Token here]",
                //          "appliance": {
                //              "additionalApplianceDetails": {},
                //              "applianceId": "[Device ID for Ceiling Fan]"
                //          }
                //      }
                // }
                adapter.log.debug('ALEXA ON: ' + request.payload.appliance.applianceId);
                for (i = 0; i < ids.length; i++) {
                    controlOnOff((idos && idos[i] !== undefined) ? idos[i] : ids[i], true, ids.length === 1, function () {
                        if (!--count) {
                            request.header.name = 'TurnOnConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
                            request = null;
                        }
                    });
                }
                writeResponse(request.payload.appliance.applianceId, 'ONOFF', true);
                break;

            case 'TurnOffRequest':
                //  {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "TurnOffRequest",
                //          "namespace": "Alexa.ConnectedHome.Control",
                //          "payloadVersion": "2"
                //      },
                //      "payload": {
                //          "accessToken": "[OAuth Token here]",
                //          "appliance": {
                //              "additionalApplianceDetails": {},
                //              "applianceId": "[Device ID for Ceiling Fan]"
                //          }
                //      }
                // }
                adapter.log.debug('ALEXA OFF: ' + request.payload.appliance.applianceId);

                for (i = 0; i < ids.length; i++) {
                    controlOnOff(ids[i], false, ids.length === 1, function (err) {
                        if (!--count) {
                            request.header.name = 'TurnOffConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
                            request = null;
                        }
                    });
                }
                writeResponse(request.payload.appliance.applianceId, 'ONOFF', false);
                break;

            case 'SetLockStateRequest':
                //  {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "TurnOnRequest",
                //          "namespace": "Alexa.ConnectedHome.Control",
                //          "payloadVersion": "2"
                //      },
                //      "payload": {
                //          "accessToken": "[OAuth Token here]",
                //          "appliance": {
                //              "additionalApplianceDetails": {},
                //              "applianceId": "[Device ID for Ceiling Fan]"
                //          }
                //      }
                // }
                adapter.log.debug('ALEXA ON: ' + request.payload.appliance.applianceId);
                for (i = 0; i < ids.length; i++) {
                    controlLock(ids[i], ids.length === 1, function (err) {
                        if (!--count) {
                            request.header.name = 'SetLockStateConfirmation';

                            if (err) {
                                callback({
                                    header: request.header,
                                    payload: {
                                        lockState: 'UNLOCKED'
                                    }
                                });
                            } else {
                                callback({
                                    header: request.header,
                                    payload: {
                                        lockState: 'LOCKED'
                                    }
                                });
                            }

                            request = null;
                        }
                    });
                }
                writeResponse(request.payload.appliance.applianceId, 'ONOFF', true);
                break;

            case 'GetLockStateRequest':
                //  {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "TurnOnRequest",
                //          "namespace": "Alexa.ConnectedHome.Control",
                //          "payloadVersion": "2"
                //      },
                //      "payload": {
                //          "accessToken": "[OAuth Token here]",
                //          "appliance": {
                //              "additionalApplianceDetails": {},
                //              "applianceId": "[Device ID for Ceiling Fan]"
                //          }
                //      }
                // }
                adapter.log.debug('ALEXA ON: ' + request.payload.appliance.applianceId);
                var result = null;
                for (i = 0; i < ids.length; i++) {
                    getLock(ids[i], ids.length === 1, function (err, value, ts) {
                        if (result === null || value === false) {
                            result = value;
                        }

                        if (!--count) {
                            request.header.name = 'GetLockStateResponse';

                            if (err) {
                                callback({
                                    header: request.header,
                                    payload: {
                                        lockState: 'UNLOCKED'
                                    }
                                });
                            } else {
                                callback({
                                    header: request.header,
                                    payload: {
                                        lockState: value ? 'LOCKED' : 'UNLOCKED',
                                        applianceResponseTimestamp: new Date(ts).toISOString()
                                    }
                                });
                            }

                            request = null;
                        }
                    });
                }
                break;

            case 'SetPercentageRequest':
                adapter.log.debug('ALEXA Percent: ' + request.payload.appliance.applianceId + ' ' + request.payload.percentageState.value + '%');
                for (i = 0; i < ids.length; i++) {
                    controlPercent(ids[i], request.payload.percentageState.value, ids.length === 1, function (err) {
                        if (!--count) {
                            request.header.name = 'SetPercentageConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
                            request = null;
                        }
                    });
                }
                writeResponse(request.payload.appliance.applianceId, '%', request.payload.percentageState.value);
                break;

            case 'IncrementPercentageRequest':
                adapter.log.debug('ALEXA Increment: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaPercentage.value + '%');
                for (i = 0; i < ids.length; i++) {
                    controlDelta(ids[i], request.payload.deltaPercentage.value, ids.length === 1, function (err) {
                        if (!--count) {
                            request.header.name = 'IncrementPercentageConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
                            request = null;
                        }
                    });
                }
                writeResponse(request.payload.appliance.applianceId, '<>', request.payload.deltaPercentage.value);
                break;

            case 'DecrementPercentageRequest':
                adapter.log.debug('ALEXA decrement: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaPercentage.value + '%');
                for (i = 0; i < ids.length; i++) {
                    controlDelta(ids[i], request.payload.deltaPercentage.value * (-1), ids.length === 1, function (err) {
                        if (!--count) {
                            request.header.name = 'DecrementPercentageConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
                            request = null;
                        }
                    });
                }
                writeResponse(request.payload.appliance.applianceId, '<>', (-1) * request.payload.deltaPercentage.value);
                break;

            case 'SetTargetTemperatureRequest':
                adapter.log.debug('ALEXA temperature Percent: ' + request.payload.appliance.applianceId + ' ' + request.payload.targetTemperature.value + ' grad');
                for (i = 0; i < ids.length; i++) {
                    controlTemperature(ids[i], request.payload.targetTemperature.value, ids.length === 1, function (err, response) {
                        if (!--count) {
                            request.header.name = 'SetTargetTemperatureConfirmation';
                            response.header = request.header;
                            callback(response);
                            request = null;
                        }
                    });
                }
                break;

            case 'IncrementTargetTemperatureRequest':
                request.payload.deltaTemperature.value = request.payload.deltaTemperature.value || 1;
                adapter.log.debug('ALEXA temperature Increment: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaTemperature.value + ' grad');
                for (i = 0; i < ids.length; i++) {
                    controlTemperatureDelta(ids[i], request.payload.deltaTemperature.value, ids.length === 1, function (err, response) {
                        if (!--count) {
                            request.header.name = 'IncrementTargetTemperatureConfirmation';
                            response.header = request.header;
                            callback(response);
                            request = null;
                        }
                    });
                }
                break;

            case 'DecrementTargetTemperatureRequest':
                request.payload.deltaTemperature.value = request.payload.deltaTemperature.value || 1;
                adapter.log.debug('ALEXA temperature decrement: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaTemperature.value + ' grad');
                for (i = 0; i < ids.length; i++) {
                    controlTemperatureDelta(ids[i], request.payload.deltaTemperature.value * (-1), ids.length === 1, function (err, response) {
                        if (!--count) {
                            request.header.name = 'DecrementTargetTemperatureConfirmation';
                            response.header = request.header;
                            callback(response);
                            request = null;
                        }
                    });
                }
                break;

            case 'GetTemperatureReadingRequest':
                adapter.log.debug('ALEXA temperature get: ' + request.payload.appliance.applianceId);
                var values = 0;
                var num = 0;
                for (i = 0; i < ids.length; i++) {
                    getTemperature(ids[i], ids.length === 1, function (err, value, ts) {
                        num++;
                        values += value;
                        if (!--count) {
                            request.header.name = 'GetTemperatureReadingResponse';

                            if (err) {
                                callback({
                                    header: request.header,
                                    payload: {
                                        temperatureReading: {
                                            value: 0
                                        },
                                        applianceResponseTimestamp: new Date().toISOString()
                                    }
                                });
                            } else {
                                callback({
                                    header: request.header,
                                    payload: {
                                        temperatureReading: {
                                            value: Math.round(values * 10 / num) / 10
                                        },
                                        applianceResponseTimestamp: new Date(ts).toISOString()
                                    }
                                });
                            }

                            request = null;
                        }
                    });
                }
                break;

            case 'GetTargetTemperatureRequest':
                adapter.log.debug('ALEXA temperature target get: ' + request.payload.appliance.applianceId);
                for (i = 0; i < ids.length; i++) {
                    getTargetTemperature(ids[i], ids.length === 1, function (err, value, ts) {
                        if (!--count) {
                            request.header.name = 'GetTargetTemperatureResponse';

                            callback({
                                header: request.header,
                                payload: {
                                    targetTemperature: {
                                        value: value,
                                        temperatureMode: {
                                            value: 'CUSTOM',
                                            friendlyName: ''
                                        }
                                    },
                                    applianceResponseTimestamp: new Date(ts).toISOString()
                                }
                            });

                            request = null;
                        }
                    });
                }
                break;

            case 'SetColorRequest':
                adapter.log.debug('ALEXA Color: ' + request.payload.appliance.applianceId + ' ' + JSON.stringify(request.payload.color));

                var idhs;
                var idbs;
                if (request && request.payload && request.payload.appliance && request.payload.appliance.additionalApplianceDetails) {
                    if (request.payload.appliance.additionalApplianceDetails.idhs) {
                        idhs = JSON.parse(request.payload.appliance.additionalApplianceDetails.idhs);
                    } else {
                        idhs = [request.payload.appliance.additionalApplianceDetails.idh];
                    }
                    count = idhs.length;
                    if (request.payload.appliance.additionalApplianceDetails.idbs) {
                        idbs = JSON.parse(request.payload.appliance.additionalApplianceDetails.idbs);
                    } else {
                        idbs = [request.payload.appliance.additionalApplianceDetails.idb];
                    }
                }

                var color = request.payload.color;

                for (i = 0; i < ids.length; i++) {
                    controlColor(idhs[i], ids[i], idbs[i], color, ids.length === 1, function (err) {
                        if (!--count) {
                            request.header.name = 'SetColorConfirmation';

                            callback({
                                header: request.header,
                                payload: {
                                    achievedState: {
                                        color: color
                                    }
                                }
                            });
                            request = null;
                        }
                    });
                }
                //writeResponse(request.payload.appliance.applianceId, '%', request.payload.percentageState.value);
                break;

            case 'HealthCheckRequest':
                request.header.name = 'HealthCheckResponse';
                try {
                    adapter.log.debug('HealthCheckRequest duration: ' + (new Date().getTime() - request.payload.initiationTimestamp) + ' ms');
                } catch (e) {
                    adapter.log.error('No payload');
                }

                callback({
                    header: request.header,
                    payload: {
                        description: "Das System ist OK",
                        isHealthy: true
                    }
                });
                request = null;
                break;

            default:
                request.header.name = 'NotSupportedInCurrentModeError';
                callback({
                    header: request.header,
                    payload: {}
                });
                request = null;
                break;
        }
    });

    socket.on('ifttt', processIfttt);

    socket.on('iftttError', function (error) {
        adapter.log.error('Error from IFTTT: ' + JSON.stringify(error));
    });

    socket.on('cloudError', function (error) {
        adapter.log.error('Cloud says: ' + error);
    });

    socket.on('service', function (data, callback) {
        // supported services:
        // - text2command
        // - simpleApi
        // - custom, e.g. torque
        if (data.name === 'ifttt') {
            processIfttt(data.data, callback);
        } else
        if (data.name === 'text2command') {
            adapter.setForeginState(adapter.config.text2command || 'text2command.0.text', decodeURIComponent(data.data), callback);
        } else if (data.name === 'simpleApi') {

        } else {
            adapter.getObject('services.' + data.name, function (err, obj) {
                if (!obj) {
                    adapter.setObject('services.' + data.name, {
                        _id: adapter.namespace + '.services.' + data.name,
                        type: 'state',
                        common: {
                            name: 'Service for ' + data.name,
                            write: false,
                            read: true,
                            type: 'mixed'
                        },
                        native: {}
                    }, function (err) {
                        adapter.setState('services.' + data.name, data.data, false);
                    });
                } else {
                    adapter.setState('services.' + data.name, data.data, false);
                }
            });
        }

    });

    if (adapter.config.instance) {
        if (adapter.config.instance.substring(0, 'system.adapter.'.length) !== 'system.adapter.') {
            adapter.config.instance = 'system.adapter.' + adapter.config.instance;
        }

        adapter.getForeignObject(adapter.config.instance, function (err, obj) {
            if (obj) {
                server = 'http' + (obj.native.secure ? 's' : '')  + '://';
                // todo if run on other host
                server += (!obj.native.bind || obj.native.bind === '0.0.0.0') ? '127.0.0.1' : obj.native.bind;
                server += ':' + obj.native.port;

                ioSocket = new IOSocket(socket, {clientid: adapter.config.apikey}, adapter);
            } else {
                adapter.log.error('Unknown instance ' + adapter.log.instance);
                throw new Error('Unknown instance ' + adapter.log.instance);
            }
        });
    } else {
        ioSocket = new IOSocket(socket, {clientid: adapter.config.apikey}, adapter);
    }
}

function main() {
    if (adapter.config.deviceOffLevel === undefined) adapter.config.deviceOffLevel = 30;
    adapter.config.deviceOffLevel = parseFloat(adapter.config.deviceOffLevel) || 0;
    adapter.config.concatWord = (adapter.config.concatWord || '').toString().trim();
    adapter.config.apikey = (adapter.config.apikey || '').trim();
    adapter.config.replaces = adapter.config.replaces ? adapter.config.replaces.split(',') : null;
    if (adapter.config.replaces) {
        var text = [];
        for (var r = 0; r < adapter.config.replaces.length; r++) {
            text.push('"' + adapter.config.replaces + '"');
        }
        adapter.log.debug('Following strings will be replaced in names: ' + text.join(', '));
    }

    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    adapter.getForeignObject('system.config', function (err, obj) {
        if (adapter.config.language) {
            translate = true;
            lang = adapter.config.language;
        } else {
            lang = obj.common.language;
        }
        if (lang !== 'en' && lang !== 'de' && lang !== 'ru') lang = 'en';
        getDevices(function (err, result) {
            smartDevices = result;
        });
    });
    adapter.subscribeForeignObjects('*');
    if (adapter.config.allowAI) {
        createAiConnection();
    }

    adapter.setState('info.connection', false, true);
    adapter.config.cloudUrl  = adapter.config.cloudUrl || 'https://iobroker.net:10555';

    if (!adapter.config.apikey) {
        adapter.log.error('No api-key found. Please get one on https://iobroker.net');
        return;
    }

    if (adapter.config.iftttKey) {
        adapter.subscribeStates('services.ifttt');
        // create ifttt object
        adapter.getObject('services.ifttt', function (err, obj) {
            if (!obj) {
                adapter.setObject('services.ifttt', {
                    _id: adapter.namespace + '.services.ifttt',
                    type: 'state',
                    common: {
                        name: 'IFTTT value',
                        write: true,
                        role: 'state',
                        read: true,
                        type: 'mixed',
                        desc: 'All written data will be sent to IFTTT. If no state specified all requests from IFTTT will be saved here'
                    },
                    native: {}
                });
            }
        });
    }

    adapter.log.info('Connecting with ' + adapter.config.cloudUrl + ' with "' + adapter.config.apikey + '"');

    connect();
}