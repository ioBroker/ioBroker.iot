const Utils = require("../../Helpers/Utils");

class Base {
    get propertyName() {
        return Utils.firstLower(`${this.constructor.name}`)
    }

    static get propertyName() {
        return Utils.firstLower(Utils.className(this.toString()))
    }

    /**
     * Checks whether a directive refers to the property
     * @param event Contains the Alexa event.
     * @returns {boolean} 
     */
    static matches(event) {
        return event?.directive?.header?.name === this.propertyName;
    }

    matches(event) {
        return event?.directive?.header?.name === this.propertyName;
    }

    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     * @returns {object} 
     */
    alexaValue(event) {
        return event.directive.payload[this.propertyName]
    }

    reportValue(value) {
        return value
    }
}

module.exports = Base;