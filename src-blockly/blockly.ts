/**
 * The ioBroker.iot block for the Blockly editor of ioBroker.javascript.
 *
 * This is the source of `admin/blockly.js`, which is a generated bundle - do not edit that file,
 * run `npm run build:blockly` instead.
 *
 * The editor loads the bundle as a classic script *after* Blockly itself is up, so the runtime is
 * taken from `window.Blockly` and the `blockly` package contributes types only. See
 * `src-blockly/README.md` for why importing the runtime would break the block.
 */

// The words are bundled into `admin/blockly.js` at build time, because the editor loads that file as a
// classic script and `Blockly.Words` must be filled before the block is registered - there is no moment
// at which the files could be fetched. `npm run translate` keeps them up to date.
import de from './i18n/de.json';
import en from './i18n/en.json';
import es from './i18n/es.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';
import nl from './i18n/nl.json';
import pl from './i18n/pl.json';
import pt from './i18n/pt.json';
import ru from './i18n/ru.json';
import uk from './i18n/uk.json';
import zhCn from './i18n/zh-cn.json';

import type { Block } from 'blockly/core';

const Blockly = window.Blockly;

// Older editors do not ship a translator yet
Blockly.Translate ||= function (word: string, lang?: string): string {
    lang ||= window.systemLang;
    const entry = Blockly.Words?.[word];
    return entry ? entry[lang || 'en'] || entry.en : word;
};

// --- ifttt --------------------------------------------------
const LANGUAGES: Record<string, Record<string, string>> = {
    de,
    en,
    es,
    fr,
    it,
    nl,
    pl,
    pt,
    ru,
    uk,
    'zh-cn': zhCn,
};

// `Blockly.Words` is keyed by word and not by language, so the imported files must be turned inside out
const iotWords: Record<string, Record<string, string>> = {};
for (const [lang, texts] of Object.entries(LANGUAGES)) {
    for (const [word, text] of Object.entries(texts)) {
        if (text) {
            (iotWords[word] ||= {})[lang] = text;
        }
    }
}
Object.assign(Blockly.Words, iotWords);

// Not a word but a link per language, so it must not be given to the translator
Blockly.Words.ifttt_help = {
    en: 'https://github.com/ioBroker/ioBroker.cloud/blob/master/README.md',
    de: 'http://www.iobroker.net/?page_id=178&lang=de',
    ru: 'http://www.iobroker.net/?page_id=4262&lang=ru',
};

// Blockly.Sendto is a global variable and defined in javascript/admin/google-blockly/own/blocks_sendto.js
Blockly.Sendto.blocks.ifttt_iot = `<block type="ifttt_iot">
     <value name="INSTANCE">
     </value>
     <value name="EVENT">
         <shadow type="text">
             <field name="TEXT">state</field>
         </shadow>
     </value>
     <value name="VALUE1">
         <shadow type="text">
             <field name="TEXT">value1</field>
         </shadow>
     </value>
     <value name="VALUE2">
         <shadow type="text">
             <field name="TEXT">value2</field>
         </shadow>
     </value>
     <value name="VALUE3">
         <shadow type="text">
             <field name="TEXT">value3</field>
         </shadow>
     </value>
     <value name="LOG">
     </value>
</block>`;

Blockly.Blocks.ifttt_iot = {
    init: function (this: Block): void {
        const options: [string, string][] = [];
        const instances = window.main?.instances;
        if (instances) {
            for (let i = 0; i < instances.length; i++) {
                const m = instances[i].match(/^system\.adapter\.iot\.(\d+)$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    options.push([`iot.${n}`, `.${n}`]);
                }
            }
        }

        // The editor may not know the instances yet - offer the usual ones
        if (!options.length) {
            for (let k = 0; k <= 4; k++) {
                options.push([`iot.${k}`, `.${k}`]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('ifttt_iot'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('EVENT').appendField(Blockly.Translate('ifttt_event'));

        // Blockly has no public API for an optional input
        for (const name of ['VALUE1', 'VALUE2', 'VALUE3'] as const) {
            const input = this.appendValueInput(name).appendField(Blockly.Translate(`ifttt_${name.toLowerCase()}`));
            if (input.connection) {
                (input.connection as unknown as { _optional: boolean })._optional = true;
            }
        }

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('ifttt_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('ifttt_log_none'), ''],
                    [Blockly.Translate('ifttt_log_info'), 'log'],
                    [Blockly.Translate('ifttt_log_debug'), 'debug'],
                    [Blockly.Translate('ifttt_log_warn'), 'warn'],
                    [Blockly.Translate('ifttt_log_error'), 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('ifttt_tooltip'));
        this.setHelpUrl(Blockly.Translate('ifttt_help'));
    },
};

function iftttToJavaScript(block: Block): string {
    const instance = block.getFieldValue('INSTANCE');
    const event = Blockly.JavaScript.valueToCode(block, 'EVENT', Blockly.JavaScript.ORDER_ATOMIC);
    const logLevel = block.getFieldValue('LOG');

    // value1..3 are optional inputs, so any of them can be empty. Emitting `value1: ,` would break
    // the user's whole script with a syntax error, so unconnected inputs are left out entirely -
    // which is what the adapter sees anyway, it forwards whatever keys the message carries.
    const objText: string[] = [];
    if (event) {
        objText.push(`event: ${event}`);
    }
    for (const name of ['VALUE1', 'VALUE2', 'VALUE3'] as const) {
        const value = Blockly.JavaScript.valueToCode(block, name, Blockly.JavaScript.ORDER_ATOMIC);
        if (value) {
            objText.push(`${name.toLowerCase()}: ${value}`);
        }
    }

    let logText = '';
    if (logLevel) {
        // Same trap: without an event there is nothing to append to the log message
        logText = `console.${logLevel}("ifttt_iot: "${event ? ` + ${event}` : ''});\n`;
    }

    return `sendTo("iot${instance}", "ifttt", {${objText.join(', ')}});\n${logText}`;
}

// Blockly >= 10 looks the generator up in `forBlock`. Registering on the plain slot is not enough:
// the editor migrates that slot to `forBlock` for its own blocks only, because its migration step
// has already run by the time an adapter's blockly.js is loaded.
if (Blockly.JavaScript.forBlock) {
    Blockly.JavaScript.forBlock.ifttt_iot = iftttToJavaScript;
} else {
    Blockly.JavaScript.ifttt_iot = iftttToJavaScript;
}
