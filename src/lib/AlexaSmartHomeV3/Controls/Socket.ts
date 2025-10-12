import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import PowerController from '../Alexa/Capabilities/PowerController';
import Control from './Control';

export default class Socket extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const powerController = new PowerController(this.powerStateInitObject());
        this._supported = [powerController];
    }

    get categories(): AlexaV3Category[] {
        return ['SMARTPLUG'];
    }
}
