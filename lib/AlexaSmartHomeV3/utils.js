
let enums = [];
let lang = 'de';
let translate = false;
let translateRooms;
let translateFunctions;
let translateDevices;
let addedId = null;
let Actions = require('../../admin/actions');
const DeviceManager = require('./DeviceManager');

const words = {
    'No name': { 'en': 'No name', 'de': 'Kein Name', 'ru': 'Нет имени' },
    'Group': { 'en': 'Group', 'de': 'Gruppe', 'ru': 'Группа' }
};

function getSmartName(adapter, states, id) {
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

function processState(adapter, states, id, room, func, alexaIds, groups, names, result) {
    // Make sure to also add other needed Endpoints:
    /*adapter.log.debug('[ALEXA] Process: ' + id);
    if(states[id].common.role == 'level.color.hue') {
        let sat = findRole(states,id,'level.color.saturation');
        let bri = findRole(states,id,'level.dimmer');
        let on = findRole(states,id,'switch');
        adapter.log.debug('[ALEXA] Adding needed: ' + sat +  ' ' + bri + ' ' + on);
        if(sat) processState(states, sat, room, func, alexaIds, groups, names, result);
        if(bri) processState(states, bri, room, func, alexaIds, groups, names, result);
        if(on) processState(states, on, room, func, alexaIds, groups, names, result);
    }*/

    try {
        // get the friendly name of state
        let friendlyName = getSmartName(adapter, states, id);
        let nameModified = false;
        let byON;
        let smartType;
        if (!id) {
            return 'id is empty';
        }

        if (states[id] && states[id].native) {
            // try to convert old notation to new one
            if (!adapter.config.noCommon) {
                if (states[id].native.byON) {
                    byON = states[id].native.byON;
                    delete states[id].native.byON;
                    let smartName = states[id].common.smartName;

                    if (!smartName || typeof smartName !== 'object') {
                        smartName = {
                            byON: byON,
                            en: smartName
                        };
                        smartName[lang] = smartName.en;
                    } else {
                        smartName.byON = byON;
                    }
                    states[id].common.smartName = smartName || {};
                    friendlyName = states[id].common.smartName;
                } else if (typeof states[id].common.smartName === 'string') {
                    let nnn = states[id].common.smartName;
                    states[id].common.smartName = {};
                    states[id].common.smartName[lang] = nnn;
                    friendlyName = states[id].common.smartName;
                }
            }
        } else {
            adapter.log.debug(`[ALEXA] Invalid state "${id}". Not exist or no native part.`);
            return `"${id}" not exists or no native part.`;
        }

        byON = friendlyName && typeof friendlyName === 'object' ? friendlyName.byON : '';
        smartType = friendlyName && typeof friendlyName === 'object' ? friendlyName.smartType : null;

        // extract name in system language
        if (typeof friendlyName === 'object' && friendlyName) {
            friendlyName = friendlyName[lang] || friendlyName.en;
        }

        if (friendlyName === 'ignore' || friendlyName === false) {
            return `"${id}" must be ignored, because of the settings`;
        }

        if (!friendlyName && !room && !func) {
            return `No friendly name and no room or function found for "${id}"`;
        }

        // take room name in system language
        if (room && typeof room === 'object') {
            room = room[lang] || room.en;
        }
        // take function name in system language
        if (func && typeof func === 'object') {
            func = func[lang] || func.en;
        }

        let friendlyNames = [];
        // if it is not individual state, create a friendly name from function+room
        if (!friendlyName) {
            if (room) {
                // translate room
                if (translate) {
                    translateRooms = translateRooms || require('../rooms.js');
                    translateFunctions = translateFunctions || require('../functions.js');
                    room = translateRooms(lang, room);
                    func = translateFunctions(lang, func);
                }

                if (adapter.config.functionFirst) {
                    if (lang === 'en') {
                        friendlyName = `${func}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${room}`;
                    } else {
                        friendlyName = `${func}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${room}`;
                    }
                } else {
                    if (lang === 'en') {
                        friendlyName = `${room}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${func}`;
                    } else {
                        friendlyName = `${room}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${func}`;
                    }
                }
            } else {
                // if no room defined, just take a name of state as friendlyName
                friendlyName = states[id].common.name;
                if (adapter.config.replaces) {
                    for (let r = 0; r < adapter.config.replaces.length; r++) {
                        friendlyName = friendlyName.replace(adapter.config.replaces[r], '');
                    }
                }
            }
            friendlyNames[0] = friendlyName;
            nameModified = false;
        } else if (translate) {
            // translate friendly name
            translateDevices = translateDevices || require('../devices.js');
            friendlyName = translateDevices(lang, friendlyName);
            nameModified = true;
            friendlyNames = friendlyName.split(',');
        } else {
            friendlyNames = friendlyName.split(',');
            nameModified = true;
        }

        // at this point we have an array with friendlyNames for this state (on state can have more than one friendlyName)
        // Friendly names may be max 127 bytes long and could have only specified set of chars
        for (let i = friendlyNames.length - 1; i >= 0; i--) {
            friendlyNames[i] = (friendlyNames[i] || '').trim();
            if (!friendlyNames[i]) {
                friendlyNames.splice(i, 1);
            } else {
                // friendlyName may not be longer than 128
                friendlyNames[i] = friendlyNames[i].substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
            }
        }

        // if no one valid friendly name => cancel processing 
        if (!friendlyNames[0]) {
            adapter.log.warn(`[ALEXA] State ${id} is invalid.`);
            return `State "${id}" has invalid friendly name`;
        }

        let friendlyDescription = states[id].common.name || id;
        if (typeof friendlyDescription === 'object') {
            friendlyDescription = friendlyDescription[lang] || friendlyDescription.en;
        }

        // try to find alexaV2 type
        let res = Actions.getActions(states[id]);
        if (!res) {
            adapter.log.debug(`[ALEXA] Name "${friendlyDescription}" cannot be written and will be ignored`);
            return `State "${id}" cannot be written and will be ignored`;
        }

        let type = res.type;
        let actions = res.actions;

        friendlyDescription = friendlyDescription.substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
        // any letter or number and _ - = # ; : ? @ &
        // let applianceId = id.substring(0, 256).replace(/[^a-zA-Z0-9_=#;:?@&-]+/g, '_');

        let pos;
        if (alexaIds && (pos = alexaIds.indexOf(id)) !== -1) {
            alexaIds.splice(pos, 1);
        }

        type = type ? (byON || '100') : false;
        let name = states[id].common.name || '';
        if (typeof name === 'object') {
            name = name[lang] || name.en;
        }
        name = name.substring(0, 128);

        for (let n = 0; n < friendlyNames.length; n++) {
            if (names[friendlyNames[n]]) {
                // Ignore it, because yet in the list
                if (names[friendlyNames[n]].additionalApplianceDetails.id === id) {
                    return;
                }

                // create virtual group
                if (groups[friendlyNames[n]]) {
                    /* //  let ids    = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.ids);
                       let _names = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.names || '[]');
                       let types  = JSON.parse(groups[friendlyNames[n]].additionalApplianceDetails.byONs || '[]');
                      // ids.push(id);
                       _names.push(name);
                       types.push(type);
   
                       // merge actions
                       for (let a = 0; a < actions.length; a++) {
                           if (!groups[friendlyNames[n]].actions.includes(actions[a])) {
                               groups[friendlyNames[n]].actions.push(actions[a]);
                           }
                       }
   
                      // groups[friendlyNames[n]].additionalApplianceDetails.ids   = JSON.stringify(ids);
                       groups[friendlyNames[n]].additionalApplianceDetails.names = JSON.stringify(_names);
                       groups[friendlyNames[n]].additionalApplianceDetails.byONs = JSON.stringify(types);*/

                    actions.forEach(action =>
                        !groups[friendlyNames[n]].actions.includes(action) && groups[friendlyNames[n]].actions.push(action));

                    if (smartType && !groups[friendlyNames[n]].applianceTypes.includes(smartType)) {
                        groups[friendlyNames[n]].applianceTypes.push(smartType);
                    }

                    groups[friendlyNames[n]].additionalApplianceDetails.byONs[id] = type;
                    groups[friendlyNames[n]].additionalApplianceDetails.names[id] = name;
                    groups[friendlyNames[n]].additionalApplianceDetails.smartTypes[id] = smartType;
                    let addids = [id];
                    for (let i = 0; i < addids.length; i++) {
                        let newid = addids[i];
                        let _parts = newid.split('.');
                        _parts.pop();
                        let channel = _parts.join('.');
                        if (groups[friendlyNames[n]].additionalApplianceDetails.channels.hasOwnProperty(channel)) {
                            groups[friendlyNames[n]].additionalApplianceDetails.channels[channel].push({ id: newid, role: states[addids[i]].common.role, actions });
                        } else {
                            groups[friendlyNames[n]].additionalApplianceDetails.channels[channel] = [{ id: newid, role: states[addids[i]].common.role, actions }];
                        }
                    }
                } else {
                    // convert single device into group, because at least two devices found with the sama name
                    groups[friendlyNames[n]] = {
                        applianceId: friendlyNames[n].replace(/[^a-zA-Zа-яА-Я0-9_=#;:?@&-]+/g, '_'),
                        applianceTypes: JSON.parse(JSON.stringify(names[friendlyNames[n]].applianceTypes)),
                        manufacturerName: 'ioBroker group',
                        modelName: (name || words['No name'][lang]).substring(0, 128),
                        version: '1',
                        friendlyName: friendlyNames[n],
                        friendlyDescription: words['Group'][lang] + ' ' + friendlyNames[n],
                        isReachable: true,
                        actions: JSON.parse(JSON.stringify(actions)),
                        additionalApplianceDetails: {
                            group: true,
                            channels: {},
                            smartTypes: {},
                            names: {},
                            byONs: {},
                            room: room,
                            func: func
                        },
                    };

                    const oldActions = names[friendlyNames[n]].actions;
                    // merge actions for the first group, too!
                    for (let a = 0; a < oldActions.length; a++) {
                        if (!groups[friendlyNames[n]].actions.includes(oldActions[a])) {
                            groups[friendlyNames[n]].actions.push(oldActions[a]);
                        }
                    }

                    let oldObjDetails = names[friendlyNames[n]].additionalApplianceDetails;

                    if (smartType && !groups[friendlyNames[n]].applianceTypes.includes(smartType)) {
                        groups[friendlyNames[n]].applianceTypes.push(smartType);
                    }

                    groups[friendlyNames[n]].additionalApplianceDetails.byONs[oldObjDetails.id] = oldObjDetails.byON;
                    groups[friendlyNames[n]].additionalApplianceDetails.names[oldObjDetails.id] = oldObjDetails.name;
                    groups[friendlyNames[n]].additionalApplianceDetails.smartTypes[oldObjDetails.id] = oldObjDetails.smartType;
                    groups[friendlyNames[n]].additionalApplianceDetails.byONs[id] = type;
                    groups[friendlyNames[n]].additionalApplianceDetails.names[id] = name;
                    groups[friendlyNames[n]].additionalApplianceDetails.smartTypes[id] = smartType;

                    let addids = [names[friendlyNames[n]].additionalApplianceDetails.id, id];
                    for (let i = 0; i < addids.length; i++) {
                        let newid = addids[i];
                        let _parts = newid.split('.');
                        _parts.pop();
                        let channel = _parts.join('.');
                        if (groups[friendlyNames[n]].additionalApplianceDetails.channels.hasOwnProperty(channel)) {
                            groups[friendlyNames[n]].additionalApplianceDetails.channels[channel].push({ id: newid, role: states[addids[i]].common.role, actions: newid === id ? actions : oldActions });
                        } else {
                            groups[friendlyNames[n]].additionalApplianceDetails.channels[channel] = [{ id: newid, role: states[addids[i]].common.role, actions: newid === id ? actions : oldActions }];
                        }
                    }

                    result.push(groups[friendlyNames[n]]);
                    names[friendlyNames[n]].disabled = true;
                }
            } else {
                const obj = {
                    applianceId: friendlyNames[n].replace(/[^a-zA-Zа-яА-Я0-9_=#;:?@&-]+/g, '_'),
                    applianceTypes: [],
                    manufacturerName: 'ioBroker',
                    modelName: (name || words['No name'][lang]).substring(0, 128),
                    version: '1',
                    friendlyName: friendlyNames[n],
                    friendlyDescription: friendlyDescription,
                    isReachable: true,
                    actions: JSON.parse(JSON.stringify(actions)),
                    additionalApplianceDetails: {
                        id: id.substring(0, 1024),
                        role: states[id].common.role,
                        name,
                        friendlyNames: friendlyNames.join(', '),
                        smartType,
                        byON: type,
                        nameModified,
                        room,
                        func
                    }
                };
                names[friendlyNames[n]] = obj;
                smartType && names[friendlyNames[n]].applianceTypes.push(smartType);
                result.push(obj);
            }
        }
    } catch (e) {
        adapter.log.error(`[ALEXA] Cannot process "${id}": ${e}`);
        return `Error by processing of "${id}": ${e}`;
    }
}


let allStates = async function name(adapter) {
    return new Promise((resolve, reject) => {
        adapter.getObjectView('system', 'state', {}, (err, states) => {
            if (err) {
                reject(err);
            } else {
                resolve(states.rows)
            }
        })
    });
}

let smartNameOfValue = function (adapter, value) {
    let smartName = adapter.config.noCommon ? value?.common?.custom[adapter.namespace]?.smartName : value?.common?.smartName;
    return smartName === 'ignore' ? undefined : smartName;
}

let allStatesAsMap = async function (adapter) {
    let states = await allStates(adapter);
    let map = new Map();
    states.forEach(state => {
        let value = state?.value;
        map.set(state.id, {
            value: value,
            smartName: smartNameOfValue(adapter, value),
            rooms: [],
            functions: []
        });
    })
    return map;
}

let allEnums = async function (adapter) {
    return new Promise((resolve, reject) => {
        adapter.getObjectView('system', 'enum', {}, (err, enums) => {
            if (err) {
                reject(err);
            } else {
                resolve(enums.rows)
            }
        })
    });
}

let isValueARoom = function (value, smartName) {
    return (value._id.match(/^enum\.rooms\./) && smartName !== false);
}

let isValueAFunction = function (value, smartName) {
    return (value._id.match(/^enum\.functions\./) && smartName !== false);
}

let roomOrFunctionName = function (value, smartName) {
    let name = null;

    if (smartName && typeof smartName === 'object') {
        name = smartName[lang] || smartName.en;
    }
    name = name || value?.common?.name;

    // still no name? => generate one from id
    if (!name) {
        // get all id segments
        let parts = value._id.split('.');
        // skip the first two segments: enum.functions or enum.rooms
        parts.shift();
        parts.shift();
        // start with the 3rd segment
        let start = parts.shift();
        // capitalize the first letter of the 3rd segment and append the rest
        name = start[0].toUpperCase() + start.substring(1) + (parts.length ? '.' : '') + parts.join('.');
    }
    return name;
}

let allEnumsAsMap = async function (adapter) {
    let enums = await allEnums(adapter);
    let map = new Map();
    enums.forEach(en => {
        let value = en?.value;
        // skip empty rooms and functions (with no members, i.e. states, assigned)
        if (value?.common?.members?.length) {
            let smartName = smartNameOfValue(adapter, value);
            map.set(en.id, {
                value: value,
                smartName: smartName,
                name: roomOrFunctionName(value, smartName),
                isRoom: isValueARoom(value, smartName),
                isFunc: isValueAFunction(value, smartName)
            });
        }
    })
    return map;
}


module.exports = {
    getDevices: async function (adapter) {

        return new Promise(async (resolve, reject) => {
            // aggregate devices
            let aggregator = new DeviceManager(adapter, lang)


            adapter.getObjectView('system', 'state', {}, (err, _states) => {
                let states = {};
                let ids = [];
                let alexaIds = [];
                let groups = {};
                let names = {};

                if (_states && _states.rows) {
                    // find all states, that have smartName !== 'ignore' and not empty
                    // such a states acts like individual devices 
                    for (let i = 0; i < _states.rows.length; i++) {
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

                // read all enums and extract from them rooms and functions
                adapter.getObjectView('system', 'enum', {}, (err, doc) => {
                    // Build overlap from rooms and functions
                    let rooms = [];
                    let funcs = [];
                    let smartName;
                    if (doc && doc.rows) {
                        for (let i = 0, l = doc.rows.length; i < l; i++) {
                            if (doc.rows[i].value) {
                                let _id = doc.rows[i].id;
                                smartName = getSmartName(adapter, doc.rows[i].value);
                                // if room => save name it into array
                                if (_id.match(/^enum\.rooms\./) && smartName !== 'ignore' && smartName !== false) {
                                    rooms.push(doc.rows[i].value);
                                }
                                // if function => save name it into array
                                if (_id.match(/^enum\.functions\./) && smartName !== 'ignore' && smartName !== false) {
                                    funcs.push(doc.rows[i].value);
                                }
                                // additionally save all funcs and rooms into array with enums and extract only important information
                                if (_id.match(/^enum\.rooms\./) || _id.match(/^enum\.functions\./)) {
                                    if (!doc.rows[i].value) {
                                        doc.rows[i].value = {};
                                    }
                                    if (!doc.rows[i].value.common) {
                                        doc.rows[i].value.common = {};
                                    }

                                    const en = {
                                        id: _id,
                                        name: doc.rows[i].value.common.name,
                                        color: doc.rows[i].value.common.color,
                                        icon: doc.rows[i].value.common.icon,
                                        type: 'enum',
                                        smartName: smartName
                                    };
                                    if (typeof en.name === 'object') {
                                        en.name = en.name[lang] || en.name.en;
                                    }
                                    enums.push(en);
                                }
                            }
                        }
                    }
                    let result = [];
                    // iterate over all function categories
                    for (let f = 0; f < funcs.length; f++) {
                        if (!funcs[f].common || !funcs[f].common.members || typeof funcs[f].common.members !== 'object' || !funcs[f].common.members.length) {
                            continue;
                        }

                        // check every object id in members of this category
                        for (let s = 0; s < funcs[f].common.members.length; s++) {
                            let id = funcs[f].common.members[s]; // process one object from "functions" category
                            if (typeof id !== 'string') {
                                continue;
                            }
                            smartName = getSmartName(adapter, funcs[f]);
                            if (smartName && typeof smartName === 'object') {
                                smartName = smartName[lang] || smartName.en;
                            }
                            let func = smartName || funcs[f].common.name;

                            if (!func) {
                                func = funcs[f]._id.substring('enum.functions.'.length);
                                func = func[0].toUpperCase() + func.substring(1);
                            }

                            // Find room
                            let room = '';
                            for (let r = 0; r < rooms.length; r++) {
                                // if members object invalid, skip it
                                if (!rooms[r].common || !rooms[r].common.members || typeof rooms[r].common.members !== 'object' || !rooms[r].common.members.length) {
                                    continue;
                                }

                                // if object is in function and in some room 
                                if (rooms[r].common.members.includes(id)) {
                                    smartName = getSmartName(adapter, rooms[r]);
                                    if (smartName && typeof smartName === 'object') {
                                        smartName = smartName[lang] || smartName.en;
                                    }
                                    room = smartName || rooms[r].common.name;
                                    if (!room) {
                                        room = rooms[r]._id.substring('enum.rooms.'.length);
                                        room = room[0].toUpperCase() + room.substring(1);
                                    }
                                }

                                // if state is not in this room
                                if (!room) {
                                    // may be the channel is in the room
                                    let _parts = id.split('.');
                                    _parts.pop();
                                    let channel = _parts.join('.');
                                    if (rooms[r].common.members.includes(channel)) {
                                        smartName = getSmartName(adapter, funcs[f]);
                                        if (smartName && typeof smartName === 'object') {
                                            smartName = smartName[lang] || smartName.en;
                                        }

                                        room = smartName || rooms[r].common.name;

                                        if (!room) {
                                            room = rooms[r]._id.substring('enum.rooms.'.length);
                                            room = room[0].toUpperCase() + room.substring(1);
                                        }
                                    }
                                }
                                if (room) {
                                    break;
                                }
                            }

                            // If it is not a state but a channel
                            if (!states[id]) {
                                let m = new RegExp('^' + id.replace(/\./g, '\\.'));
                                for (let ii = 0; ii < ids.length; ii++) {
                                    if (ids[ii] < id) {
                                        continue;
                                    }
                                    // find all states in this channel
                                    if (m.exec(ids[ii])) {
                                        if (states[ids[ii]].common.role && (
                                            states[ids[ii]].common.role === 'state' ||
                                            states[ids[ii]].common.role.match(/^switch/) ||
                                            states[ids[ii]].common.role.match(/^level/)
                                        )) {
                                            // and process every of them
                                            processState(adapter, states, ids[ii], room, func, alexaIds, groups, names, result);
                                        }
                                        continue;
                                    }
                                    break;
                                }
                            } else {
                                // just process a state
                                processState(adapter, states, id, room, func, alexaIds, groups, names, result);
                            }
                        }
                    }

                    let analyseAddedId = null;

                    // process states with defined smartName (single states)
                    for (let j = 0; j < alexaIds.length; j++) {
                        const errorText = processState(adapter, states, alexaIds[j], null, null, null, groups, names, result);
                        if (addedId && !analyseAddedId && alexaIds[j] === addedId && errorText) {
                            adapter.log.error(errorText);
                            analyseAddedId = errorText;
                        }
                    }

                    result.sort((a, b) => {
                        let fnA = a.friendlyName;
                        if (typeof fnA === 'object') {
                            fnA = fnA[lang] || fnA['en'];
                        }
                        let fnB = b.friendlyName;
                        if (typeof fnB === 'object') {
                            fnB = fnB[lang] || fnB['en'];
                        }
                        if (fnA > fnB) {
                            return 1;
                        } else
                            if (fnA < fnB) {
                                return -1;
                            } else {
                                return 0;
                            }
                    });

                    // delete disabled states/Channel and extract names in system language
                    for (let k = result.length - 1; k >= 0; k--) {
                        if (result[k].disabled) {
                            result.splice(k, 1);
                        } else {
                            let fn = result[k].friendlyName;
                            if (typeof fn === 'object') {
                                fn = fn[lang] || fn['en'];
                            }
                            adapter.log.debug(`[ALEXA] Created ALEXA device: ${fn} ${JSON.stringify(result[k].actions)}`);
                        }
                    }


                    // callback(err, result, analyseAddedId);

                    if (err) {
                        reject(err);
                    }

                    resolve(result);
                });
            });
        });


    }
}