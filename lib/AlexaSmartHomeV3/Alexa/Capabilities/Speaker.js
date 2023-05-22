const Properties = require('../Properties');
const Base = require('./Base')

class Speaker extends Base {

    initProperties() {
        return [new Properties.Volume(), new Properties.Muted()];
    }
}

module.exports = Speaker;