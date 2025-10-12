import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import Control from './Control';

export default class Temperature extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const temperatureSensor = new TemperatureSensor(this.blankInitObject());
        this._supported = [temperatureSensor];
    }

    get categories(): AlexaV3Category[] {
        return ['TEMPERATURE_SENSOR'];
    }
}
