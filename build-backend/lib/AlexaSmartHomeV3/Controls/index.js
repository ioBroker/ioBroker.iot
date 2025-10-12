"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AdjustableControl_1 = __importDefault(require("./AdjustableControl"));
const AdjustablePercentageControl_1 = __importDefault(require("./AdjustablePercentageControl"));
const AirCondition_1 = __importDefault(require("./AirCondition"));
const Blind_1 = __importDefault(require("./Blind"));
const ContactSensor_1 = __importDefault(require("./ContactSensor"));
const Ct_1 = __importDefault(require("./Ct"));
const Dimmer_1 = __importDefault(require("./Dimmer"));
const Door_1 = __importDefault(require("./Door"));
const Gate_1 = __importDefault(require("./Gate"));
const Hue_1 = __importDefault(require("./Hue"));
const Light_1 = __importDefault(require("./Light"));
const Lock_1 = __importDefault(require("./Lock"));
const Motion_1 = __importDefault(require("./Motion"));
const ReadOnlyDetector_1 = __importDefault(require("./ReadOnlyDetector"));
const Slider_1 = __importDefault(require("./Slider"));
const Socket_1 = __importDefault(require("./Socket"));
const Temperature_1 = __importDefault(require("./Temperature"));
const Thermostat_1 = __importDefault(require("./Thermostat"));
const VacuumCleaner_1 = __importDefault(require("./VacuumCleaner"));
const Volume_1 = __importDefault(require("./Volume"));
const VolumeGroup_1 = __importDefault(require("./VolumeGroup"));
const Window_1 = __importDefault(require("./Window"));
exports.default = {
    factory: (item) => {
        if (item.type === AdjustableControl_1.default.type) {
            return new AdjustableControl_1.default(item);
        }
        if (item.type === AdjustablePercentageControl_1.default.type) {
            return new AdjustablePercentageControl_1.default(item);
        }
        if (item.type === AirCondition_1.default.type) {
            return new AirCondition_1.default(item);
        }
        if (item.type === Blind_1.default.type) {
            return new Blind_1.default(item);
        }
        if (item.type === ContactSensor_1.default.type) {
            return new ContactSensor_1.default(item);
        }
        if (item.type === Ct_1.default.type) {
            return new Ct_1.default(item);
        }
        if (item.type === Dimmer_1.default.type) {
            return new Dimmer_1.default(item);
        }
        if (item.type === Door_1.default.type) {
            return new Door_1.default(item);
        }
        if (item.type === Gate_1.default.type) {
            return new Gate_1.default(item);
        }
        if (item.type === Hue_1.default.type) {
            return new Hue_1.default(item);
        }
        if (item.type === Light_1.default.type) {
            return new Light_1.default(item);
        }
        if (item.type === Lock_1.default.type) {
            return new Lock_1.default(item);
        }
        if (item.type === Motion_1.default.type) {
            return new Motion_1.default(item);
        }
        if (item.type === ReadOnlyDetector_1.default.type) {
            return new ReadOnlyDetector_1.default(item);
        }
        if (item.type === Slider_1.default.type) {
            return new Slider_1.default(item);
        }
        if (item.type === Socket_1.default.type) {
            return new Socket_1.default(item);
        }
        if (item.type === Temperature_1.default.type) {
            return new Temperature_1.default(item);
        }
        if (item.type === Thermostat_1.default.type) {
            return new Thermostat_1.default(item);
        }
        if (item.type === VacuumCleaner_1.default.type) {
            return new VacuumCleaner_1.default(item);
        }
        if (item.type === Volume_1.default.type) {
            return new Volume_1.default(item);
        }
        if (item.type === VolumeGroup_1.default.type) {
            return new VolumeGroup_1.default(item);
        }
        if (item.type === Window_1.default.type) {
            return new Window_1.default(item);
        }
        return null;
    },
    AdjustableControl: AdjustableControl_1.default,
    AdjustablePercentageControl: AdjustablePercentageControl_1.default,
    AirCondition: AirCondition_1.default,
    Blind: Blind_1.default,
    ContactSensor: ContactSensor_1.default,
    Ct: Ct_1.default,
    Dimmer: Dimmer_1.default,
    Door: Door_1.default,
    Gate: Gate_1.default,
    Hue: Hue_1.default,
    Light: Light_1.default,
    Lock: Lock_1.default,
    Motion: Motion_1.default,
    ReadOnlyDetector: ReadOnlyDetector_1.default,
    Slider: Slider_1.default,
    Socket: Socket_1.default,
    Temperature: Temperature_1.default,
    Thermostat: Thermostat_1.default,
    VacuumCleaner: VacuumCleaner_1.default,
    Volume: Volume_1.default,
    VolumeGroup: VolumeGroup_1.default,
    Window: Window_1.default,
};
//# sourceMappingURL=index.js.map