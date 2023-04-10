const Capabilities = require('../Alexa/Capabilities');
const Properties = require('../Alexa/Properties');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');
/**
 * @class
 */
class Light extends Control {

    static get type() {
        return 'light'
    }

    get categories() {
        return ['LIGHT']
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
                    stateProxy: this.stateProxy(ctrl, property)
                })   
            }
        }

        return result;
    }

    initEnforcedCapabilities(ctrl) {
        let result = [{
            capability: new Capabilities.BrightnessController(),
            properties: []
        }]

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.stateProxy(ctrl, property)
                })   
            }
        }

        return result;
    }

    stateProxy(ctrl, property) {
        /*
            Device of type 'light' can be switched 'ON' and 'OFF'. Usually the same address (iobroker state id) can be used 
            to obtain the current state of the control. 
        */
        // this state is a mandatory one for the control, so it exists
        let setPower = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let getPower = ctrl.states.find(item => item.name === 'ON_ACTUAL');

        if (property.propertyName === Properties.PowerState.propertyName) {
            return new StateProxy({
                setId: setPower.id,
                getId: getPower?.id,
                alexaSetter: function (alexaValue) {
                    return alexaValue === Properties.PowerState.ON
                },
                alexaGetter: function (value) {
                    return value ? Properties.PowerState.ON : Properties.PowerState.OFF
                }
            })
        }

        if (property.propertyName === Properties.Brightness.propertyName) {
            return new StateProxy({
                setId: setPower.id,
                getId: getPower?.id,
                alexaSetter: function (alexaValue) {
                    return alexaValue > 0;
                },
                alexaGetter: function (value) {
                    return value ? 100 : 0;
                }
            })
        }
    }
}

module.exports = Light;