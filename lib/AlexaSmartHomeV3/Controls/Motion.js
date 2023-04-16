const AlexaResponse = require('../Alexa/AlexaResponse');
const Capabilities = require('../Alexa/Capabilities');
const Properties = require('../Alexa/Properties');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');
/**
 * @class
 */
class Motion extends Control {

    get categories() {
        return ['MOTION_SENSOR']
    }

    initCapabilities(ctrl) {
        let result = [{
            capability: new Capabilities.MotionSensor(),
            properties: []
        }]

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.detectedStateProxy(ctrl)
                })
            }
        }

        return result;
    }

    async handle(event) {
        this.log.error(`Setting value is not supported by Motion control`);
        return Promise.reject(AlexaResponse.directiveNotSupportedByControl(this.name, event?.directive?.header?.namespace, event?.directive?.header?.payloadVersion).get());
    }

    states(ctrl) {
        // this state is a mandatory one for the control, so it exists
        let actual = ctrl.states.find(item => item.name === 'ACTUAL');
        return [actual, actual];
    }

    detectedStateProxy(ctrl) {
        const [actual, _] = this.states(ctrl);
        return new StateProxy({
            setId: actual.id,
            getId: actual.id,
            alexaSetter: function (alexaValue) {
                // should be never called
                return 0;
            },
            alexaGetter: function (value) {
                return value ? Properties.DetectionState.DETECTED : Properties.DetectionState.NOT_DETECTED;
            }
        })
    }
}

module.exports = Motion;