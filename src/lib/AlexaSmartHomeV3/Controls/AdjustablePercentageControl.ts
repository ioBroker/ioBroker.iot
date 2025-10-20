import Capabilities from '../Alexa/Capabilities';
import AdjustableControl from './AdjustableControl';
import Percentage from '../Alexa/Properties/Percentage';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';
import { type IotExternalPatternControl } from '../types';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class AdjustablePercentageControl extends AdjustableControl {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        const percentageController = new Capabilities.PercentageController(this.percentageInitObject());
        this._supported = [percentageController];
        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [Percentage];
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue): Promise<void> {
        // todo: byON
        return super.setState(property, value);
    }
}
