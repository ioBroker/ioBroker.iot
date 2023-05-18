const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Socket extends Control {
    get categories() {
        return ['SWITCH'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject(ctrl));
        }
        return result;
    }

    states(ctrl) {
        let setPower = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let getPower = ctrl.states.find(item => item.name === 'ACTUAL');
        return [setPower, getPower];
    }
}

module.exports = Socket;