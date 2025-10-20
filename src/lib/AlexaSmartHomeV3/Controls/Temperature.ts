import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import Control from './Control';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';
import HumiditySensor from '../Alexa/Capabilities/HumiditySensor';
import type { ControlStateInitObject } from '../Alexa/Properties/Base';

export default class Temperature extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        // Sensor devices must also implement Alexa.EndpointHealth.
        this._supported = [new TemperatureSensor(this.blankInitObject())];
        const initObj = this.humidityInitObject();
        if (initObj) {
            this._supported.push(new HumiditySensor(initObj));
        }
        this._supported.push(new EndpointHealth(this.connectivityInitObject(true)!));
    }

    get categories(): AlexaV3Category[] {
        return ['TEMPERATURE_SENSOR'];
    }

    humidityInitObject(): ControlStateInitObject | null {
        const map = this.statesMap;
        if (!this.states[map.second]) {
            return null;
        }
        return {
            getState: this.states[map.second]!,
            setState: this.states[map.second]!,
        };
    }
}
