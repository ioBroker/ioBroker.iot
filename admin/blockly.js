'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

// --- ifttt --------------------------------------------------
Blockly.Words['ifttt']               = {'en': 'Send text to IFTTT',          'de': 'Sende Text zu IFTTT',                'ru': 'Послать текст в IFTTT'};
Blockly.Words['ifttt_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['ifttt_tooltip']       = {'en': 'Send to IFTTT',               'de': 'Sende zu IFTTT',                     'ru': 'Послать в IFTTT'};
Blockly.Words['ifttt_help']          = {'en': 'https://github.com/ioBroker/ioBroker.cloud/blob/master/README.md', 'de': 'http://www.iobroker.net/?page_id=178&lang=de', 'ru': 'http://www.iobroker.net/?page_id=4262&lang=ru'};

Blockly.Words['ifttt_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['ifttt_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['ifttt_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['ifttt_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['ifttt_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['ifttt_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};


// this is copy of engines.js
// Blockly.Sendto is global variable and defined in javascript/admin/google-blockly/own/blocks_sendto.js

Blockly.Sendto.blocks['ifttt'] =
    '<block type="ifttt">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['ifttt'] = {
    init: function() {
        var options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (var i = 0; i < main.instances.length; i++) {
                var m = main.instances[i].match(/^system.adapter.cloud.(\d+)$/);
                if (m) {
                    var n = parseInt(m[1], 10);
                    options.push(['cloud.' + n, '.' + n]);
                }
            }
        } else {
            for (var u = 0; u <= 4; u++) {
                options.push(['cloud.' + u, '.' + u]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Words['ifttt'][systemLang])
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Words['ifttt_message'][systemLang]);

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

Blockly.JavaScript['ifttt'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("ifttt: " + ' + value_message + ');\n'
    } else {
        logText = '';
    }

    return 'sendTo("cloud' + dropdown_instance + '", "ifttt", ' + value_message  + ');\n' +
        logText;
};
