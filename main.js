/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var utils    = require(__dirname + '/lib/utils'); // Get common adapter utils
var IOSocket = require(utils.appName + '.socketio/lib/socket.js');
var request  = require('request');

var socket       = null;
var ioSocket     = null;
var alexaDevices = [];
var adapter      = new utils.Adapter({
    name: 'cloud',
    objectChange: function (id, obj) {
        if (socket) socket.emit('objectChange', id, obj);
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
    var _actions = ['turnOn', 'turnOff'];
    var friendlyName = states[id].common.alexaName;

    if (friendlyName === 'ignore') return null;

    if (!friendlyName && !room && !func) return null;

    if (!friendlyName) {
        if (room) {
            friendlyName = func + ' im ' + room;
        } else {
            friendlyName = states[id].common.name;
        }
    }
    if (!validateName(friendlyName)) {
        adapter.log.debug('Name "' + friendlyName + '" has invalid symbols');
        return null;
    }
    var friendlyDescription = (states[id].common.name || id);

    // friendlyName may not be longer than 128
    friendlyDescription = friendlyDescription.substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');
    friendlyName        = friendlyName.substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');
    // any letter or number and _ - = # ; : ? @ &
    var applianceId = id.substring(0, 256).replace(/[^a-zA-Z0-9äÄüÜöÖß_=#;:?@&-]+/g, '_');

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
        actions:            _actions,
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
                applianceId:		friendlyName.replace(/[^a-zA-Z0-9äÄüÜöÖß_=#;:?@&-]+/g, '_'),
                manufacturerName:	'ioBroker group',
                modelName:		    (states[id].common.name || 'Kein Namen').substring(0, 128),
                version:			'1',
                friendlyName:		friendlyName,
                friendlyDescription: 'Gruppe ' + friendlyName,
                isReachable:        true,
                actions:            _actions,
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
                    if (_states.rows[i].value.common && _states.rows[i].value.common.alexaName && _states.rows[i].value.common.alexaName !== 'ignore') {
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
                        if (_id.match(/^enum\.rooms\./)) {
                            rooms.push(doc.rows[i].value);
                        }
                        if (_id.match(/^enum\.functions\./)) {
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
                    var func = funcs[f].common.name;

                    if (!func) {
                        func = funcs[f]._id.substring('enum.functions.'.length);
                        func = func[0].toUpperCase() + func.substring(1);
                    }

                    var room = '';
                    for (var r = 0; r < rooms.length; r++) {
                        if (!rooms[r].common || !rooms[r].common.members || typeof rooms[r].common.members !== 'object' || !rooms[r].common.members.length) continue;

                        if (rooms[r].common.members.indexOf(id) !== -1) {
                            room = rooms[r].common.name;
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

            // process states with defined alexaName
            for (var j = 0; j < alexaIds.length; j++) {
                processState(states, alexaIds[j], null, null, null, groups, names, result);
            }
            for (var k = result.length - 1; k >= 0; k--) {
                if (result[k].disabled) result.splice(k, 1);
            }
            callback(err, result);
        });
    });
}

function main() {
    //process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    getDevices(function (err, result) {
        alexaDevices = result;
    });

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
                if (alexaDevices.length > 7) alexaDevices.splice(7, alexaDevices.length - 7);
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
                console.log(JSON.stringify(response, null, 2));
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
                if (request.payload.appliance.additionalApplianceDetails.ids) {
                    ids = JSON.parse(request.payload.appliance.additionalApplianceDetails.ids);
                } else {
                    ids = [request.payload.appliance.additionalApplianceDetails.id];
                }
                count = ids.length;
                for (i = 0; i < ids.length; i++) {
                    adapter.setForeignState(ids[i], true, function (err) {
                        if (err) adapter.log.error('Cannot tunr on: ' + err);
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
                if (request.payload.appliance.additionalApplianceDetails.ids) {
                    ids = JSON.parse(request.payload.appliance.additionalApplianceDetails.ids);
                } else {
                    ids = [request.payload.appliance.additionalApplianceDetails.id];
                }

                count = ids.length;
                for (i = 0; i < ids.length; i++) {
                    adapter.setForeignState(ids[i], false, function (err) {
                        if (err) adapter.log.error('Cannot tunr on: ' + err);
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
