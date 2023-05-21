const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class VacuumCleaner extends Control {

    get categories() {
        return ['VACUUM_CLEANER'];
    }

    initCapabilities() {
        let result = [new Capabilities.PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject());
        }
        return result;
    }

    get statesMap() {
        return {
            'set': 'POWER',
            'actual': undefined
        };
    }
}

module.exports = VacuumCleaner;