const AdjustablePercentageControl = require('./AdjustablePercentageControl');

/**
 * @class
 */
class VolumeGroup extends AdjustablePercentageControl {
    get categories() {
        return ['SPEAKER'];
    }
}

module.exports = VolumeGroup;