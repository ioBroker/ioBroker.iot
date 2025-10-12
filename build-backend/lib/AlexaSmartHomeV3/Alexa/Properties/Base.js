"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const Utils_1 = require("../../Helpers/Utils");
class Base {
    _properties = [];
    _setState = null;
    _setId = '';
    _getId = '';
    _valuesRange = { min: 0, max: 100 };
    _currentValue;
    _alexaSetter;
    _alexaGetter;
    _instance;
    _supportedModesAsEnum = {};
    /**
     * @param opts The object to initialize the corresponding ioBroker state.
     * @param opts.setState The iobroker state to write values to.
     * @param opts.getState The iobroker state to read values from.
     * @param opts.alexaSetter The function to apply to an Alexa value to transform it to the iobroker's one
     * @param opts.alexaGetter The function to apply to an iobroker value to transform it to the Alexa's one
     */
    init(opts) {
        if (!opts.setState) {
            throw new Error(`missing setState in ${this.constructor.name}`);
        }
        this._setState = opts.setState;
        this._setId = opts.setState.id;
        this._getId = opts.getState?.id || this._setId;
        this._valuesRange = (0, Utils_1.configuredRangeOrDefault)(this._setState);
        this._instance = opts.instance;
        if (opts.alexaSetter) {
            this._alexaSetter = opts.alexaSetter;
        }
        if (opts.alexaGetter) {
            this._alexaGetter = opts.alexaGetter;
        }
    }
    get instance() {
        return this._instance;
    }
    get propertyName() {
        return (0, Utils_1.firstLower)(`${this.constructor.name}`);
    }
    static get propertyName() {
        return (0, Utils_1.firstLower)((0, Utils_1.className)(this.toString()));
    }
    get valuesRangeMin() {
        return this._valuesRange.min;
    }
    get valuesRangeMax() {
        return this._valuesRange.max;
    }
    get setId() {
        return this._setId;
    }
    get getId() {
        return this._getId;
    }
    /**
     * returns last known iobroker value
     */
    get currentValue() {
        return this._currentValue;
    }
    set currentValue(value) {
        this._currentValue = value;
    }
    value(alexaValue) {
        return this._alexaSetter && typeof alexaValue === 'number'
            ? this._alexaSetter(alexaValue)
            : alexaValue;
    }
    alexaValue(value) {
        return this._alexaGetter && typeof value === 'number'
            ? this._alexaGetter(value)
            : value;
    }
    static directive(_event) {
        return Base.SET;
    }
    /**
     * Checks whether a directive refers to the property
     *
     * @param event Contains the Alexa event.
     */
    static matches(event) {
        return event?.directive?.header?.namespace === `Alexa.${(0, Utils_1.className)(this.toString())}Controller`;
    }
    matches(event) {
        return event?.directive?.header?.name === this.propertyName;
    }
    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     */
    alexaDirectiveValue(event) {
        if (this.propertyName === 'color') {
            return event.directive.payload.color;
        }
        if (this.propertyName === 'colorTemperatureInKelvin') {
            return event.directive.payload.colorTemperatureInKelvin;
        }
        if (this.propertyName === 'brightness') {
            return event.directive.payload.brightness;
        }
        // @ts-expect-error fix later
        return event.directive.payload[this.propertyName];
    }
    reportValue(value) {
        return value;
    }
    static get ADJUST() {
        return 'ADJUST';
    }
    static get SET() {
        return 'SET';
    }
    static get CELSIUS_SCALE() {
        return 'CELSIUS';
    }
    get supportedModesAsEnum() {
        return this._supportedModesAsEnum;
    }
}
exports.Base = Base;
exports.default = Base;
//# sourceMappingURL=Base.js.map