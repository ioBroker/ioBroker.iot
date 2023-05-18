const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');

/**
 * @class
 */
class Blinds extends Control {
    get categories() {
        return ['INTERIOR_BLIND'];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.PercentageController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(ctrl, property))
        }

        return result;
    }

    valueSetter(event) {
        if (Properties.Percentage.matches(event)
            && Properties.Percentage.directive(event) === Properties.Percentage.ADJUST) {
            return this.adjustValue.bind(this);
        }
        return super.valueSetter(event);
    }

    composeInitObject(ctrl, property) {
        // this state is a mandatory one for the control, so it exists
        let setState = ctrl.states.find(s => s.name === 'SET');
        // these are all optional
        let getState = ctrl.states.find(s => s.name === 'ACTUAL');


        if (property.propertyName === Properties.Percentage.propertyName) {
            const range = Utils.configuredRangeOrDefault(setState);

            return {
                setState: setState,
                getState: getState,
                alexaSetter: function (alexaValue) {
                    return Utils.denormalize_0_100(alexaValue, range.min, range.max);
                },
                alexaGetter: function (value) {
                    return Utils.normalize_0_100(value, range.min, range.max);
                },
            };
        }
    }
}

module.exports = Blinds;