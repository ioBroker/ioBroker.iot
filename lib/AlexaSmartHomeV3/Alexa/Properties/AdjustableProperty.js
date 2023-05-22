const Utils = require('../../Helpers/Utils');
const Base = require('./Base');

class AdjustableProperty extends Base {

    static directive(event) {
        return event.directive.header.name === 'Adjust' + Utils.className(this.toString()) ? AdjustableProperty.ADJUST : AdjustableProperty.SET;
    }
}

module.exports = AdjustableProperty;