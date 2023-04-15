const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');
/**
 * @class
 */
class Socket extends Control {

    static get type() {
        return 'socket'
    }

    get categories() {
        return ['SWITCH']
    }

    initCapabilities(ctrl) {
        let result = [{
            capability: new Capabilities.PowerController(),
            properties: []
        }]

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.powerStateProxy(ctrl)
                })   
            }
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