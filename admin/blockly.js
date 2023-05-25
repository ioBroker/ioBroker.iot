'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

// --- ifttt --------------------------------------------------
Blockly.Words['ifttt_iot']           = {'en': 'Send text to IFTTT via iot',  'de': 'Sende Text zu IFTTT über iot',       'ru': 'Послать текст в IFTTT через iot'};
Blockly.Words['ifttt_event']         = {'en': 'event',                       'de': 'event',                              'ru': 'event'};
Blockly.Words['ifttt_value1']        = {'en': 'value1',                      'de': 'value1',                             'ru': 'value1'};
Blockly.Words['ifttt_value2']        = {'en': 'value2',                      'de': 'value2',                             'ru': 'value2'};
Blockly.Words['ifttt_value3']        = {'en': 'value3',                      'de': 'value3',                             'ru': 'value3'};
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
            .appendField(Blockly.Translate('ifttt_iot'))
                .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('EVENT')
            .appendField(Blockly.Translate('ifttt_event'));

        var input = this.appendValueInput('VALUE1')
            .appendField(Blockly.Translate('ifttt_value1'));
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput('VALUE2')
            .appendField(Blockly.Translate('ifttt_value2'));
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput('VALUE3')
            .appendField(Blockly.Translate('ifttt_value3'));
        if (input.connection) input.connection._optional = true;

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('ifttt_log'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('ifttt_log_none'),  ''],
                [Blockly.Translate('ifttt_log_info'),  'log'],
                [Blockly.Translate('ifttt_log_debug'), 'debug'],
                [Blockly.Translate('ifttt_log_warn'),  'warn'],
                [Blockly.Translate('ifttt_log_error'), 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('ifttt_tooltip'));
        this.setHelpUrl(Blockly.Translate('ifttt_help'));
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
        logText = 'console.' + logLevel + '("ifttt_iot: " + ' + event + ');\n'
    } else {
        logText = '';
    }

    return 'sendTo("iot' + dropdown_instance + '", "ifttt", {event: ' + event  + ', value1: ' + value1 + ', value2: ' + value2 + ', value3: ' + value3 + '});\n' +
        logText;
};

// --- app --------------------------------------------------
Blockly.Words['app_iot']      = {
    "en": "Send to ioBroker.visu",
    "de": "Zu ioBroker.visu senden",
    "ru": "Отправить на ioBroker.visu",
    "pt": "Enviar para ioBroker.visu",
    "nl": "Stuur naar ioBroker.visu",
    "fr": "Envoyer à ioBroker.visu",
    "it": "Invia a ioBroker.visu",
    "es": "Enviar a ioBroker.visu",
    "pl": "Wykaz gatunków ioBroker.visu",
    "uk": "ioBroker.visu",
    "zh-cn": "Sendto ioBroker.visu"
};
Blockly.Words['app_message']  = {
    "en": "Message",
    "de": "Nachricht",
    "ru": "Сообщение",
    "pt": "Mensagem",
    "nl": "Bericht",
    "fr": "Message",
    "it": "Messaggio",
    "es": "Mensaje",
    "pl": "Message",
    "uk": "Новини",
    "zh-cn": "导 言"
};
Blockly.Words['app_title']    = {
    "en": "Title",
    "de": "Titel",
    "ru": "Заголовок",
    "pt": "Título",
    "nl": "Titel",
    "fr": "Titre",
    "it": "Titolo",
    "es": "Título",
    "pl": "Title",
    "uk": "Головна",
    "zh-cn": "标题"
};
Blockly.Words['app_priority'] = {
    "en": "Priority",
    "de": "Priorität",
    "ru": "Приоритет",
    "pt": "Prioridade",
    "nl": "Prioriteit",
    "fr": "Priorité",
    "it": "Priorità",
    "es": "Prioridad",
    "pl": "Priorytet",
    "uk": "Головна",
    "zh-cn": "优先重点"
};
Blockly.Words['app_expire']   = {
    "en": "Expire (seconds)",
    "de": "Expire (Sekunden)",
    "ru": "Истекать (в секундах)",
    "pt": "Expira (segundos)",
    "nl": "Verdwijn",
    "fr": "Expire (secondes)",
    "it": "Scadenza (secondi)",
    "es": "Expire (segundos)",
    "pl": "Expire (ang.)",
    "uk": "Закінчується (секунди)",
    "zh-cn": "录(二)"
};
Blockly.Words['app_tooltip']       = {'en': 'Send message to ioBroker.visu app',               'de': 'Sende zu ioBroker.visu app',                     'ru': 'Послать в ioBroker.visu приложение'};

Blockly.Words['app_help'] = {'en': 'https://github.com/ioBroker/ioBroker.cloud/blob/master/README.md#send_messages_to_app'};

Blockly.Sendto.blocks['app_iot'] =
    '<block type="app_iot">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">message</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="TITLE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">ioBroker</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="EXPIRE">'
    + '         <shadow type="math_number">'
    + '             <field name="NUM">3600</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="PRIORITY">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['app_iot'] = {
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
            .appendField(Blockly.Translate('app_iot'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Translate('app_message'));

        var input = this.appendValueInput('TITLE')
            .appendField(Blockly.Translate('app_title'));
        if (input.connection) {
            input.connection._optional = true;
        }


        input = this.appendValueInput('EXPIRE')
            .setCheck('Number')
            .appendField(Blockly.Translate('app_expire'));
        if (input.connection) {
            input.connection._optional = true;
        }

        this.appendDummyInput('PRIORITY_INPUT')
            .appendField(Blockly.Translate('app_priority'))
            .appendField(new Blockly.FieldCheckbox(), 'PRIORITY');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('app_tooltip'));
        this.setHelpUrl(Blockly.Translate('app_help'));
    }
};

Blockly.JavaScript['app_iot'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var title  = Blockly.JavaScript.valueToCode(block, 'TITLE', Blockly.JavaScript.ORDER_ATOMIC);
    var expire  = Blockly.JavaScript.valueToCode(block, 'EXPIRE', Blockly.JavaScript.ORDER_ATOMIC);
    var priority  = Blockly.JavaScript.valueToCode(block, 'PRIORITY', Blockly.JavaScript.ORDER_ATOMIC);
    priority = priority === true || priority === 'true' || priority === 'TRUE';

    return 'setState("iot' + dropdown_instance + '.app.message", JSON.stringify({message: ' + message  + ', title: ' + title + ', expire: ' + expire + ', priority: ' + (priority ? '"high"' : '"normal"') + '}));\n';
};
