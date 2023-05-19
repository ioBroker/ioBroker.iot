const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class VacuumCleaner extends Control {

    get categories() {
        return ['VACUUM_CLEANER'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject(ctrl));
        }
        return result;
    }

    statesMap() {
        return {
            'set': 'POWER',
            'actual': undefined
        };
    }
}

module.exports = VacuumCleaner;