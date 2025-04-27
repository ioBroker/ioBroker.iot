import React from 'react';
import { I18n } from '@iobroker/adapter-react-v5';

import {
    type GenericBlockProps,
    type IGenericBlock,
    GenericBlock as WidgetGenericBlock,
    type RuleBlockConfig,
    type RuleBlockDescription,
    type RuleContext,
    type RuleTagCardTitle,
} from '@iobroker/javascript-rules-dev';

declare global {
    interface Window {
        GenericBlock: typeof IGenericBlock;
    }
}

const GenericBlock = window.GenericBlock || WidgetGenericBlock;

export interface ActionVisuRuleBlockConfig extends RuleBlockConfig {
    message: string;
    instance: string;
    tagCard?: RuleTagCardTitle;
    priority: boolean;
    title: string;
    expire: string;
}

export default class ActionVisu extends GenericBlock<ActionVisuRuleBlockConfig> {
    constructor(props: GenericBlockProps<ActionVisuRuleBlockConfig>) {
        super(props, ActionVisu.getStaticData());
    }

    static compile(config: ActionVisuRuleBlockConfig, context: RuleContext): string {
        let message = (config.message || '').replace(/"/g, '\\"');
        if (!message) {
            return `// no text defined
_sendToFrontEnd(${config._id}, {message: 'No message defined'});`;
        }
        return `// ioBroker.visu ${(message || '').replace(/\n/g, ' ').replace(/\r/g, ' ')}
\t\tconst subActionVar${config._id} = "${(message || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {message: subActionVar${config._id}});
\t\tsetState("${config.instance}.app.message", JSON.stringify({message: subActionVar${config._id}, title: "${(config.title || '').replace(/"/g, '\\"')}", priority: ${config.priority ? '"high"': '"normal"'}, expire: ${parseInt((config.expire || '').toString().replace(/"/g, '\\"'), 10) || 3600}}));`;
    }

    renderDebug(debugMessage: { data: { message: string } }): React.JSX.Element | string {
        return `${I18n.t('Sent:')} ${debugMessage.data.message}`;
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        this.setState({
            inputs: [
                {
                    attr: 'instance',
                    nameRender: 'renderInstance',
                    adapter: 'iot',
                    defaultValue: 'iot.0',
                    frontText: 'Instance:',
                },
                {
                    attr: 'message',
                    nameRender: 'renderModalInput',
                    defaultValue: 'Hallo',
                    nameBlock: '',
                    frontText: 'Message:',
                },
                {
                    attr: 'title',
                    frontText: 'Title:',
                    nameRender: 'renderText',
                    defaultValue: 'Title',
                },
                {
                    attr: 'expire',
                    frontText: 'Expire(sec):',
                    nameRender: 'renderText',
                    defaultValue: '3600',
                },
                {
                    frontText: 'Priority',
                    nameRender: 'renderCheckbox',
                    defaultValue: false,
                    attr: 'priority',
                },
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'ioBroker.visu',
            id: 'ActionVisu',
            adapter: 'iot',
            title: 'Sends to ioBroker.visu',
            helpDialog: 'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        };
    }

    getData(): RuleBlockDescription {
        return ActionVisu.getStaticData();
    }
}
