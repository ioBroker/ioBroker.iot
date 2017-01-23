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
        if (socket) socket.emit('stateChange', id, state);
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

function validateName(name) {
    if (!name) return false;

    for (var n = 0; n < name.length; n++) {
        if (name[n] === ';' || name[n] === '.' || name[n] === '-' || name[n] === ':') return false;
    }

    return true;
}

function processState(states, id, room, func, alexaIds, groups, names, result) {
    var actions;
    var friendlyName = states[id].common.smartName;

    var byON;
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
        states[id].common.smartName = smartName;
        states[id].common.smartName = states[id].common.smartName || {};
    } else if (typeof states[id].common.smartName === 'string') {
        var nnn = states[id].common.smartName;
        states[id].common.smartName = {};
        states[id].common.smartName[lang] = nnn;
    }

    byON = states[id].common.smartName && (typeof states[id].common.smartName === 'object') ? states[id].common.smartName.byON : '';

    if (byON) {
        console.log('a');
    }
    if (typeof friendlyName === 'object') {
        friendlyName = states[id].common.smartName[lang] || states[id].common.smartName.en;
    }

    if (friendlyName === 'ignore' || friendlyName === false) return null;

    if (!friendlyName && !room && !func) return null;

    if (!friendlyName) {
        if (room) {
            // translate room
            if (translate) {
                translateRooms     = translateRooms     || require(__dirname + '/lib/rooms.js');
                translateFunctions = translateFunctions || require(__dirname + '/lib/functions.js');
                room = translateRooms(lang, room);
                func = translateFunctions(lang, func);
            }

            if (lang === 'en') {
                friendlyName = room + ' ' + func;
            } else {
                friendlyName = room + ' ' + func;
            }
        } else {
            friendlyName = states[id].common.name;
        }
    } else if (translate) {
        translateDevices = translateDevices || require(__dirname + '/lib/devices.js');
        friendlyName = translateDevices(lang, friendlyName);
    }  
    if (!friendlyName) {
        adapter.log.warn('State ' + id + ' is invalid.');
        return
    }
    // friendlyName may not be longer than 128
    friendlyName = friendlyName.substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');

    var friendlyDescription = (states[id].common.name || id);

    if (states[id].common.write === false) {
        adapter.log.debug('Name "' + friendlyName + '" cannot be written and will be ignored');
        return;
    }
    var type = states[id].common.type;

    if (type === 'number') {
        if (states[id].common.unit === 'C' || states[id].common.unit === 'C°' || states[id].common.unit === '°C' ||
            states[id].common.unit === 'F' || states[id].common.unit === 'F°' || states[id].common.unit === '°F' ||
            states[id].common.unit === 'K' || states[id].common.unit === 'K°' || states[id].common.unit === '°K') {
            actions = ['setTargetTemperature', 'incrementTargetTemperature', 'decrementTargetTemperature'];
            type = '';
        } else {
            actions = ['setPercentage', 'incrementPercentage', 'decrementPercentage', 'turnOn', 'turnOff'];
        }
    } else {
        actions = ['turnOn', 'turnOff'];
        type = '';
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
    var obj = {
        applianceId:		 applianceId,
        manufacturerName:	 'ioBroker',
        modelName:		     (states[id].common.name || words['No name'][lang]).substring(0, 128),
        version:			 '1',
        friendlyName:		 friendlyName,
        friendlyDescription: friendlyDescription,
        isReachable:         true,
        actions:             actions,
        additionalApplianceDetails: {
            id:   id.substring(0, 1024),
            name: name,
            byON: type
        }
    };

    if (names[friendlyName]) {
        // Ignore it, because yet in the list
        if (names[friendlyName].additionalApplianceDetails.id === id) return;

        // create virtual group
        if (groups[friendlyName]) {
            var ids    = JSON.parse(groups[friendlyName].additionalApplianceDetails.ids);
            var _names = JSON.parse(groups[friendlyName].additionalApplianceDetails.names || '[]');
            var types  = JSON.parse(groups[friendlyName].additionalApplianceDetails.byONs || '[]');
            ids.push(id);
            _names.push(name);
            types.push(type);

            // merge actions
            for (var a = 0; a < actions.length; a++) {
                if (groups[friendlyName].actions.indexOf(actions[a]) === -1) {
                    groups[friendlyName].actions.push(actions[a]);
                }
            }

            groups[friendlyName].additionalApplianceDetails.ids   = JSON.stringify(ids);
            groups[friendlyName].additionalApplianceDetails.names = JSON.stringify(_names);
            groups[friendlyName].additionalApplianceDetails.byONs = JSON.stringify(types);
        } else {
            groups[friendlyName] = {
                applianceId:		 friendlyName.replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_'),
                manufacturerName:	 'ioBroker group',
                modelName:		     (states[id].common.name || words['No name'][lang]).substring(0, 128),
                version:			 '1',
                friendlyName:		 friendlyName,
                friendlyDescription: words['Group'][lang] + ' ' + friendlyName,
                isReachable:         true,
                actions:             actions,
                additionalApplianceDetails: {
                    ids:   JSON.stringify([names[friendlyName].additionalApplianceDetails.id,   id]),
                    names: JSON.stringify([names[friendlyName].additionalApplianceDetails.name, name]),
                    byONs: JSON.stringify([names[friendlyName].additionalApplianceDetails.byON, type])
                }
            };
            result.push(groups[friendlyName]);
            names[friendlyName].disabled = true;
        }
        obj = null;
    } else {
        names[friendlyName] = obj;
    }

    if (obj) result.push(obj);
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
                    if (typeof smartName === 'object') smartName = smartName[lang] || smartName.en;
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
                            smartName = funcs[f].common.smartName;
                            if (typeof smartName === 'object') smartName = smartName[lang] || smartName.en;
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
                                if (typeof smartName === 'object') smartName = smartName[lang] || smartName.en;
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
                                    states[ids[ii]].common.role === 'switch' ||
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

function controlOnOff(id, value, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        if (obj.common.type === 'number') {
            var byON = typeof obj.common.smartName === 'object' ? obj.common.smartName.byON : null;

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
                        valuesON[id] = state.val;

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
        adapter.setForeignState(id, value, function (err) {
            if (err) adapter.log.error('Cannot switch device: ' + err);
            if (callback) callback();
        });
    });
}

