const AdjustablePercentageControl = require('./AdjustablePercentageControl');

/**
 * @class
 */
class Volume extends AdjustablePercentageControl {
    get categories() {
        return ['SPEAKER'];
    }
}

module.exports = Volume;