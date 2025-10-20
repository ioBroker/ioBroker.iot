import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import HumiditySensor from '../Alexa/Capabilities/HumiditySensor';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';
import Control from './Control';

export default class Humidity extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        // Sensor devices must also implement Alexa.EndpointHealth.
        this._supported = [
            new HumiditySensor(this.blankInitObject()),
            new EndpointHealth(this.connectivityInitObject(true)!),
        ];
    }

    get categories(): AlexaV3Category[] {
        return ['TEMPERATURE_SENSOR'];
    }
}
