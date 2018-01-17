function getActions(obj) {
    var type    = obj.common.type;
    var actions = null;

    if (obj.common.write === false) {
        if (obj.common.unit === 'C' || obj.common.unit === 'C°' || obj.common.unit === '°C' ||
            obj.common.unit === 'F' || obj.common.unit === 'F°' || obj.common.unit === '°F' ||
            obj.common.unit === 'K' || obj.common.unit === 'K°' || obj.common.unit === '°K') {
            actions = ['getTemperatureReading'];
            type = '';
        } else {
            return null;
        }
    } else {
        if (type === 'number') {
            if (obj.common.unit === 'C' || obj.common.unit === 'C°' || obj.common.unit === '°C' ||
                obj.common.unit === 'F' || obj.common.unit === 'F°' || obj.common.unit === '°F' ||
                obj.common.unit === 'K' || obj.common.unit === 'K°' || obj.common.unit === '°K') {
                actions = ['setTargetTemperature', 'incrementTargetTemperature', 'decrementTargetTemperature', 'getTargetTemperature'];
                type = '';
            } else if (obj.common.role === 'level.color.hue') {
                actions = ['setColor', 'turnOn', 'turnOff'];
            } else if (obj.common.role === 'level.color.temperature') {
                actions = ['incrementColorTemperature', 'decrementColorTemperature', 'setColorTemperature'];
            } else {
                actions = ['setPercentage', 'incrementPercentage', 'decrementPercentage', 'turnOn', 'turnOff'];
            }
        } else if (obj.common.role === 'switch.lock') {
            actions = ['setLockState', 'getLockState'];
            type = '';
        } else if (obj.common.role && obj.common.role.match(/^button/)) {
            actions = ['turnOn'];
            type = '';
        } else if (obj.common.role === 'level.color.rgb') {
            actions = ['setColor', 'turnOn', 'turnOff'];
        } else {
            actions = ['turnOn', 'turnOff'];
            type = '';
        }
    }
    return {type: type, actions: actions};
}

if (typeof module !== 'undefined' && module.parent) {
    module.exports.getActions = getActions;
}