class StateContainer {
    constructor(opts) {
        this.setStateId = opts.setState;
        this.getStateId = opts.getState || opts.setState;
        this.valuesMap = opts.valuesMap;
    }

    get setState() {
        return this.setStateId
    }

    get getState() {
        return this.getStateId
    }

    value(alexaValue) {
        return this.valuesMap[alexaValue]
    }
}

module.exports = StateContainer;