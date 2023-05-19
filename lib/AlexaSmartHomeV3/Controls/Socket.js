const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Socket extends Control {

    get categories() {
        return ['SMARTPLUG'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject(ctrl));
        }
        return result;
    }
}

module.exports = Socket;