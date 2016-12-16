/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var utils         = require(__dirname + '/lib/utils'); // Get common adapter utils
var IOSocket      = require(utils.appName + '.socketio/lib/socket.js');
var request       = require('request');

var socket        = null;
var ioSocket      = null;
var alexaDevices  = [];
var recalcTimeout = null;
var lang          = 'de';

var adapter       = new utils.Adapter({
    name: 'cloud',
    objectChange: function (id, obj) {
        if (socket) socket.emit('objectChange', id, obj);
        if (!obj || (obj.type === 'state' || obj.type === 'enum')) {
            if (recalcTimeout) clearTimeout(recalcTimeout);
            recalcTimeout = setTimeout(function () {
                recalcTimeout = null;
                getDevices(function (err, result) {
                    alexaDevices = result;
                });
            }, 2000);
        } else if (id === 'system.config' && obj) {
            lang = obj.common.language;
            if (lang !== 'en' && lang !== 'de') lang = 'en';
        }
    },
    stateChange: function (id, state) {
        if (socket) socket.emit('stateChange', id, state);
    },
    unload: function (callback) {
        try {
            if (socket) socket.close();
            ioSocket = null;
            callback();
        } catch (e) {
            callback();
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

    if (friendlyName === 'ignore' || friendlyName === false) return null;

    if (!friendlyName && !room && !func) return null;

    if (!friendlyName) {
        if (room) {
            if (lang === 'en') {
                friendlyName = room + ' ' + func;
            } else {
                friendlyName = room + ' ' + func;
            }
        } else {
            friendlyName = states[id].common.name;
        }
    }
    if (!validateName(friendlyName)) {
        adapter.log.debug('Name "' + friendlyName + '" has invalid symbols');
        return null;
    }
    var friendlyDescription = (states[id].common.name || id);

    if (states[id].common.write === false) {
        adapter.log.debug('Name "' + friendlyName + '" cannot be written and will be ignored');
        return null;
    }

    if (states[id].common.type === 'number') {
        if (states[id].common.unit === 'C' || states[id].common.unit === 'C°' || states[id].common.unit === '°C' ||
            states[id].common.unit === 'F' || states[id].common.unit === 'F°' || states[id].common.unit === '°F' ||
            states[id].common.unit === 'K' || states[id].common.unit === 'K°' || states[id].common.unit === '°K') {
            actions = ['setTargetTemperature', 'incrementTargetTemperature', 'decrementTargetTemperature'];
        } else {
            actions = ['setPercentage', 'incrementPercentage', 'decrementPercentage', 'turnOn', 'turnOff'];
        }
    } else {
        actions = ['turnOn', 'turnOff'];
    }

    // friendlyName may not be longer than 128
    friendlyDescription = friendlyDescription.substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');
    friendlyName        = friendlyName.substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');
    // any letter or number and _ - = # ; : ? @ &
    var applianceId = id.substring(0, 256).replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_');

    var pos;
    if (alexaIds && (pos = alexaIds.indexOf(id)) !== -1) alexaIds.splice(pos, 1);

    var obj = {
        applianceId:		applianceId,
        manufacturerName:	'ioBroker',
        modelName:		    (states[id].common.name || 'Kein Namen').substring(0, 128),
        version:			'1',
        friendlyName:		friendlyName,
        friendlyDescription: friendlyDescription,
        isReachable:        true,
        actions:            actions,
        additionalApplianceDetails: {
            id: id.substring(0, 1024)
        }
    };
    if (names[friendlyName]) {
        // create virtual group
        if (groups[friendlyName]) {
            var ids = JSON.parse(groups[friendlyName].additionalApplianceDetails.ids);
            ids.push(id);
            groups[friendlyName].additionalApplianceDetails.ids = JSON.stringify(ids);
        } else {
            groups[friendlyName] = {
                applianceId:		friendlyName.replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_'),
                manufacturerName:	'ioBroker group',
                modelName:		    (states[id].common.name || 'Kein Namen').substring(0, 128),
                version:			'1',
                friendlyName:		friendlyName,
                friendlyDescription: 'Gruppe ' + friendlyName,
                isReachable:        true,
                actions:            actions,
                additionalApplianceDetails: {
                    ids: JSON.stringify([names[friendlyName].additionalApplianceDetails.id, id])
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
                        if (_id.match(/^enum\.rooms\./) && doc.rows[i].value.common.smartName !== 'ignore' && doc.rows[i].value.common.smartName !== false) {
                            rooms.push(doc.rows[i].value);
                        }
                        if (_id.match(/^enum\.functions\./) && doc.rows[i].value.common.smartName !== 'ignore' && doc.rows[i].value.common.smartName !== false) {
                            funcs.push(doc.rows[i].value);
                        }
                    }
                }
            }
            var result = [];
            for (var f = 0; f < funcs.length; f++) {
                if (!funcs[f].common || !funcs[f].common.members || typeof funcs[f].common.members !== 'object' || !funcs[f].common.members.length) continue;

                for (var s = 0; s < funcs[f].common.members.length; s++) {
                    var id = funcs[f].common.members[s];
                    var func = funcs[f].common.smartName || funcs[f].common.name;

                    if (!func) {
                        func = funcs[f]._id.substring('enum.functions.'.length);
                        func = func[0].toUpperCase() + func.substring(1);
                    }

                    var room = '';
                    for (var r = 0; r < rooms.length; r++) {
                        if (!rooms[r].common || !rooms[r].common.members || typeof rooms[r].common.members !== 'object' || !rooms[r].common.members.length) continue;

                        if (rooms[r].common.members.indexOf(id) !== -1) {
                            room =  rooms[r].common.smartName || rooms[r].common.name;
                            if (!room) {
                                room = rooms[r]._id.substring('enum.rooms.'.length);
                                room = room[0].toUpperCase() + room.substring(1);
                            }
                        }
                    }

                    if (!states[id]) {
                        var m = new RegExp('^' + id.replace(/\./g, '\\.'));
                        for (var ii = 0; ii < ids.length; ii++) {
                            if (ids[ii] < id) continue;
                            if (m.exec(ids[ii])) {
                                if (states[ids[ii]].common.role && (
                                    states[ids[ii]].common.role === 'state' ||
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
            if (value) {
                if (typeof obj.common.max !== 'undefined') {
                    value = obj.common.max;
                } else {
                    obj.common.max = 100;
                }
            } else {
                if (typeof obj.common.min !== 'undefined') {
                    value = obj.common.min;
                } else {
                    obj.common.max = 0;
                }
            }
        }

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

        if (obj.common.type === 'boolean') value = !!value;

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

            if (obj.common.type === 'boolean') value = !!value;

            adapter.setForeignState(id, value, function (err) {
                if (err) adapter.log.error('Cannot set device: ' + err);
                if (callback) callback();
            });
        });
    });
}

function controlAnalog(id, value, callback) {
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

        adapter.setForeignState(id, value, function (err) {
            if (err) adapter.log.error('Cannot switch device: ' + err);
            if (callback) callback();
        });
    });
}

function controlAnalogDelta(id, delta, callback) {
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

            adapter.setForeignState(id, value, function (err) {
                if (err) adapter.log.error('Cannot set device: ' + err);
                if (callback) callback();
            });
        });
    });
}

