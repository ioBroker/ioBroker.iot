const AlexaResponse = require('../Alexa/AlexaResponse');
const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Door extends Control {
    get categories() {
        return ['CONTACT_SENSOR'];
    }

    initCapabilities(ctrl) {
        let result = [{
            capability: new Capabilities.ContactSensor(),
            properties: [],
        }];

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.detectedStateProxy(ctrl),
                });
            }
        }

        return result;
    }

    async handle(event) {
        this.log.error(`Setting value is not supported by ${this.name} control`);
        return Promise.reject(AlexaResponse.directiveNotSupportedByControl(this.name, event?.directive?.header?.namespace, event?.directive?.header?.payloadVersion).get());
    }

    states(ctrl) {
        // this state is a mandatory one for the control, so it exists
        let actual = ctrl.states.find(item => item.name === 'ACTUAL');
        return [actual, actual];
    }
}

module.exports = Door;