'use strict';

function AlexaCustom(adapter) {
    let lang          = 'de';

    function writeResponse(channelId, stateId, command, value) {
        //adapter.log.warn('Unknown applianceId: ' + deviceId);
    }

    function getResponse(text, shouldEndSession) {
        return {
            version: '1.0',
            sessionAttributes: {},
            response: {
                outputSpeech: {
                    type: 'PlainText',
                    text: text
                },
                card: {
                    content: text,
                    title: 'Antwort von ioBroker',
                    type: 'Simple'
                },
                shouldEndSession: shouldEndSession || false
            }
        };
    }

    this.setLanguage = function (_lang) {
        lang = _lang || 'de';
    };

    // let example = {
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
        if (!request || !request.request) {
            adapter.log.error('Invalid request: no intent!');
            return;
        }

        if (!isEnabled) {
            if (lang === 'en') {
                callback(getResponse('Service deactivated', true));
            } else if (lang === 'ru') {
                callback(getResponse('Сервис отключен', true));
            } else {
                callback(getResponse('Service ist deaktiviert', true));
            }

            return;
        }

        if (request.request.type === 'LaunchRequest') {
            adapter.log.debug(`LaunchRequest`);
            callback(getResponse('Hallo, was wollen Sie wissen?'));
        } else if (request.request.type === 'IntentRequest') {

            let slots = Object.keys(request.request.intent.slots);
            let texts = [];
            slots.forEach(slot => texts.push(`${slot} = ${request.request.intent.slots[slot].value}`));

            adapter.log.debug(`${request.request.intent.name}: ${texts.join(', ')}`);

            if (request.request.intent.name === 'systemStatus') {
                if (!request.request.intent.slots.device.value) {
                    callback(getResponse('Es ist nicht klar was zu machen.'));
                } else if (!request.request.intent.slots.place.value) {
                    callback(getResponse('Bitte sagen Sie wo?'));
                } else {
                    callback(getResponse(`${request.request.intent.slots.place.value} in ${request.request.intent.slots.place.value} ist 15 grad`));
                }
            } else {
                callback(getResponse('Es ist mir nicht klar was gefragt ist'));
            }
        } if (request.request.type === 'SessionEndedRequest') {
            adapter.log.debug(`SessionEndedRequest: ${request.request.reason}`);
            // Should not be called
            callback();
        }
    };
}

module.exports = AlexaCustom;