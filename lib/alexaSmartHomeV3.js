'use strict';

function AlexaSH3(adapter) {

    let smartDevices  = [];
    let lang          = 'de';
    let translate     = false;

    this.setLanguage = function (_lang, _translate) {
        lang = _lang;
        translate = _translate;
    };
    function getSmartName(states, id) {
        if (!id) {
            if (!adapter.config.noCommon) {
                return states.common.smartName;
            } else {
                return (states &&
                    states.common &&
                    states.common.custom &&
                    states.common.custom[adapter.namespace]) ?
                    states.common.custom[adapter.namespace].smartName || null : null;
            }
        } else
        if (!adapter.config.noCommon) {
            return states[id].common.smartName;
        } else {
            return (states[id] &&
                states[id].common &&
                states[id].common.custom &&
                states[id].common.custom[adapter.namespace]) ?
                states[id].common.custom[adapter.namespace].smartName || null : null;
        }
    }

    function writeResponse(channelId, command, value) {
        for (let d = 0; d < smartDevices.length; d++) {
            if (smartDevices[d].cookie.id === channelId) {
                let obj = smartDevices[d];
                let text;
                if (command === 'SetMute') {
                    if (value) {
                        if (lang === 'de') {
                            text = obj.friendlyName + ' ist <emphasis>muted</emphasis>!';
                        } else if (lang === 'ru') {
                            text = obj.friendlyName + ' выключен звук';
                        } else {
                            text = obj.friendlyName + ' muted';
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
                }
                return;
            }
        }

        adapter.log.warn('Unknown applianceId: ' + channelId);
    }

    let capabilities = {
        "Alexa.PlaybackController": {
            "type": "AlexaInterface",
            "interface": "Alexa.PlaybackController",
            "version": "1.0"
        },
        "Alexa.Speaker": {
            "type":"AlexaInterface",
            "interface":"Alexa.Speaker",
            "version":"1.0",
            "properties":{
                "supported":[
                    {
                        "name": "volume"
                    },
                    {
                        "name": "muted"
                    },
                    {
                        "name": "volumeDelta"
                    }
                ]
            }
        }
    };

    let types = {
        'button.play':    {name: 'Play',      namespace: "Alexa.PlaybackController"},
        'button.stop':    {name: 'Stop',      namespace: 'Alexa.PlaybackController'},
        'button.pause':   {name: 'Pause',     namespace: 'Alexa.PlaybackController'},
        'button.prev':    {name: 'Previous',  namespace: 'Alexa.PlaybackController'},
        'button.next':    {name: 'Next',      namespace: 'Alexa.PlaybackController'},
        'button.seek':    {name: 'StartOver', namespace: 'Alexa.PlaybackController'},
        'media.mute':     {name: 'SetMute',   namespace: 'Alexa.Speaker'},
        'media.muted':    {name: 'SetMute',   namespace: 'Alexa.Speaker'},
        'media.volume':   {name: 'SetVolume', namespace: 'Alexa.Speaker'},
        'level.volume':   {name: 'SetVolume', namespace: 'Alexa.Speaker'}
    };

    function finalProcess(channels) {
        let result = [];
        for (let channelId in channels) {
            if (channels.hasOwnProperty(channelId)) {
                for (let f = 0; f < channels[channelId].cookie.friendlyNames.length; f++) {
                    let obj = JSON.parse(JSON.stringify(channels[channelId]));
                    obj.endpointId = obj.cookie.id.substring(0, 256).replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_') + (channels[channelId].cookie.friendlyNames.length > 1 ? '_' + f : '');
                    obj.friendlyName = channels[channelId].cookie.friendlyNames[f];
                    result.push(obj);
                }
            }
        }
        return result;
    }

    function processState(states, id, channels) {
        try {
            if (!id || !states[id] || states[id].type !== 'state') {
                return;
            }

            if (!states[id].native || !states[id].common) {
                adapter.log.debug('Invalid state "' + id + '". Not exist or no native part.');
                return null;
            }
            let type = types[states[id].common.role];

            // Check if it is one of supported types
            if (!type) {
                return;
            }
            // Get channel ID
            let parts        = id.split('.');
            let stateId      = parts.pop();
            let channelId    = parts.join('.');
            if (!states[channelId]) {
                return;
            }
            let friendlyName = getSmartName(states, channelId);

            if (typeof friendlyName === 'object' && friendlyName) {
                friendlyName = friendlyName[lang] || friendlyName.en;
            }

            let friendlyNames;
            if (!friendlyName) {
                friendlyName = states[channelId].common.name;
                if (adapter.config.replaces) {
                    for (let r = 0; r < adapter.config.replaces.length; r++) {
                        friendlyName = friendlyName.replace(adapter.config.replaces[r], '');
                    }
                }
                friendlyNames = [friendlyName];
            } else {
                friendlyNames = friendlyName.split(',');
            }

            for (let i = friendlyNames.length - 1; i >= 0; i--) {
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
                return;
            }

            let friendlyDescription = (states[channelId].common.name || id);

            if (states[id].common.write === false) {
                adapter.log.debug('Name "' + (states[id].common.name || id) + '" cannot be written and will be ignored');
                return;
            }

            friendlyDescription = friendlyDescription.substring(0, 128).replace(/[^a-zA-Z0-9äÄüÜöÖß]+/g, ' ');

            stateId = stateId.substring(0, 256).replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_');

            for (let n = 0; n < friendlyNames.length; n++) {
                if (!channels[channelId]) {
                    let smartName = getSmartName(states, channelId);
                    channels[channelId] = {
                        enabled:             smartName !== false,
                        endpointId:		     '',
                        friendlyName:        friendlyNames[n],
                        description:         friendlyDescription,
                        manufacturerName:	 'ioBroker',
                        displayCategories:   [],
                        cookie: {
                            id:              channelId,
                            name:            states[channelId].common.name,
                            friendlyNames:   [friendlyNames[n]]
                        },
                        capabilities: [

                        ]
                    };
                }

                if (channels[channelId].cookie.friendlyNames.indexOf(friendlyNames[n]) === -1) {
                    channels[channelId].cookie.friendlyNames.push(friendlyNames[n]);
                }

                let found = false;
                for (let c = 0; c < channels[channelId].capabilities.length; c++) {
                    if (channels[channelId].capabilities[c].interface === type.namespace) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    channels[channelId].capabilities.push(capabilities[type.namespace]);
                }
                if (!channels[channelId].cookie[type.name]) {
                    channels[channelId].cookie[type.name] = stateId;
                }
            }
        } catch (e) {
            adapter.log.error('Cannot process "' + id + '": ' + e);
        }
    }

    function controlPlay(id, state, callback) {
        adapter.getForeignObject(id + '.' + state, function (err, obj) {
            if (!obj || obj.type !== 'state') {
                if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
                if (callback) callback();
                return;
            }


            adapter.log.debug('Set "' + id + '.' + state + '" to true');

            adapter.setState('smart.lastObjectID', id + '.' + state, true);

            adapter.setForeignState(id + '.' + state, true, function (err) {
                if (err) adapter.log.error('Cannot control device: ' + err);
                if (callback) callback();
            });
        });
    }

    function controlValue(channelId, stateId, value, delta, callback) {
        adapter.getForeignObject(channelId + '.' + stateId, function (err, obj) {
            if (!obj || obj.type !== 'state') {
                if (err) adapter.log.error('Cannot control non state: ' + channelId + ' ' + (obj ? obj.type : 'no object'));
                if (callback) callback();
                return;
            }

            if (obj.common.type === 'number') {
                if (obj.common.min !== undefined && obj.common.max !== undefined) {
                    if (value === true) {
                        value = obj.common.max;
                    } else if (value === false) {
                        value = obj.common.min;
                    } else {
                        if (delta) {
                            value = (value / 100) * (obj.common.max - obj.common.min);
                        } else {
                            value = (value / 100) * (obj.common.max - obj.common.min) + obj.common.min;
                        }
                    }
                }
            }

            if (delta) {
                adapter.getForeignState(channelId + '.' + stateId, value, function (err, state) {
                    state.val = state.val || 0;
                    state.val += value;
                    if (obj.common.min !== undefined) {
                        if (state.val < obj.common.min) {
                            state.val = obj.common.min;
                        }
                    } else if (state.val < 0) {
                        state.val = 0;
                    }
                    if (obj.common.max !== undefined) {
                        if (state.val > obj.common.max) {
                            state.val = obj.common.max;
                        }
                    } else if (state.val > 100) {
                        state.val = 100;
                    }
                    adapter.log.debug('Set "' + channelId + '.' + stateId + '" to ' + state.val);

                    adapter.setState('smart.lastObjectID', channelId + '.' + stateId, true);

                    adapter.setForeignState(channelId + '.' + stateId, state.val, function (err) {
                        if (err) adapter.log.error('Cannot control device: ' + err);
                        if (callback) callback();
                    });

                });
            } else {
                adapter.log.debug('Set "' + channelId + '.' + stateId + '" to ' + value);

                adapter.setState('smart.lastObjectID', channelId + '.' + stateId, true);

                adapter.setForeignState(channelId + '.' + stateId, value, function (err) {
                    if (err) adapter.log.error('Cannot control device: ' + err);
                    if (callback) callback();
                });
            }
        });
    }

    function getResponse(messageId) {
        return {
            context: {
                properties: []
            },
            event: {
                header: {
                    messageId: messageId,
                    namespace: 'Alexa',
                    name: 'Response',
                    payloadVersion: '3'
                },
                payload: {
                }
            }
        };
    }

    this.process = function (request, isEnabled, callback) {
        if (!request || !request.directive || !request.directive.header) {
            adapter.log.error('Invalid request: no header!');
            return;
        }

        if (!isEnabled) {
            callback({
                "event": {
                    "header": {
                        "namespace": "Alexa",
                        "name": "ErrorResponse",
                        "messageId": request.directive.header.messageId,
                        "payloadVersion": "3"
                    },
                    "payload": {
                        "type": "ENDPOINT_UNREACHABLE",
                        "message": "Unable to reach endpoint because it is disabled"
                    }
                }
            });
            return;
        }

        if (!request.directive.endpoint.cookie.id) {
            callback({
                "event": {
                    "header": {
                        "namespace": "Alexa",
                        "name": "ErrorResponse",
                        "messageId": request.directive.header.messageId,
                        "payloadVersion": "3"
                    },
                    "payload": {
                        "type": "ENDPOINT_UNREACHABLE",
                        "message": "Unable to reach endpoint because it does not configured"
                    }
                }
            });
            return;
        }
        if (!request.directive.endpoint.cookie[request.directive.header.name]) {
            callback({
                "event": {
                    "header": {
                        "namespace": "Alexa",
                        "name": "ErrorResponse",
                        "messageId": request.directive.header.messageId,
                        "payloadVersion": "3"
                    },
                    "payload": {
                        "type": "NO_SUCH_ENDPOINT",
                        "message": "Unsupported feature"
                    }
                }
            });
            return;
        }

        switch (request.directive.header.name) {
            case 'Discover':
                //{
                // "directive": {
                //      "header": {
                //          "messageId": "6d6d6e14-8aee-473e-8c24-0d31ff9c17a2",
                //          "name": "Discover",
                //          "namespace": "Alexa.Discovery",
                //          "payloadVersion": "3"
                //      },
                //      "payload": {
                //         "scope": {
                //             "type": "BearerToken",
                //             "token": "some-access-token"
                //         }
                //       }
                //  }
                //}
                request.directive.header.name = 'Discover.Response';
                let smartDevicesCopy = JSON.parse(JSON.stringify(smartDevices));
                for (let j = smartDevicesCopy.length - 1; j >= 0; j--) {
                    if (!smartDevicesCopy[j].enabled) {
                        smartDevicesCopy.splice(j, 1);
                    }
                    if (!smartDevicesCopy[j].cookie) continue;

                    delete smartDevicesCopy[j].enabled;
                    if (smartDevicesCopy[j].cookie.name          !== undefined) delete smartDevicesCopy[j].cookie.name;
                    if (smartDevicesCopy[j].cookie.friendlyNames !== undefined) delete smartDevicesCopy[j].cookie.friendlyNames;
                }

                let response = {
                    directive: {
                        header: request.directive.header,
                        payload: {
                            endpoints: smartDevicesCopy/*[
                             {
                             "endpointId":"appliance-001",
                             "friendlyName":"Living Room Sound System",
                             "description":"Smart Light by Sample Manufacturer",
                             "manufacturerName":"Sample Manufacturer",
                             "displayCategories": [ ],
                             "cookie":{
                                 "extraDetail1":"optionalDetailForSkillAdapterToReferenceThisDevice",
                                 "extraDetail2":"There can be multiple entries",
                                 "extraDetail3":"but they should only be used for reference purposes",
                                 "extraDetail4":"This is not a suitable place to maintain current device state"
                             },
                             "capabilities":[
                                 {
                                     "type":"AlexaInterface",
                                     "interface":"Alexa.Speaker",
                                     "version":"1.0",
                                     "properties":{
                                         "supported":[
                                             {
                                             "name":"volume"
                                             },
                                             {
                                             "name":"muted"
                                             }
                                         ]
                                    }
                                 },
                                 {
                                     "type":"AlexaInterface",
                                     "interface":"Alexa.StepSpeaker",
                                     "version":"1.0",
                                     "properties":{

                                     }
                                 }
                             ]
                             }
                             ]*/
                        }
                    }
                };
                callback(response);
                request = null;
                break;

            case 'SetMute':
                //  {
                //   "directive": {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "SetMute",
                //          "namespace": "Alexa.PlaybackController",
                //          "payloadVersion": "3"
                //      },
                //      "endpoint": {
                //          "scope": {
                //              "type": "BearerToken",
                //              "token": "some-access-token"
                //          },
                //          "endpointId": "device-001",
                //          "cookie": {}
                //      },
                //      "payload": {
                //          "mute": true
                //      }
                //   }
                // }
                adapter.log.debug('ALEXA SetMute: ' + request.directive.endpoint.cookie.id);
                controlValue(request.directive.endpoint.cookie.id, request.directive.endpoint.cookie.SetMute, request.directive.payload.mute, false, function () {
                    request.directive.header.name = 'Response';
                    request.directive.header.namespace = 'Alexa';

                    callback(getResponse(request.directive.header.messageId));
                    request = null;
                });

                writeResponse(request.directive.endpoint.endpointId, request.directive.header.name, request.directive.payload.mute);
                break;

            case 'SetVolume':
                //  {
                //   "directive": {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "SetVolume",
                //          "namespace": "Alexa.PlaybackController",
                //          "payloadVersion": "3"
                //      },
                //      "endpoint": {
                //          "scope": {
                //              "type": "BearerToken",
                //              "token": "some-access-token"
                //          },
                //          "endpointId": "device-001",
                //          "cookie": {}
                //      },
                //      "payload": {
                //          "volume": 50
                //      }
                //   }
                // }
                adapter.log.debug('ALEXA SetVolume: ' + request.directive.endpoint.cookie.id);
                controlValue(request.directive.endpoint.cookie.id, request.directive.endpoint.cookie.SetVolume, request.directive.payload.volume, false, function () {
                    request.directive.header.name = 'Response';
                    request.directive.header.namespace = 'Alexa';

                    callback(getResponse(request.directive.header.messageId));
                    request = null;
                });

                writeResponse(request.directive.endpoint.endpointId, request.directive.header.name, request.directive.payload.volume);
                break;

            case 'AdjustVolume':
                //  {
                //   "directive": {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "AdjustVolume",
                //          "namespace": "Alexa.PlaybackController",
                //          "payloadVersion": "3"
                //      },
                //      "endpoint": {
                //          "scope": {
                //              "type": "BearerToken",
                //              "token": "some-access-token"
                //          },
                //          "endpointId": "device-001",
                //          "cookie": {}
                //      },
                //      "payload": {
                //          "volumeDelta": 50
                //      }
                //   }
                // }
                adapter.log.debug('ALEXA AdjustVolume: ' + request.directive.endpoint.cookie.id);
                controlValue(request.directive.endpoint.cookie.id, request.directive.endpoint.cookie.SetVolume, request.directive.payload.volumeDelta, true, function () {
                    request.directive.header.name = 'Response';
                    request.directive.header.namespace = 'Alexa';

                    callback(getResponse(request.directive.header.messageId));
                    request = null;
                });

                writeResponse(request.directive.endpoint.endpointId, 'AdjustVolume', request.directive.payload.volumeDelta);
                break;

            case 'Play':
            case 'Stop':
            case 'Pause':
            case 'Previous':
            case 'Next':
                //  {
                //   "directive": {
                //      "header": {
                //          "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
                //          "name": "Next",
                //          "namespace": "Alexa.PlaybackController",
                //          "payloadVersion": "3"
                //      },
                //      "endpoint": {
                //          "scope": {
                //              "type": "BearerToken",
                //              "token": "some-access-token"
                //          },
                //          "endpointId": "device-001",
                //          "cookie": {}
                //      },
                //      "payload": {
                //      }
                //   }
                // }
                adapter.log.debug('ALEXA ' + request.directive.header.name + ': ' + request.directive.endpoint.cookie.id);
                controlPlay(request.directive.endpoint.cookie.id, request.directive.endpoint.cookie[request.directive.header.name], function () {
                    request.directive.header.name = 'Response';
                    request.directive.header.namespace = 'Alexa';

                    callback(getResponse(request.directive.header.messageId));
                    request = null;
                });

                writeResponse(request.directive.endpoint.endpointId, request.directive.header.name, true);
                break;

            default:
                adapter.log.warn('got unknown command from alexa: ' + request.directive.header.name);
                break;
        }
    };

    this.updateDevices = function (callback) {
        this.getDevices(function (err, result) {
            smartDevices = result;
            callback && callback();
        });
    };

    this.getDevices = function (callback) {
        if (!callback) return smartDevices;
        adapter.objects.getObjectView('system', 'state', {}, function (err, _states) {
            adapter.objects.getObjectView('system', 'channel', {}, function (err, _channels) {
                adapter.objects.getObjectView('system', 'device', {}, function (err, _devices) {
                    let states = {};

                    if (_states && _states.rows) {
                        for (let i = 0; i < _states.rows.length; i++) {
                            if (_states.rows[i].value) {
                                states[_states.rows[i].id] = _states.rows[i].value;
                            }
                        }
                    }
                    if (_channels && _channels.rows) {
                        for (let c = 0; c < _channels.rows.length; c++) {
                            if (_channels.rows[c].value) {
                                states[_channels.rows[c].id] = _channels.rows[c].value;
                            }
                        }
                    }
                    if (_devices && _devices.rows) {
                        for (let d = 0; d < _devices.rows.length; d++) {
                            if (_devices.rows[d].value) {
                                states[_devices.rows[d].id] = _devices.rows[d].value;
                            }
                        }
                    }
                    let channels = {};

                    // process states with defined smartName
                    for (let id in states) {
                        processState(states, id, channels);
                    }
                    let result = finalProcess(channels);

                    result.sort(function (a, b) {
                        if (a.friendlyName > b.friendlyName) return 1;
                        if (a.friendlyName < b.friendlyName) return -1;
                        return 0;
                    });

                    for (let k = result.length - 1; k >= 0; k--) {
                        if (result[k].disabled) {
                            result.splice(k, 1);
                        } else {
                            adapter.log.debug('Created entertainment ALEXA device: ' + result[k].friendlyName);
                        }
                    }
                    states = null;
                    channels = null;
                    callback(err, result);
                });
            });
        });
    }
}

module.exports = AlexaSH3;