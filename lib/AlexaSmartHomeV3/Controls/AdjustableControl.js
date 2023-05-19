
const Control = require('./Control');
const Properties = require('../Alexa/Properties');

/**
 * @class
 */
class AdjustableControl extends Control {

    adjustableProperties() {
        return [];
    }

    isAdjustDirective(event) {
        return this.adjustableProperties().some(property => property.matches(event) && property.directive(event) === Properties.Base.ADJUST);
    }

    valueSetter(event) {
        return this.isAdjustDirective(event) ? this.adjustValue.bind(this) : super.valueSetter(event);
    }
}

module.exports = AdjustableControl;