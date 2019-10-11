/* global Blockly, goog, main, systemLang */

'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

// --- ifttt --------------------------------------------------
Blockly.Words['ifttt_iot'] = {
    "en": "Send text to IFTTT via iot",    
    "de": "Sende Text zu IFTTT über iot",    
    "ru": "Послать текст в IFTTT через iot",    
    "pt": "Enviar texto para o IFTTT via iot",    
    "nl": "Stuur tekst naar IFTTT via iot",    
    "fr": "Envoyer du texte à IFTTT via iot",    
    "it": "Invia testo a IFTTT tramite iot",    
    "es": "Enviar texto a IFTTT a través de iot",    
    "pl": "Wyślij tekst do IFTTT przez iot",    
    "zh-cn": "通过物联网发送文本到IFTTT"
};
Blockly.Words['ifttt_event'] = {
    "en": "event",  
    "de": "event",  
    "ru": "event",  
    "pt": "event",  
    "nl": "event",  
    "fr": "event",  
    "it": "event",  
    "es": "event",  
    "pl": "event",  
    "zh-cn": "event"
};
Blockly.Words['ifttt_value1'] = {    
    "en": "value1",
    "de": "value1",
    "ru": "value1",
    "pt": "value1",
    "nl": "value1",
    "fr": "value1",
    "it": "value1",
    "es": "value1",
    "pl": "value1",
    "zh-cn": "value1"
};
Blockly.Words['ifttt_value2'] = {    
    "en": "value2",
    "de": "value2",
    "ru": "value2",
    "pt": "value2",
    "nl": "value2",
    "fr": "value2",
    "it": "value2",
    "es": "value2",
    "pl": "value2",
    "zh-cn": "value2"
};
Blockly.Words['ifttt_value3'] = {    
    "en": "value3",
    "de": "value3",
    "ru": "value3",
    "pt": "value3",
    "nl": "value3",
    "fr": "value3",
    "it": "value3",
    "es": "value3",
    "pl": "value3",
    "zh-cn": "value3"
};
Blockly.Words['ifttt_tooltip'] = {
    "en": "Send to IFTTT",
    "de": "Sende zu IFTTT",
    "ru": "Послать в IFTTT",
    "pt": "Mande para o IFTTT",
    "nl": "Verzenden naar IFTTT",
    "fr": "Envoyer à IFTTT",
    "it": "Invia a IFTTT",
    "es": "Enviar a IFTTT",
    "pl": "Wyślij do IFTTT",
    "zh-cn": "发送到IFTTT"
};
Blockly.Words['ifttt_help'] = {
    "en": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "de": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "ru": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "pt": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "nl": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "fr": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "it": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "es": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "pl": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md",
    "zh-cn": "https://github.com/ioBroker/ioBroker.iot/blob/master/doc/ifttt.md"
};

Blockly.Words['ifttt_log'] = {
    "en": "log level",
    "de": "Loglevel",
    "ru": "Протокол",
    "pt": "nível de log",
    "nl": "Log niveau",
    "fr": "niveau de journalisation",
    "it": "livello di registro",
    "es": "nivel de registro",
    "pl": "poziom dziennika",
    "zh-cn": "日志级别"
};
Blockly.Words['ifttt_log_none'] = {
    "en": "none",
    "de": "keins",
    "ru": "нет",
    "pt": "nenhum",
    "nl": "geen",
    "fr": "aucun",
    "it": "nessuna",
    "es": "ninguna",
    "pl": "Żaden",
    "zh-cn": "没有"
};
Blockly.Words['ifttt_log_info'] = {
    "en": "info",
    "de": "info",
    "ru": "инфо",
    "pt": "informação",
    "nl": "info",
    "fr": "Info",
    "it": "Informazioni",
    "es": "informacion",
    "pl": "informacje",
    "zh-cn": "信息"
};
Blockly.Words['ifttt_log_debug'] = {
    "en": "debug",
    "de": "debuggen",
    "ru": "отлаживать",
    "pt": "depurar",
    "nl": "debug",
    "fr": "déboguer",
    "it": "mettere a punto",
    "es": "depurar",
    "pl": "odpluskwić",
    "zh-cn": "调试"
};
Blockly.Words['ifttt_log_warn'] = {
    "en": "warning",
    "de": "warning",
    "ru": "предупреждение",
    "pt": "alerta",
    "nl": "waarschuwing",
    "fr": "attention",
    "it": "avvertimento",
    "es": "advertencia",
    "pl": "ostrzeżenie",
    "zh-cn": "警告"
};
Blockly.Words['ifttt_log_error'] = {
    "en": "error",
    "de": "error",
    "ru": "ошибка",
    "pt": "erro",
    "nl": "fout",
    "fr": "erreur",
    "it": "errore",
    "es": "error",
    "pl": "błąd",
    "zh-cn": "错误"
};


// this is copy of engines.js
// Blockly.Sendto is global variable and defined in javascript/admin/google-blockly/own/blocks_sendto.js

Blockly.Sendto.blocks['ifttt_iot'] =
    '<block type="ifttt_iot">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="EVENT">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">state</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="VALUE1">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">value1</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="VALUE2">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">value2</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="VALUE3">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">value3</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['ifttt_iot'] = {
    init: function() {
        var options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (var i = 0; i < main.instances.length; i++) {
                var m = main.instances[i].match(/^system.adapter.iot.(\d+)$/);
                if (m) {
                    var n = parseInt(m[1], 10);
                    options.push(['iot.' + n, '.' + n]);
                }
            }
            if (!options.length) {
                for (var k = 0; k <= 4; k++) {
                    options.push(['iot.' + k, '.' + k]);
                }
            }
        } else {
            for (var u = 0; u <= 4; u++) {
                options.push(['iot.' + u, '.' + u]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Words['ifttt_iot'][systemLang])
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('EVENT')
            .appendField(Blockly.Words['ifttt_event'][systemLang]);

        var input = this.appendValueInput('VALUE1')
            .appendField(Blockly.Words['ifttt_value1'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput('VALUE2')
            .appendField(Blockly.Words['ifttt_value2'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput('VALUE3')
            .appendField(Blockly.Words['ifttt_value3'][systemLang]);
        if (input.connection) input.connection._optional = true;

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['ifttt_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['ifttt_log_none'][systemLang],  ''],
                [Blockly.Words['ifttt_log_info'][systemLang],  'log'],
                [Blockly.Words['ifttt_log_debug'][systemLang], 'debug'],
                [Blockly.Words['ifttt_log_warn'][systemLang],  'warn'],
                [Blockly.Words['ifttt_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Words['ifttt_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['ifttt_help'][systemLang]);
    }
};

Blockly.JavaScript['ifttt_iot'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var event = Blockly.JavaScript.valueToCode(block, 'EVENT', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');
    var value1  = Blockly.JavaScript.valueToCode(block, 'VALUE1', Blockly.JavaScript.ORDER_ATOMIC);
    var value2  = Blockly.JavaScript.valueToCode(block, 'VALUE2', Blockly.JavaScript.ORDER_ATOMIC);
    var value3  = Blockly.JavaScript.valueToCode(block, 'VALUE3', Blockly.JavaScript.ORDER_ATOMIC);

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("ifttt_iot: " + ' + event + ');\n';
    } else {
        logText = '';
    }

    return 'sendTo("iot' + dropdown_instance + '", "ifttt", {event: ' + event  + ', value1: ' + value1 + ', value2: ' + value2 + ', value3: ' + value3 + '});\n' +
        logText;
};
