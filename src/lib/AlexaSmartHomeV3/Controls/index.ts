import AdjustableControl from './AdjustableControl';
import AdjustablePercentageControl from './AdjustablePercentageControl';
import AirCondition from './AirCondition';
import Blind from './Blind';
import ContactSensor from './ContactSensor';
import type Control from './Control';
import Ct from './Ct';
import Dimmer from './Dimmer';
import Door from './Door';
import Gate from './Gate';
import Hue from './Hue';
import Light from './Light';
import Lock from './Lock';
import Motion from './Motion';
import RgbSingle from './RgbSingle';
import ReadOnlyDetector from './ReadOnlyDetector';
import Button from './Button';
import Slider from './Slider';
import Socket from './Socket';
import Temperature from './Temperature';
import Thermostat from './Thermostat';
import VacuumCleaner from './VacuumCleaner';
import Volume from './Volume';
import VolumeGroup from './VolumeGroup';
import Window from './Window';
import type { IotExternalPatternControl } from '../types';

export default {
    factory: (item: IotExternalPatternControl): Control | null => {
        // if (item.type === AdjustableControl.type) {
        //     return new AdjustableControl(item);
        // }
        if (item.type === AdjustablePercentageControl.type) {
            return new AdjustablePercentageControl(item);
        }
        if (item.type === AirCondition.type) {
            return new AirCondition(item);
        }
        if (item.type === Blind.type) {
            return new Blind(item);
        }
        if (item.type === ContactSensor.type) {
            return new ContactSensor(item);
        }
        if (item.type === Ct.type) {
            return new Ct(item);
        }
        if (item.type === Dimmer.type) {
            return new Dimmer(item);
        }
        if (item.type === Door.type) {
            return new Door(item);
        }
        if (item.type === Gate.type) {
            return new Gate(item);
        }
        if (item.type === Hue.type) {
            return new Hue(item);
        }
        if (item.type === Light.type) {
            return new Light(item);
        }
        if (item.type === Lock.type) {
            return new Lock(item);
        }
        if (item.type === Motion.type) {
            return new Motion(item);
        }
        if (item.type === RgbSingle.type) {
            return new RgbSingle(item);
        }
        if (item.type === Button.type) {
            return new Button(item);
        }
        if (item.type === Slider.type) {
            return new Slider(item);
        }
        if (item.type === Socket.type) {
            return new Socket(item);
        }
        if (item.type === Temperature.type) {
            return new Temperature(item);
        }
        if (item.type === Thermostat.type) {
            return new Thermostat(item);
        }
        if (item.type === VacuumCleaner.type) {
            return new VacuumCleaner(item);
        }
        if (item.type === Volume.type) {
            return new Volume(item);
        }
        if (item.type === VolumeGroup.type) {
            return new VolumeGroup(item);
        }
        if (item.type === Window.type) {
            return new Window(item);
        }
        return null;
    },
    AdjustableControl,
    AdjustablePercentageControl,
    AirCondition,
    Blind,
    ContactSensor,
    Ct,
    Dimmer,
    Door,
    Gate,
    Hue,
    Light,
    Lock,
    Motion,
    ReadOnlyDetector,
    RgbSingle,
    Scene: Button,
    Slider,
    Socket,
    Temperature,
    Thermostat,
    VacuumCleaner,
    Volume,
    VolumeGroup,
    Window,
};
