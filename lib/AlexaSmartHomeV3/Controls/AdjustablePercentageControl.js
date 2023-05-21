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


    initCapabilities() {
        let result = [new Capabilities.PercentageController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.percentageInitObject())
        }
        return result;
    }
}

module.exports = AdjustablePercentageControl;