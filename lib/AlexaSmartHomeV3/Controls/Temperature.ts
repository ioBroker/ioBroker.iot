import type { AlexaV3Category } from '../types';
import TemperatureSensor from '../Alexa/Capabilities/TemperatureSensor';
import Control from './Control';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

export default class Temperature extends Control {
    get categories(): AlexaV3Category[] {
        return ['TEMPERATURE_SENSOR'];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [new TemperatureSensor()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.blankInitObject());
        }

        return result;
    }
}
