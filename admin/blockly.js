'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');

    goog.require('Blockly.JavaScript');
}

Blockly.Translate = Blockly.Translate || function (word, lang) {
    lang = lang || systemLang;
    if (Blockly.Words && Blockly.Words[word]) {
        return Blockly.Words[word][lang] || Blockly.Words[word].en;
    } else {
        return word;
    }
};

// --- ifttt --------------------------------------------------
Blockly.Words['ifttt_iot']           = {"en": "Send text to IFTTT via iot",                              "de": "Sende Text zu IFTTT über iot",                             "ru": "Послать текст в IFTTT через iot",                           "pt": "Enviar texto para IFTTT(iot)",                         "nl": "Tekst verzenden naar IFTTT(iot)",                      "fr": "Envoyer un texte à IFTTT(iot)",                        "it": "Inviare messaggi di testo di IFTTT(iot)",              "es": "Enviar texto a IFTTT(iot)",                            "pl": "Wysłać tekst z iftt(iot)",                             "zh-cn": "发短到过(iot)"};
Blockly.Words['ifttt_event']         = {"en": "event",                                           "de": "event",                                           "ru": "событие",                                         "pt": "eventos",                                         "nl": "gebeurtenis",                                     "fr": "l'événement",                                     "it": "evento",                                          "es": "evento",                                          "pl": "wydarzenie",                                      "zh-cn": "事件"};
Blockly.Words['ifttt_value1']        = {"en": "value 1",                                         "de": "Wert 1",                                          "ru": "значение 1",                                     "pt": "valor 1",                                         "nl": "waarde 1",                                        "fr": "la valeur 1",                                     "it": "valore 1",                                        "es": "valor 1",                                         "pl": "wartość 1",                                          "zh-cn": "值1"};
Blockly.Words['ifttt_value2']        = {"en": "value 2",                                         "de": "Wert 2",                                          "ru": "значение 2",                                     "pt": "valor 2",                                         "nl": "waarde 2",                                        "fr": "la valeur 2",                                     "it": "valore 2",                                        "es": "valor 2",                                         "pl": "wartość 2",                                          "zh-cn": "值2"};
Blockly.Words['ifttt_value3']        = {"en": "value 3",                                         "de": "Wert 3",                                          "ru": "значение 3",                                      "pt": "valor 3",                                         "nl": "waarde 3",                                        "fr": "la valeur 3",                                     "it": "valore 3",                                        "es": "valor 3",                                         "pl": "wartość 3",                                       "zh-cn": "值3"};
Blockly.Words['ifttt_tooltip']       = {"en": "Send to IFTTT",                                   "de": "Senden IFTTT",                                    "ru": "Отправить с iftt",                                "pt": "Enviar para IFTTT",                               "nl": "Verzenden naar IFTTT",                            "fr": "Envoyer à IFTTT",                                 "it": "Invia a IFTTT",                                   "es": "Enviar a IFTTT",                                  "pl": "Wysłać z iftt",                                   "zh-cn": "送过来"};
Blockly.Words['ifttt_help']          = {"en": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md", "de": "http://www.iobroker.net/?page_id=178&lang=de", "ru": "http://www.iobroker.net/?page_id=4262&lang=ru", "pt": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md", "nl": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md", "fr": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md", "it": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md", "es": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md", "pl": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md", "zh-cn": "https://github.com/ioBroker/ioBroker.iot/blob/master/README.md"};

Blockly.Words['ifttt_log']           = {"en": "log level",                                       "de": "log-level",                                       "ru": "уровень журнала ",                                "pt": "o nível de log de",                               "nl": "log-niveau",                                      "fr": "le niveau de journal",                            "it": "il livello di log",                               "es": "nivel de registro",                               "pl": "poziom dziennika ",                               "zh-cn": "日志的水平"};
Blockly.Words['ifttt_log_none']      = {"en": "none",                                            "de": "keiner",                                          "ru": "нет",                                             "pt": "nenhum",                                          "nl": "geen",                                            "fr": "aucun",                                           "it": "nessuno",                                         "es": "ninguno",                                         "pl": "nikt",                                            "zh-cn": "没有"};
Blockly.Words['ifttt_log_info']      = {"en": "info",                                            "de": "info",                                            "ru": "инфо",                                            "pt": "informações",                                     "nl": "info",                                            "fr": "info",                                            "it": "info",                                            "es": "info",                                            "pl": "informacje",                                      "zh-cn": "的信息"};
Blockly.Words['ifttt_log_debug']     = {"en": "debug",                                           "de": "debug",                                           "ru": "отлаживать",                                      "pt": "depurar",                                         "nl": "debug",                                           "fr": "debug",                                           "it": "debug",                                           "es": "depurar",                                         "pl": "debugować",                                       "zh-cn": "调试"};
Blockly.Words['ifttt_log_warn']      = {"en": "warning",                                         "de": "Warnung",                                         "ru": "предупреждение",                                  "pt": "aviso",                                           "nl": "waarschuwing",                                    "fr": "avertissement",                                   "it": "avviso",                                          "es": "advertencia",                                     "pl": "ostrzeżenie",                                     "zh-cn": "警告"};
Blockly.Words['ifttt_log_error']     = {"en": "error",                                           "de": "Fehler",                                          "ru": "ошибка",                                          "pt": "erro",                                            "nl": "fout",                                            "fr": "erreur",                                          "it": "errore",                                          "es": "error",                                           "pl": "błąd",                                            "zh-cn": "错误"};


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
        }

        if (!options.length) {
            for (var k = 0; k <= 4; k++) {
                options.push(['iot.' + k, '.' + k]);
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
    var event    = Blockly.JavaScript.valueToCode(block, 'EVENT', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');
    var value1   = Blockly.JavaScript.valueToCode(block, 'VALUE1', Blockly.JavaScript.ORDER_ATOMIC);
    var value2   = Blockly.JavaScript.valueToCode(block, 'VALUE2', Blockly.JavaScript.ORDER_ATOMIC);
    var value3   = Blockly.JavaScript.valueToCode(block, 'VALUE3', Blockly.JavaScript.ORDER_ATOMIC);

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("ifttt_iot: " + ' + event + ');\n'
    } else {
        logText = '';
    }

    return 'sendTo("iot' + dropdown_instance + '", "ifttt", {event: ' + event  + ', value1: ' + value1 + ', value2: ' + value2 + ', value3: ' + value3 + '});\n' +
        logText;
};
