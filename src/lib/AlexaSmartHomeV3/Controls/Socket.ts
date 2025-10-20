import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import PowerController from '../Alexa/Capabilities/PowerController';
import Control from './Control';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class Socket extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const powerController = new PowerController(this.powerStateInitObject());
        this._supported = [powerController];

        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['SMARTPLUG'];
    }
}
