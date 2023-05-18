const AlexaResponse = require('../Alexa/AlexaResponse');
const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');

/**
 * @class
 */
class Motion extends Control {
    get categories() {
        return ['MOTION_SENSOR'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.MotionSensor()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.detectedStateInitObject(ctrl))
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

module.exports = Motion;