function controlPercent(id, value, callback) {
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

        adapter.setForeignState(id, value, function (err) {
            if (err) adapter.log.error('Cannot switch device: ' + err);
            if (callback) callback();
        });
    });
}

function controlDelta(id, delta, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        adapter.getForeignState(id, function (err, state) {
            var value = state.val || 0;
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

            adapter.setForeignState(id, value, function (err) {
                if (err) adapter.log.error('Cannot set device: ' + err);
                if (callback) callback();
            });
        });
    });
}

function controlTemperature(id, value, callback) {
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
                                value: parseFloat(state.val)
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

function controlTemperatureDelta(id, delta, callback) {
    adapter.getForeignObject(id, function (err, obj) {
        if (!obj || obj.type !== 'state') {
            if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
            if (callback) callback();
            return;
        }
        adapter.getForeignState(id, function (err, state) {
            var value = state.val || 0;
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
                                    value: parseFloat(state.val)
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
                    adapter.log.info('Connection changed: DISCONNECTED');
                    adapter.setState('info.connection', false, true);
                    setTimeout(connect, 10000);
                    checkPing();
                }
            }, 5000);
        }
    }
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

function connect() {
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
            adapter.log.info('Connection changed: CONNECTED');
            connected = true;
            adapter.setState('info.connection', true, true);
            checkPing();
        }
    });
    socket.on('reconnect', function () {
        if (!connected) {
            adapter.log.info('Connection changed: CONNECTED');
            connected = true;
            adapter.setState('info.connection', true, true);
            checkPing();
        }
    });
    socket.on('reconnecting', function () {
        if (connected) {
            connected = false;
            adapter.log.info('Connection changed: DISCONNECTED');
            adapter.setState('info.connection', false, true);
            checkPing();
        }
    });
    socket.on('disconnect', function () {
        if (connected) {
            connected = false;
            adapter.log.info('Connection changed: DISCONNECTED');
            adapter.setState('info.connection', false, true);
            checkPing();
        }
    });

    socket.on('error', function (error) {
        adapter.log.error('Connection error: ' + error);
        if (connected) {
            socket.close();
            connected = false;
            adapter.log.info('Connection changed: DISCONNECTED');
            adapter.setState('info.connection', false, true);
            setTimeout(connect, 10000);
            checkPing();
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
        var count;
        var i;
        if (request && request.payload && request.payload.appliance && request.payload.appliance.additionalApplianceDetails) {
            if (request.payload.appliance.additionalApplianceDetails.ids) {
                ids = JSON.parse(request.payload.appliance.additionalApplianceDetails.ids);
            } else {
                ids = [request.payload.appliance.additionalApplianceDetails.id];
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
                    if (smartDevicesCopy[j].additionalApplianceDetails.names !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.names;
                    if (smartDevicesCopy[j].additionalApplianceDetails.name  !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.name;
                    if (smartDevicesCopy[j].additionalApplianceDetails.byON  !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.byON;
                    if (smartDevicesCopy[j].additionalApplianceDetails.byONs !== undefined) delete smartDevicesCopy[j].additionalApplianceDetails.byONs;
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
                    controlOnOff(ids[i], true, function () {
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
                    controlOnOff(ids[i], false, function (err) {
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
                break;

            case 'SetPercentageRequest':
                adapter.log.debug('ALEXA Percent: ' + request.payload.appliance.applianceId + ' ' + request.payload.percentageState.value + '%');
                for (i = 0; i < ids.length; i++) {
                    controlPercent(ids[i], request.payload.percentageState.value, function (err) {
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
                break;

            case 'IncrementPercentageRequest':
                adapter.log.debug('ALEXA Increment: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaPercentage.value + '%');
                for (i = 0; i < ids.length; i++) {
                    controlDelta(ids[i], request.payload.deltaPercentage.value, function (err) {
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
                break;

            case 'DecrementPercentageRequest':
                adapter.log.debug('ALEXA decrement: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaPercentage.value + '%');
                for (i = 0; i < ids.length; i++) {
                    controlDelta(ids[i], request.payload.deltaPercentage.value * (-1), function (err) {
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
                break;

            case 'SetTargetTemperatureRequest':
                adapter.log.debug('ALEXA temperature Percent: ' + request.payload.appliance.applianceId + ' ' + request.payload.targetTemperature.value + ' grad');
                for (i = 0; i < ids.length; i++) {
                    controlTemperature(ids[i], request.payload.targetTemperature.value, function (err, response) {
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
                    controlTemperatureDelta(ids[i], request.payload.deltaTemperature.value, function (err, response) {
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
                    controlTemperatureDelta(ids[i], request.payload.deltaTemperature.value * (-1), function (err, response) {
                        if (!--count) {
                            request.header.name = 'DecrementTargetTemperatureConfirmation';
                            response.header = request.header;
                            callback(response);
                            request = null;
                        }
                    });
                }
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
        ioSocket = new IOSocket(socket, {clientid: adapter.config.apikey.trim()}, adapter);
    }
}

function main() {
    if (adapter.config.deviceOffLevel === undefined) adapter.config.deviceOffLevel = 30;
    adapter.config.deviceOffLevel = parseFloat(adapter.config.deviceOffLevel) || 0;

    //process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    adapter.getForeignObject('system.config', function (err, obj) {
        if (adapter.config.language) {
            translate = true;
            lang = adapter.config.language;
        } else {
            lang = obj.common.language;
        }
        if (lang !== 'en' && lang !== 'de') lang = 'en';
        getDevices(function (err, result) {
            smartDevices = result;
        });
    });
    adapter.subscribeForeignObjects('*');

    adapter.setState('info.connection', false, true);
    adapter.config.cloudUrl  = adapter.config.cloudUrl || 'https://iobroker.net:10555';

    if (!adapter.config.apikey) {
        adapter.log.error('No api-key found. Please get one on https://iobroker.net');
        return;
    }

    adapter.log.info('Connecting with ' + adapter.config.cloudUrl + ' with "' + adapter.config.apikey + '"');

    connect();
}
