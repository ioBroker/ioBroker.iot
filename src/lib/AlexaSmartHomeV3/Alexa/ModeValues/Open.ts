import Base from './Base';
import type { AlexaV3ActionMapping, AlexaV3FriendlyName, AlexaV3StateMapping } from '../../types';

export default class Open extends Base {
    get friendlyNames(): AlexaV3FriendlyName[] {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Value.Open',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Opened',
                    locale: 'en-US',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Geöffnet',
                    locale: 'de-DE',
                },
            },
        ];
    }

    get actionMappings(): AlexaV3ActionMapping[] {
        return [
            {
                '@type': 'ActionsToDirective',
                actions: ['Alexa.Actions.Open'],
                directive: {
                    name: 'SetMode',
                    payload: {
                        mode: this.value,
                    },
                },
            },
        ];
    }

    get stateMappings(): AlexaV3StateMapping[] {
        return [
            {
                '@type': 'StatesToValue',
                states: ['Alexa.States.Opened'],
                value: this.value,
            },
        ];
    }
}
