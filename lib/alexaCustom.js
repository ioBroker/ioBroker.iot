'use strict';

function AlexaCustom(adapter) {
    var lang          = 'de';

    function writeResponse(channelId, stateId, command, value) {
        //adapter.log.warn('Unknown applianceId: ' + deviceId);
    }

    function getResponse(text) {
        return {
            "version": "1.0",
            "response": {
                "outputSpeech": {
                    "type": "PlainText",
                    "text": text
                },
                "card": {
                    "content": text,
                    "title": "Response",
                    "type": "Simple"
                },
                /*"reprompt": {
                    "outputSpeech": {
                        "type": "PlainText",
                        "text": "Welcome to the Alexa Skills Kit, you can say hello"
                    }
                },*/
                "speechletResponse": {
                    "outputSpeech": {
                        "text": text
                    },
                    "card": {
                        "title": "Response",
                        "content": text
                    },
                    /*"reprompt": {
                        "outputSpeech": {
                            "text": text
                        }
                    },*/
                    "shouldEndSession": false
                }
            },
            "sessionAttributes": {}
        };
    }

    this.setLanguage = function (_lang) {
        lang = _lang || 'de';
    };

    // var example = {
    //     "session": {
    //         "sessionId": "SessionId.74267f5d-3b58-45646-bdc7-4645645",
    //         "application": {
    //             "applicationId": "amzn1.ask.skill.6cee68cd-4356-456-9d53-45646456"
    //         },
    //         "attributes": {},
    //         "user": {
    //             "userId": "amzn1.ask.account.asdasdasdas"
    //         },
    //         "new": true
    //     },
    //     "request": {
    //         "type": "IntentRequest",
    //         "requestId": "EdwRequestId.b785ca9f-6ba9-45645-a667-4645646",
    //         "locale": "de-DE",
    //         "timestamp": "2017-07-25T15:30:51Z",
    //         "intent": {
    //             "name": "controlDevice",
    //             "slots": {
    //                 "Command": {
    //                     "name": "Command",
    //                     "value": "an"
    //                 },
    //                 "Device": {
    //                     "name": "Device"
    //                 },
    //                 "Article": {
    //                     "name": "Article"
    //                 },
    //                 "Value": {
    //                     "name": "Value"
    //                 },
    //                 "Place": {
    //                     "name": "Place",
    //                     "value": "licht"
    //                 }
    //             }
    //         }
    //     },
    //     "version": "1.0"
    // }
    this.process = function (request, isEnabled, callback) {
        if (!request || !request.request || !request.request.intent) {
            adapter.log.error('Invalid request: no intent!');
            return;
        }

        if (!isEnabled) {
            if (lang === 'en') {
                callback(getResponse('Service deactivated'));
            } else if (lang === 'ru') {
                callback(getResponse('Сервис отключен'));
            } else {
                callback(getResponse('Service deaktiviert'));
            }

            return;
        }

        var text = [];
        // combine all intents together
        if (request.request.intent.name === 'controlDevice') {
            text.push('turn schalte');
        } else
        if (request.request.intent.name === 'getTemperature') {
            text.push('turn schalte');
        } else
        if (request.request.intent.name === 'setTemperature') {
            text.push('turn schalte');
        }
        for (var slot in request.request.intent.slots) {
            if (request.request.intent.slots.hasOwnProperty(slot) &&  request.request.intent.slots[slot].value !== undefined) {
                text.push(request.request.intent.slots[slot].value);
            }
        }

        adapter.sendTo('text2command.' + adapter.config.text2command, text.join(' '), function (result) {
            callback(getResponse(result));
        });
    };
}

module.exports = AlexaCustom;