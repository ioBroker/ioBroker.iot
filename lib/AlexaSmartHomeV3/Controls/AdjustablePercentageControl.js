const Capabilities = require('../Alexa/Capabilities');
const AdjustableControl = require('./AdjustableControl');
const Properties = require('../Alexa/Properties');

/**
 * @class
 */
class AdjustablePercentageControl extends AdjustableControl {
    adjustableProperties() {
        return [Properties.Percentage];
    }


    initCapabilities(ctrl) {
        let result = [new Capabilities.PercentageController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.percentageInitObject(ctrl))
        }
        return result;
    }
}

module.exports = AdjustablePercentageControl;