import Base from './Base';
import type { AlexaV3ActionMapping, AlexaV3FriendlyName, AlexaV3StateMapping } from '../../types';

export default class Closed extends Base {
    get friendlyNames(): AlexaV3FriendlyName[] {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Value.Close',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Closed',
                    locale: 'en-US',
                },
            },
            {
                '@type': 'text',
                value: {
                    text: 'Geschlossen',
                    locale: 'de-DE',
                },
            },
        ];
    }

    get actionMappings(): AlexaV3ActionMapping[] {
        return [
            {
                '@type': 'ActionsToDirective',
                actions: ['Alexa.Actions.Close'],
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
                states: ['Alexa.States.Close'],
                value: this.value,
            },
        ];
    }
}
