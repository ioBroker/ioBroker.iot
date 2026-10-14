/**
 * The globals the ioBroker.javascript editor puts in place before it loads `admin/blockly.js`.
 *
 * These are deliberately *ambient declarations only*: the block file must take its Blockly runtime
 * from `window.Blockly`, never from an `import ... from 'blockly/core'`. Importing the runtime would
 * bundle a second, private Blockly instance into `admin/blockly.js`, and every block registered on
 * it would be invisible to the editor's instance.
 */
import type { Block, FieldDropdown } from 'blockly/core';

/** One translatable word: language code -> text. `en` is the fallback and always present. */
type BlocklyWord = { en: string } & Record<string, string>;

/**
 * The JavaScript code generator. Only the members a block file actually uses are declared - the
 * editor's instance is a full Blockly `JavascriptGenerator`.
 */
interface IoBrokerJavaScriptGenerator {
    ORDER_ATOMIC: number;
    /** Blockly >= 10 looks up generators here. Missing on the ancient editors. */
    forBlock?: Record<string, (block: Block) => string | [string, number] | null>;
    valueToCode: (block: Block, name: string, order: number) => string;
    /** Pre-10 editors registered generators directly on the generator object */
    [blockType: string]: unknown;
}

/** `Blockly` plus the extras the ioBroker editor adds on top of the stock library */
interface IoBrokerBlockly {
    Blocks: Record<string, { init: (this: Block) => void }>;
    JavaScript: IoBrokerJavaScriptGenerator;
    FieldDropdown: new (menuGenerator: [string, string][]) => FieldDropdown;

    /** Word table shared by all adapters; `Blockly.Translate` resolves against it */
    Words: Record<string, BlocklyWord>;
    Translate: (word: string, lang?: string) => string;

    /**
     * Defined by the editor in `google-blockly/own/blocks_sendto.js`. `blocks` collects the toolbox
     * XML of every adapter block, `HUE` is the shared colour of the "sendTo" category.
     */
    Sendto: {
        HUE: number;
        blocks: Record<string, string>;
    };
}

declare global {
    interface Window {
        Blockly: IoBrokerBlockly;
        /** ioBroker system language, set by the editor before the blocks are loaded */
        systemLang?: string;
        /** The editor's admin bridge. `instances` lists every `system.adapter.*` object. */
        main?: {
            instances?: string[];
        };
    }
}
