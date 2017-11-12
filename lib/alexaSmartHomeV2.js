function AlexaSH2(adapter) {

    var smartDevices  = [];
    var enums         = [];
    var valuesON      = {};
    var lang          = 'de';
    var translate     = false;

    var translateRooms;
    var translateFunctions;
    var translateDevices;
    var words         = {
        'No name':  {'en': 'No name', 'de': 'Kein Name', 'ru': 'Нет имени'},
        'Group':    {'en': 'Group',   'de': 'Gruppe',    'ru': 'Группа'}
    };

    this.setLanguage = function (_lang, _translate) {
        lang = _lang;
        translate = _translate;
    };
    /* function validateName(name) {
        if (!name) return false;

        for (var n = 0; n < name.length; n++) {
            if (name[n] === ';' || name[n] === '.' || name[n] === '-' || name[n] === ':') return false;
        }

        return true;
    } */

    function getSmartName(states, id) {
        if (!id) {
            if (!adapter.config.noCommon) {
                return states.common.smartName;
            } else {
                return (states &&
                    states.common &&
                    states.common.custom &&
                    states.common.custom[adapter.namespace]) ?
                    states.common.custom[adapter.namespace].smartName : undefined;
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

    function padding(num) {
        num = num.toString(16);
        if (num.length < 2) num = '0' + num;
        return num;
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

    function processState(states, id, room, func, alexaIds, groups, names, result) {
        try {
            var actions;
            var friendlyName = getSmartName(states, id);
            var nameModified = false;
            var byON;
            if (!id) {
                return;
            }

            if (states[id] && states[id].native) {
                // try to convert old notation to new one
                if (!adapter.config.noCommon) {
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
                }
            } else {
                adapter.log.debug('Invalid state "' + id + '". Not exist or no native part.');
                return null;
            }

            byON = (friendlyName && typeof friendlyName === 'object') ? friendlyName.byON : '';

            if (typeof friendlyName === 'object' && friendlyName) {
                friendlyName = friendlyName[lang] || friendlyName.en;
            }

            if (friendlyName === 'ignore' || friendlyName === false) {
                return null;
            }

            if (!friendlyName && !room && !func) {
                return null;
            }

            var friendlyNames = [];
            if (!friendlyName) {
                if (room) {
                    // translate room
                    if (translate) {
                        translateRooms     = translateRooms     || require(__dirname + '/rooms.js');
                        translateFunctions = translateFunctions || require(__dirname + '/functions.js');
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
                translateDevices = translateDevices || require(__dirname + '/devices.js');
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
                    friendlyNames[i] = friendlyNames[i].substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖß]+/g, ' ');
                }
            }

            if (!friendlyNames[0]) {
                adapter.log.warn('State ' + id + ' is invalid.');
                return;
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
                    } else if (states[id].common.role === 'level.color.hue' || states[id].common.role === 'level.color.rgb') {
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

                        if (groups[friendlyNames[n]].additionalApplianceDetails.idss && states[id].common.role === 'level.color.hue') {
                            var idss = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.idss);
                            idss.push(findRole(states, id, 'level.color.saturation'));
                            groups[friendlyNames[n]].additionalApplianceDetails.idss   = JSON.stringify(idss);

                            var idbs = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.idbs);
                            idbs.push(findRole(states, id, 'level.dimmer'));
                            groups[friendlyNames[n]].additionalApplianceDetails.idbs   = JSON.stringify(idbs);

                            var idos = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.idos);
                            idos.push(findRole(states, id, 'switch'));
                            groups[friendlyNames[n]].additionalApplianceDetails.idos   = JSON.stringify(idos);
                        } else // find switch state
                        if (groups[friendlyNames[n]].additionalApplianceDetails.idos && states[id].common.role === 'level.color.rgb') {
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

                        if (states[id].common.role === 'level.color.hue') {
                            groups[friendlyNames[n]].additionalApplianceDetails.idss = JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.ids,   findRole(states, id, 'level.color.saturation')]);
                            groups[friendlyNames[n]].additionalApplianceDetails.idbs = JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.idb,   findRole(states, id, 'level.dimmer')]);
                            groups[friendlyNames[n]].additionalApplianceDetails.idos = JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.ido,   findRole(states, id, 'switch')]);
                        } else if (states[id].common.role === 'level.color.rgb') {
                            groups[friendlyNames[n]].additionalApplianceDetails.idos = JSON.stringify([names[friendlyNames[n]].additionalApplianceDetails.ido,   findRole(states, id, 'switch')]);
                        }

                        result.push(groups[friendlyNames[n]]);
                        names[friendlyNames[n]].disabled = true;
                    }
                    obj = null;
                } else {
                    names[friendlyNames[n]] = obj;
                    if (states[id].common.role === 'level.color.hue') {
                        obj.additionalApplianceDetails.ids = findRole(states, id, 'level.color.saturation');
                        obj.additionalApplianceDetails.idb = findRole(states, id, 'level.dimmer');
                        obj.additionalApplianceDetails.ido = findRole(states, id, 'switch');
                    } else if (states[id].common.role === 'level.color.rgb') {
                        obj.additionalApplianceDetails.ido = findRole(states, id, 'switch');
                    }
                }

                if (obj) result.push(obj);
            }
        } catch (e) {
            adapter.log.error('Cannot process "' + id + '": ' + e);
        }
    }

    function controlOnOff(id, value, writeStates, callback) {
        adapter.getForeignObject(id, function (err, obj) {
            if (!obj || obj.type !== 'state') {
                if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
                if (callback) callback();
                return;
            }
            if (obj.common.type === 'number') {
                var smartName = getSmartName(obj);
                var byON = (smartName && typeof smartName === 'object') ? smartName.byON : null;

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
            } else if (obj.common.role === 'level.color.rgb') {
                if (value) {
                    value = '#FFFFFF';
                } else {
                    value = '#000000';
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

    // expected hue range: [0, 360)
    // expected saturation range: [0, 1]
    // expected lightness range: [0, 1]
    function hslToRgb(hue, saturation, brightness) {
        // based on algorithm from http://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB
        if (hue === undefined){
            return [0, 0, 0];
        }

        var chroma = (1 - Math.abs((2 * brightness) - 1)) * saturation;
        var huePrime = parseFloat(hue) / 60;
        var secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

        huePrime = Math.floor(huePrime);
        var red;
        var green;
        var blue;

        if (huePrime === 0){
            red = chroma;
            green = secondComponent;
            blue = 0;
        } else if (huePrime === 1) {
            red = secondComponent;
            green = chroma;
            blue = 0;
        } else if (huePrime === 2) {
            red = 0;
            green = chroma;
            blue = secondComponent;
        } else if (huePrime === 3) {
            red = 0;
            green = secondComponent;
            blue = chroma;
        } else if (huePrime === 4) {
            red = secondComponent;
            green = 0;
            blue = chroma;
        } else if (huePrime === 5) {
            red = chroma;
            green = 0;
            blue = secondComponent;
        }

        var lightnessAdjustment = brightness - (chroma / 2);
        red   += lightnessAdjustment;
        green += lightnessAdjustment;
        blue  += lightnessAdjustment;

        return '#' + padding(Math.round(red * 255)) + padding(Math.round(green * 255)) + padding(Math.round(blue * 255));
    }

    function controlColorRgb(id, color, writeStates, callback) {
        // "color": {
        //     "hue": 0.0,
        //     "saturation": 1.0000,
        //     "brightness": 1.0000
        // }
        adapter.getForeignObject(id, function (err, obj) {
            if (!obj || obj.type !== 'state') {
                if (err) adapter.log.error('Cannot control non state: ' + id + ' ' + (obj ? obj.type : 'no object'));
                if (callback) callback();
                return;
            }
            var rgb = hslToRgb(color.hue, color.saturation, color.brightness);

            adapter.setForeignState(id, rgb, function (err) {
                if (err) adapter.log.error('Cannot read device: ' + err);

                if (writeStates) {
                    adapter.setState('smart.lastObjectID', id, true);
                }
                if (callback) callback(err);
            });
        });
    }

    function controlColorHue(ids, idh, idb, color, writeStates, callback) {
        // "color": {
        //     "hue": 0.0,
        //     "saturation": 1.0000,
        //     "brightness": 1.0000
        // }
        adapter.getForeignObject(idh, function (err, obj) {
            if (!obj || obj.type !== 'state') {
                if (err) adapter.log.error('Cannot control non state: ' + idh + ' ' + (obj ? obj.type : 'no object'));
                if (callback) callback();
                return;
            }

            if (obj.common && obj.common.min !== undefined && obj.common.max !== undefined) {
                color.hue = Math.round((obj.common.max - obj.common.min) * (color.hue / 360) + obj.common.min);
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

    this.process = function (request, callback) {
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
                    controlOnOff((idos && idos[i] !== undefined) ? idos[i] : ids[i], false, ids.length === 1, function (err) {
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

                var idss;
                var idbs;
                if (request && request.payload && request.payload.appliance && request.payload.appliance.additionalApplianceDetails) {
                    if (request.payload.appliance.additionalApplianceDetails.idss) {
                        idss = JSON.parse(request.payload.appliance.additionalApplianceDetails.idss);
                    } else if (request.payload.appliance.additionalApplianceDetails.ids) {
                        idss = [request.payload.appliance.additionalApplianceDetails.ids];
                    }
                    count = idss.length;
                    if (request.payload.appliance.additionalApplianceDetails.idbs) {
                        idbs = JSON.parse(request.payload.appliance.additionalApplianceDetails.idbs);
                    } else if (request.payload.appliance.additionalApplianceDetails.idb) {
                        idbs = [request.payload.appliance.additionalApplianceDetails.idb];
                    }
                }

                var color = request.payload.color;

                for (i = 0; i < ids.length; i++) {
                    if (!idss) {
                        controlColorRgb(ids[i], color, ids.length === 1, function (err) {
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
                    } else {
                        controlColorHue(idss[i], ids[i], idbs[i], color, ids.length === 1, function (err) {
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
};

    this.updateDevices = function () {
        this.getDevices(function (err, result) {
            smartDevices = result;
        });
    };

    this.getEnums = function () {
        return enums;
    };

    this.getDevices = function (callback) {
        if (!callback) return smartDevices;
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

                        if (adapter.config.noCommon) {
                            if (_states.rows[i].value.common &&
                                _states.rows[i].value.common.custom &&
                                _states.rows[i].value.common.custom[adapter.namespace] &&
                                _states.rows[i].value.common.custom[adapter.namespace].smartName &&
                                _states.rows[i].value.common.custom[adapter.namespace].smartName !== 'ignore') {
                                alexaIds.push(_states.rows[i].id);
                            }
                        } else {
                            if (_states.rows[i].value.common &&
                                _states.rows[i].value.common.smartName &&
                                _states.rows[i].value.common.smartName !== 'ignore') {
                                alexaIds.push(_states.rows[i].id);
                            }
                        }
                    }
                }
            }
            ids.sort();
            adapter.objects.getObjectView('system', 'enum', {}, function (err, doc) {
                // Build overlap from rooms and functions
                var rooms = [];
                var funcs = [];
                var smartName;
                if (doc && doc.rows) {
                    for (var i = 0, l = doc.rows.length; i < l; i++) {
                        if (doc.rows[i].value) {
                            var _id = doc.rows[i].id;
                            smartName = getSmartName(doc.rows[i].value);
                            if (_id.match(/^enum\.rooms\./)     && smartName !== 'ignore' && smartName !== false) {
                                rooms.push(doc.rows[i].value);
                            }
                            if (_id.match(/^enum\.functions\./) && smartName !== 'ignore' && smartName !== false) {
                                funcs.push(doc.rows[i].value);
                            }
                            if (_id.match(/^enum\.rooms\./) || _id.match(/^enum\.functions\./)) {
                                enums.push({
                                    id:         _id,
                                    name:       doc.rows[i].value.common.name,
                                    smartName:  smartName
                                });
                            }
                        }
                    }
                }
                var result = [];
                for (var f = 0; f < funcs.length; f++) {
                    if (!funcs[f].common || !funcs[f].common.members || typeof funcs[f].common.members !== 'object' || !funcs[f].common.members.length) continue;

                    for (var s = 0; s < funcs[f].common.members.length; s++) {
                        var id = funcs[f].common.members[s];
                        smartName = getSmartName(funcs[f]);
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
                                smartName = getSmartName(rooms[r]);
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
                                    smartName = getSmartName(funcs[f]);
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
}

module.exports = AlexaSH2;