function main() {
    //process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    adapter.getForeignObject('system.config', function (err, obj) {
        lang = obj.common.language;
        if (lang !== 'en' && lang !== 'de') lang = 'en';
        getDevices(function (err, result) {
            alexaDevices = result;
        });
    });
    adapter.subscribeForeignObjects('*');

    if (!adapter.config.apikey) {
        adapter.log.error('No api-key found. Please get one on https://iobroker.net');
        process.exit();
        return;
    }

    adapter.setState('info.connection', false, true);
    adapter.config.cloudUrl  = adapter.config.cloudUrl || 'https://iobroker.net:10555';

    adapter.log.info('Connecting with ' + adapter.config.cloudUrl + ' with "' + adapter.config.apikey + '"');
    socket = require('socket.io-client')(adapter.config.cloudUrl || 'https://iobroker.net:10555', {
        rejectUnauthorized: !adapter.config.allowSelfSignedCertificate,
        reconnectionDelay:    5000,
        reconnectionDelayMax: 10000
    });

    socket.on('connect', function () {
        adapter.log.info('Connection changed: CONNECTED');
        adapter.setState('info.connection', true, true);
    });

    socket.on('disconnect', function () {
        adapter.log.info('Connection changed: DISCONNECTED');
        adapter.setState('info.connection', false, true);
    });

    socket.on('error', function (error){
        adapter.log.error('Connection error: ' + error);
        console.log('error: ' + error);
    });

    var server = 'http://localhost:8082';
    socket.on('html', function (url, cb) {
        request({url: server + url, encoding: null}, function (error, response, body) {
            cb(error, response.statusCode, response.headers, body);
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
                //if (alexaDevices.length > 100) alexaDevices.splice(50, alexaDevices.length - 50);
                //console.log(JSON.stringify(alexaDevices));
                var response = {
                    header: request.header,
                    payload: {
                        discoveredAppliances: alexaDevices/*[
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
                    controlAnalog(ids[i], request.payload.targetTemperature.value, function (err) {
                        if (!--count) {
                            request.header.name = 'SetTargetTemperatureConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
                            request = null;
                        }
                    });
                }
                break;

            case 'IncrementTargetTemperatureRequest':
                request.payload.deltaTemperature.value = request.payload.deltaTemperature.value || 1;
                adapter.log.debug('ALEXA temperature Increment: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaTemperature.value + ' grad');
                for (i = 0; i < ids.length; i++) {
                    controlAnalogDelta(ids[i], request.payload.deltaTemperature.value, function (err) {
                        if (!--count) {
                            request.header.name = 'IncrementTargetTemperatureConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
                            request = null;
                        }
                    });
                }
                break;

            case 'DecrementTargetTemperatureRequest':
                request.payload.deltaTemperature.value = request.payload.deltaTemperature.value || 1;
                adapter.log.debug('ALEXA temperature decrement: ' + request.payload.appliance.applianceId + ' ' + request.payload.deltaTemperature.value + ' grad');
                for (i = 0; i < ids.length; i++) {
                    controlAnalogDelta(ids[i], request.payload.deltaTemperature.value * (-1), function (err) {
                        if (!--count) {
                            request.header.name = 'DecrementTargetTemperatureConfirmation';

                            callback({
                                header: request.header,
                                payload: {}
                            });
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
