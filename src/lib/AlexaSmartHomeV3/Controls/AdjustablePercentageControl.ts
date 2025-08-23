import Capabilities from '../Alexa/Capabilities';
import AdjustableControl from './AdjustableControl';
import Percentage from '../Alexa/Properties/Percentage';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

export default class AdjustablePercentageControl extends AdjustableControl {
    adjustableProperties(): (typeof PropertiesBase)[] {
        return [Percentage];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result: CapabilitiesBase[] = [new Capabilities.PercentageController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.percentageInitObject());
        }
        return result;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue): Promise<void> {
        // todo: byON
        return super.setState(property, value);
    }
}
