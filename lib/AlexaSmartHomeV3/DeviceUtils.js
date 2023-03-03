let isValidSmartName = function (smartName) {
    let name = null;
    if (smartName && typeof smartName === 'object') {
        name = smartName.en;
    }
    return name !== null && name !== 'ignore' && name !== false;
}


module.exports = {
    extractAllDeviceNames: function (adapter, lang, id, translate, smartName, roomName, functionName) {

        if (!isValidSmartName(smartName)) {
            return null;
        }

        let names = {}

        if (roomName && typeof roomName === 'object') {
            names.roomName = roomName[lang] || roomName.en;
        } else {
            names.roomName = roomName
        }

        if (functionName && typeof functionName === 'object') {
            names.functionName = functionName[lang] || functionName.en;
        } else {
            names.functionName = functionName
        }

        let friendlyName = smartName;

        // due to historical reasons, the smartName might be an object, containing among other things, also byON name, friendly name and smart type
        if (smartName && typeof smartName === 'object') {
            names.byON = smartName.byON;
            names.smartType = smartName.smartType;
            friendlyName = smartName[lang] || smartName.en;
        }

        // generate a default friendly name if none
        if (!friendlyName) {
            if (names.roomName) {
                // translate room and function names to generate friendly name
                if (translate) {
                    let translateRooms = require('../rooms.js');
                    let translateFunctions = require('../functions.js');
                    names.roomName = translateRooms(lang, names.roomName);
                    names.functionName = translateFunctions(lang, names.functionName);
                }

                if (adapter.config.functionFirst) {
                    friendlyName = `${names.functionName}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${names.roomName}`;
                } else {
                    friendlyName = `${names.roomName}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${names.functionName}`;
                }
            } else {
                friendlyName = 'not implemented yet';
                // TODO
                // // if no room name defined, just take a name of state as friendlyName
                // friendlyName = states[id].common.name;
                // if (adapter.config.replaces) {
                //     for (let r = 0; r < adapter.config.replaces.length; r++) {
                //         friendlyName = friendlyName.replace(adapter.config.replaces[r], '');
                //     }
                // }
            }

            names.friendlyNames = [friendlyName];
            names.nameModified = false;
        } else if (translate) {
            let translateDevices = require('../devices.js');
            friendlyName = translateDevices(lang, friendlyName);
            names.nameModified = true;
            names.friendlyNames = friendlyName.split(',');
        } else {
            names.friendlyNames = friendlyName.split(',');
            names.nameModified = true;
        }

        // Friendly names may be max 127 bytes long and could have only specified set of chars
        for (let i = names.friendlyNames.length - 1; i >= 0; i--) {
            names.friendlyNames[i] = (names.friendlyNames[i] || '').trim();
            if (!names.friendlyNames[i]) {
                names.friendlyNames.splice(i, 1);
            } else {
                // friendlyName may not be longer than 128
                names.friendlyNames[i] = names.friendlyNames[i].substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
            }
        }

        // if no one valid friendly name => cancel processing 
        if (!names.friendlyNames[0]) {
            adapter.log.warn(`[ALEXA-V3] State ${id} doesn't suit as a smart device. No freindly name could be determined.`);
            return null;
        }

        return names;
    }
}