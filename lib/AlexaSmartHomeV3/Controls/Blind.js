const AdjustablePercentageControl = require('./AdjustablePercentageControl');

/**
 * @class
 */
class Blind extends AdjustablePercentageControl {
    get categories() {
        return ['INTERIOR_BLIND'];
    }
}

module.exports = Blind;