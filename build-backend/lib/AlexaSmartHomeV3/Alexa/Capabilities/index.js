"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BrightnessController_1 = __importDefault(require("./BrightnessController"));
const ColorController_1 = __importDefault(require("./ColorController"));
const ColorTemperatureController_1 = __importDefault(require("./ColorTemperatureController"));
const ContactSensor_1 = __importDefault(require("./ContactSensor"));
const LockController_1 = __importDefault(require("./LockController"));
const ModeController_1 = __importDefault(require("./ModeController"));
const MotionSensor_1 = __importDefault(require("./MotionSensor"));
const PercentageController_1 = __importDefault(require("./PercentageController"));
const PowerController_1 = __importDefault(require("./PowerController"));
const Speaker_1 = __importDefault(require("./Speaker"));
const TemperatureSensor_1 = __importDefault(require("./TemperatureSensor"));
const ThermostatController_1 = __importDefault(require("./ThermostatController"));
exports.default = {
    BrightnessController: BrightnessController_1.default,
    ColorController: ColorController_1.default,
    ColorTemperatureController: ColorTemperatureController_1.default,
    ContactSensor: ContactSensor_1.default,
    LockController: LockController_1.default,
    ModeController: ModeController_1.default,
    MotionSensor: MotionSensor_1.default,
    PercentageController: PercentageController_1.default,
    PowerController: PowerController_1.default,
    Speaker: Speaker_1.default,
    TemperatureSensor: TemperatureSensor_1.default,
    ThermostatController: ThermostatController_1.default,
};
//# sourceMappingURL=index.js.map