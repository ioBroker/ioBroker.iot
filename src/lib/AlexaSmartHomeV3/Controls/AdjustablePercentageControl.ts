import Capabilities from '../Alexa/Capabilities';
import AdjustableControl from './AdjustableControl';
import Percentage from '../Alexa/Properties/Percentage';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';
import { type IotExternalPatternControl } from '../types';

export default class AdjustablePercentageControl extends AdjustableControl {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        const percentageController = new Capabilities.PercentageController(this.percentageInitObject());
        this._supported = [percentageController];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [Percentage];
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue): Promise<void> {
        // todo: byON
        return super.setState(property, value);
    }
}
