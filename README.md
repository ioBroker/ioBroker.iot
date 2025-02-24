![Logo](admin/iot.png)

# ioBroker IoT Adapter

![Number of Installations](http://iobroker.live/badges/iot-installed.svg)
![Number of Installations](http://iobroker.live/badges/iot-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.iot.svg)](https://www.npmjs.com/package/iobroker.iot)

![Test and Release](https://github.com/ioBroker/ioBroker.iot/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/iot/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.iot.svg)](https://www.npmjs.com/package/iobroker.iot)

This adapter is ONLY for communication with Amazon Alexa, Google Home and Nightscout.
It is not for remote access to your ioBroker instance. Use ioBroker.cloud adapter for that.

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## Settings

To use the iot adapter, you should first register on the ioBroker cloud [https://iobroker.pro](https://iobroker.pro).

[Reference to google API type settings](https://developers.google.com/actions/smarthome/guides/)

![Intro](img/intro.png)

### Language

If you select "default" language, the smart names of devices and of enumerations will not be translated. If some language is specified, all known names will be translated into this language.
It is done to switch fast between many languages for demonstration purposes.

### Place function in names first

Change the order of function and roles in self-generated names:

-   if false: "Room function", e.g. "Living room dimmer"
-   if true: "Function room", e.g. "Dimmer living room"

### Concatenate words with

You can define the word which will be placed between function and room. E.g. "in" and from "Dimmer living room" will be "Dimmer in living room".

But it is not suggested doing so, because recognition engine must analyze one more word, and it can lead to misunderstandings.

### OFF level for switches

Some groups consist of mixed devices: dimmers and switches. It is allowed to control them with "ON" and "OFF" commands and with percents.
If command is `Set to 30%` and the `OFF level is 30%` so the switches will be turned on. By command "Set to 25%" all switches will be turned OFF.

Additionally, if the command is "OFF", so the adapter will remember the current dimmer level if the actual value is over or equal to the "30%".
Later when the new "ON" command comes, the adapter will switch the dimmer not to 100% but to the level in memory.

Example:

-   Assume, that _OFF level_ is 30%.
-   Virtual device "Light" has two physical devices: _switch_ and _dimmer_.
-   Command: "set the light to 40%". The adapter will remember this value for _dimmer_, will set it for "dimmer" and will turn the _switch_ ON.
-   Command: "turn the light off". The adapter will set the _dimmer_ to 0% and will turn off the _switch_.
-   Command: "turn on the light". _dimmer_ => 40%, _switch_ => ON.
-   Command: "set the light to 20%". _dimmer_ => 20%, _switch_ => OFF. The value for dimmer will not be remembered, because it is bellow _OFF level_.
-   Command: "turn on the light". _dimmer_ => 40%, _switch_ => ON.

### by ON

You can select the behavior of ON command will come for the number state. The specific value can be selected, or the last non-zero value will be used.

### Write response to

For every command, the text response will be generated. You can define here the Object ID, where this text must be written to. E.g. _sayit.0.tts.text_.

### Colors

The channel needs 3-5 states with the following roles:

-   `level.color.saturation` - required for detection of the channel,
-   `level.color.hue`,
-   `level.dimmer`,
-   `switch` - optional,
-   `level.color.temperature` (optional)

```
Alexa, set the "device name" to "color"
Alexa, turn the light fuchsia
Alexa, set the bedroom light to red
Alexa, change the kitchen to the color chocolate
```

### Lock

To have the possibility to lock the locks, the state must have the role `switch.lock` and have `native.LOCK_VALUE` to determine the lock state.
If you need a separate Value to control the Lock, you can use `native.CONTROL VALUE`.

```
Alexa, is "lock name" locked/unlocked
Alexa, lock the "lock name"
```

## How names will be generated

The adapter tries to generate virtual devices for smart home control (e.g., Amazon Alexa or Google Home).

There are two important enumerations for that: rooms and functions.

Rooms are like: living room, bathroom, sleeping room.
Functions are like: light, blind, heating.

The following conditions must be met to get the state in the automatically generated list:

-   the state must be in some "function" enumeration.
-   the state must have a role ("state", "switch" or "level.\*", e.g., level.dimmer) if not directly included in "functions".
    It can be that the channel is in the "functions", but state itself not.
-   the state must be writable: `common.write` = true
-   the state dimmer must have `common.type` as 'number'
-   the state heating must have `common.unit` as '°C', '°F' or '°K' and `common.type` as `number`

If the state is only in "functions" and not in any "room", the name of state will be used.

The state names will be generated from function and room. E.g., all _lights_ in the _living room_ will be collected in the virtual device _living room light_.
The user cannot change this name, because it is generated automatically.
But if the enumeration name changes, this name will be changed too. (e.g., function "light" changed to "lights", so the _living room light_ will be changed to _living room lights_)

All the rules will be ignored if the state has common.smartName. In this case, just the smart name will be used.

if `common.smartName` is `false`, the state or enumeration will not be included in the list generation.

The configuration dialog lets the comfortable remove and add the single states to virtual groups or as single device.
![Configuration](img/configuration.png)

If the group has only one state, it can be renamed, as for this the state's smartName will be used.
If the group has more than one state, the group must be renamed via the enumeration's names.

To create own groups, the user can install "scenes" adapter or create "script" in JavaScript adapter.

### Replaces

You can specify strings that could be automatically replaced in the device names. E.g., if you set replaces to:
`.STATE,.LEVEL`, so all `.STATE` and `.LEVEL` will be deleted from names. Be careful with spaces.
If you set `.STATE, .LEVEL`, so `.STATE` and `.LEVEL` will be replaced and not `.LEVEL`.

## Helper states

-   `smart.lastObjectID`: This state will be set if only one device was controlled by home skill (alexa, google home).
-   `smart.lastFunction`: Function name (if exists) for which last command was executed.
-   `smart.lastRoom`: Room name (if exists) for which last command was executed.
-   `smart.lastCommand`: Last executed command. Command can be: `true(ON)`, `false(OFF)`, `number(%)`, `-X(decrease at x)`, `+X(increase at X)`
-   `smart.lastResponse`: Textual response on command. It can be sent to some `text2speech` (`sayit`) engine.

## Toggle mode

Alexa v3 supports toggle mode.
It means that if you say "Alexa, turn on the light" and the light is already on, it will be turned off.

## IFTTT

[instructions](doc/ifttt.md)

## Google Home

If you see the following error message in the log: `[GHOME] Invalid URL Pro key. Status auto-update is disabled you can set states but receive states only manually`.
So you must generate the URL-Key anew:

![Url key](img/url_key.png)

## Services

There is a possibility to send messages to cloud adapter.
If you call `[POST]https://service.iobroker.in/v1/iotService?service=custom_<NAME>&key=<XXX>&user=<USER_EMAIL>` und value as payload.

`curl --data "myString" https://service.iobroker.in/v1/iotService?service=custom_<NAME>&key=<XXX>&user=<USER_EMAIL>`

or

`[GET]https://service.iobroker.in/v1/iotService?service=custom_<NAME>&key=<XXX>&user=<USER_EMAIL>&data=myString`

If you set in the settings the field teh "White list for services" the name `custom_test`, and call with "custom_test" as the service name, the state **cloud.0.services.custom_test** will be set to _myString_.

You may write "\*" in the white list and all services will be allowed.

Here you can find instructions on how to use it with [tasker](doc/tasker.md).

IFTTT service is allowed only if an IFTTT key is set.

Reserved names are `ifttt`, `text2command`, `simpleApi`, `swagger`. These must be used without the `custom_` prefix.

You can ask by message the valid URL for service too:

```js
sendTo('iot.0', 'getServiceEndpoint', { serviceName: 'custom_myService' }, result =>
    console.log(JSON.stringify(result)),
);
// Output: {"result":
//  {"url": "https://service.iobroker.in/v1/iotService?key=xxx&user=uuu&service=custom_myService",
//   "stateID":"iot.0.services.myService",
//   "warning":"Service name is not in white list"
//  }}
```

### `text2command`

You may write `text2command` in white list, you can send POST request to `https://service.iobroker.in/v1/iotService?service=text2command&key=<user-app-key>&user=<USER_EMAIL>` to write data into _text2command.X.text_ variable.

You can use GET method too `https://service.iobroker.in/v1/iotService?service=text2command&key=<user-app-key>&user=<USER_EMAIL>&data=<MY COMMAND>`

`X` can be defined in settings by the "Use text2command instance" option.

## Custom skill

The answers for the custom skill can be processed in two ways:

-   `text2command`
-   `javascript`

### `text2command`

if `text2command` instance is defined in the configuration dialog, so the question will be sent to the instance.

`text2command` must be configured that the expected phrase will be parsed and the answer will be given back.

### `Javascript`

There is a possibility to process the question directly with the script. It is activated by default if no `text2command` instance is selected.

If `text2command` instance is defined, so this instance must provide the answer and the answer from _script_ will be ignored.

The adapter will provide the details in two states with different detail level

-   `smart.lastCommand` contains the received text including info about the type of query (intent). Example: `askDevice Status Rasenmäher`
-   `smart.lastCommandObj` contains an JSON string that can be parsed to an object containing the following information
    -   `words` contain the received words in an array
    -   `intent` contains the type of query. Possible values currently are:
        -   v1 Skill: `askDevice`, `controlDevice`, `actionStart`, `actionEnd`, `askWhen`, `askWhere`, `askWho`
        -   v2 Skill: `queryIntent` when the full said text was captured, `controlDevice` for fallback with only partial text
    -   `deviceId` contains a deviceId identifying the device the request was sent to, delivered by Amazon, will be empty string if not provided
    -   `deviceRoom` contains a mapped room identifier you can configure in iot admin UI for collected deviceIds
    -   `sessionId` contains a sessionId of the Skill session, should be the same if multiple commands were spoken, delivered by Amazon, will be empty string if not provided
    -   `userId` contains a userId from the device owner (or maybe later the user that was interacting with the skill), delivered by Amazon, will be empty string if not provided
    -   `userName` contains a mapped username you can configure in iot admin UI for collected userIds

More details on how the words are detected and what type of queries the Alexa Custom Skill differentiates, please check https://forum.iobroker.net/viewtopic.php?f=37&t=17452 .

**Return result via smart.lastResponse state**

The response needs to be sent within 200ms in the state `smart.lastResponse`, and can be a simple text string or a JSON object.
If it is a text string, then this text will be sent as a response to the skill.
If the text is a JSON object, then the following keys can be used:

-   `responseText` needs to contain the text to return to Amazon
-   `shouldEndSession` is a boolean and controls if the session is closed after the response was spoken or stays open to accept another voice input.
-   `sessionId` needs to contain the sessionId the response is meant for. Ideally, provide it to allow concurrent sessions. If not provided, the first session that expects a response is assumed.

**Return result via the message to iot instance**

The iot instance also accepts a message with the name "alexaCustomResponse" containing the key "response" with an object that can contain the keys `responseText` and `shouldEndSession` and `sessionId` as described above.
There will be no response from the iot instance to the message!

**Example of a script that uses texts**

```js
// important, that ack=true
on({ id: 'iot.0.smart.lastCommand', ack: true, change: 'any' }, obj => {
    // you have 200ms to prepare the answer and to write it into iot.X.smart.lastResponse
    setState('iot.0.smart.lastResponse', 'Received phrase is: ' + obj.state.val); // important, that ack=false (default)
});
```

**Example of a script that uses JSON objects**

```js
// important, that ack=true
on({ id: 'iot.0.smart.lastCommandObj', ack: true, change: 'any' }, obj => {
    // you have 200ms to prepare the answer and to write it into iot.X.smart.lastResponse
    const request = JSON.parse(obj.state.val);
    const response = {
        responseText: 'Received phrase is: ' + request.words.join(' ') + '. Bye',
        shouldEndSession: true,
        sessionId: request.sessionId,
    };

    // Return response via state
    setState('iot.0.smart.lastResponse', JSON.stringify(response)); // important, that ack=false (default)

    // or alternatively return as message
    sendTo('iot.0', 'alexaCustomResponse', response);
});
```

### Private cloud

If you use private skill/action/навык for communication with `Alexa/Google Home/Алиса` so you have the possibility to use IoT instance to process the requests from it.

E.g. for `yandex alice`:

```js
const OBJECT_FROM_ALISA_SERVICE = {}; // object from alisa service or empty object
OBJECT_FROM_ALISA_SERVICE.alisa = '/path/v1.0/user/devices'; // called URL, 'path' could be any text, but it must be there
sendTo('iot.0', 'private', { type: 'alisa', request: OBJECT_FROM_ALISA_SERVICE }, response => {
    // Send this response back to alisa service
    console.log(JSON.stringify(response));
});
```

The following types are supported:

-   `alexa` - acting with Amazon Alexa or Amazon Custom Skill
-   `ghome` - acting with Google Actions via Google Home
-   `alisa` - acting with Yandex Алиса
-   `ifttt` - acting like IFTTT (actually not required, but for tests purposes)

## Yandex Алиса

[instructions](doc/alisa.md)

## Send messages to app

From version 1.15.x you can send messages to `ioBroker.visu` application (Android and iOS).
For that, you need to write the following states:

```
setState('iot.0.app.expire', 60); // optional. Time in seconds
setState('iot.0.app.priority', 'normal'); // optional. Priority: 'high' or 'normal'
setState('iot.0.app.title', 'ioBroker'); // optional. Default "ioBroker"
setState('iot.0.app.message', 'Message text'); // important, that ack=false (default)

// or just one state
// only is message is mandatory. All other are optional
setState('iot.0.app.message', JSON.stringify({
  message: 'Message text',
  title: 'ioBroker',
  expire: 60,
  priority: 'normal'
})); // important, that ack=false (default)
```

## Todo

-   Smart names must have higher priority as groups
-   Devices should be grouped by smart name

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

## Changelog
### 3.5.0 (2025-02-24)
-   (@foxriver76) added notification manager support (notifications will be sent as push notifications to the Visu App)

### 3.4.5 (2024-12-29)

-   (@GermanBluefox) Checked the max length of discovered devices for Alexa

### 3.4.4 (2024-12-08)

-   (@GermanBluefox) Corrected the name editing of the devices for Alexa 3

### 3.4.3 (2024-11-05)

-   (@GermanBluefox) corrected the addition of the devices for Alexa
-   (@GermanBluefox) changed compilation of GUI to remove deprecated packages

### 3.4.2 (2024-09-17)

-   (@GermanBluefox) Updated GUI packages and removed `gulp`
-   (@foxriver76) do not override custom `result` attribute on `sendToAdapter` response (Visu App - only relevant for developers)

### 3.4.0 (2024-08-26)

-   (@foxriver76) added new commands for the visu app
-   (bluefox) updated packages
-   (bluefox) Migrated GUI for admin v7

### 3.3.0 (2024-05-09)

-   (foxriver76) Fix error on reconnecting
-   (foxriver76) prepared adapter for new ioBroker Visu app states
-   (bluefox) updated packages

### 3.2.2 (2024-04-11)

-   (foxriver76) remove some warnings that should only be debug log

### 3.2.1 (2024-04-11)

-   (foxriver76) fixed issue that only valid JSON could be sent to app via message state

### 3.2.0 (2024-04-10)

-   (foxriver76) implemented geofence with ioBroker Visu app

### 3.1.0 (2024-02-05)

-   (bluefox) Updated packages
-   (bluefox) Disabled the state change report for alexa v3

### 3.0.0 (2023-10-24)

-   (bluefox) Updated packages
-   (bluefox) The minimal supported node.js version is 16

### 2.0.11 (2023-06-20)

-   (bluefox) Added support for the state toggling (alexa 3)
-   (bluefox) Done small improvements for alexa 3

### 2.0.9 (2023-06-15)

-   (bluefox) Working on support for amazon alexa v3

### 2.0.2 (2023-06-05)

-   (bluefox) Added support for amazon alexa v3
-   (bluefox) Removed support for sugar blood indication

### 1.14.6 (2023-05-12)

-   (bluefox) Corrected translations

### 1.14.5 (2023-03-01)

-   (bluefox) Corrected names of enums in GUI

### 1.14.3 (2023-01-10)

-   (kirovilya) Fixed processing for lights with CT and RGB in Alisa

### 1.14.2 (2022-12-23)

-   (bluefox) Updated GUI packages

### 1.14.1 (2022-12-22)

-   (bluefox) Downgraded the axios version to 0.27.2

### 1.14.0 (2022-12-13)

-   (bluefox) Added netatmo support

### 1.13.0 (2022-12-08)

-   (Apollon77) Added support vor Custom Skill v2

### 1.12.5 (2022-11-09)

-   (bluefox) Small changes on configuration GUI

### 1.12.4 (2022-11-03)

-   (bluefox) Added ukrainian language
-   (bluefox) Corrected blockly for unknown languages

### 1.12.2 (2022-10-01)

-   (Apollon77) Fixed crash case

### 1.12.1 (2022-09-27)

-   (bluefox) Corrected error in GUI with empty password

### 1.12.0 (2022-09-27)

-   (Apollon77) Do not control saturation with a percentage request via alexa
-   (bluefox) Migrated GUI to v5

### 1.11.9 (2022-07-22)

-   (Apollon77) Fix temperature controlling for thermostats via alexa

### 1.11.8 (2022-06-24)

-   (Apollon77) Update dependencies to allow better automatic rebuild

### 1.11.7 (2022-06-13)

-   (bluefox) Tried to correct URL key creation for Google home

### 1.11.5 (2022-06-03)

-   (kirovilya) Alisa: update for binary-sensor "motion" and "contact"

### 1.11.4 (2022-03-29)

-   (Apollon77) Fix crash cases reported by Sentry

### 1.11.3 (2022-03-23)

-   (bluefox) Added the generation of URL key for services

### 1.11.2 (2022-03-20)

-   (Apollon77) Fix crash case reported by Sentry (IOBROKER-IOT-3P)

### 1.11.1 (2022-03-18)

-   (Apollon77) Optimize logging when many devices are used

### 1.11.0 (2022-03-17)

-   (Apollon77) Also support "stored" when a rgb state is turned on/off
-   (Apollon77) Fixed control percent value to respect min/max correctly
-   (bluefox) Support for response messages longer than 128k (zip)

### 1.10.0 (2022-03-09)

-   (Apollon77) Respect min/max when calculating the value for byOn with % values

### 1.9.7 (2022-02-20)

-   (Apollon77) Fix crash case reported by Sentry (IOBROKER-IOT-3C)

### 1.9.6 (2022-02-19)

-   (Apollon77) Make sure to not remember the off value when using stored values for on
-   (Apollon77) Fix crash case reported by Sentry (IOBROKER-IOT-3A)

### 1.9.5 (2022-02-08)

-   (bluefox) Fixed Google home error with color control

### 1.9.4 (2022-02-08)

-   (bluefox) Fixed error with the certificates fetching

### 1.9.3 (2022-02-03)

-   (bluefox) Removed deprecated package `request`
-   (bluefox) Refactoring and better error handling

### 1.9.2 (2022-01-26)

-   (bluefox) Added experimental support for remote access

### 1.8.25 (2021-11-18)

-   (bluefox) Corrected the enabling of the category

### 1.8.24 (2021-09-19)

-   (bluefox) Respect the min/max limits by controlling

### 1.8.23 (2021-09-18)

-   (bluefox) Fixed the response for the heating control

### 1.8.22 (2021-05-16)

-   (bluefox) Make it admin4 compatible

### 1.8.21 (2021-05-16)

-   (bluefox) Fixed the encryption of the password. Warning: if you see the message in the log, that password is invalid, please enter the password in configuration dialog one more time and save.

### 1.8.20 (2021-05-16)

-   (foxriver76) we now write data received from custom services with the acknowledge flag

### 1.8.19 (2021-05-14)

-   (bluefox) Only added one debug output

### 1.8.16 (2021-03-13)

-   (bluefox) fixed the blind functionality in alisa

### 1.8.15 (2021-03-12)

-   (bluefox) implemented the sensor functionality in alisa

### 1.8.14 (2021-03-12)

-   (bluefox) allowed the control of the blinds in alisa

### 1.8.13 (2021-02-04)

-   (Apollon77) add missing object smart.lastObjectID

### 1.8.12 (2021-02-02)

-   (bluefox) Fixed the dimmer issue with alisa.

### 1.8.11 (2021-01-20)

-   (Morluktom) Alexa - Corrected the request for percentage values

### 1.8.10 (2021-01-20)

-   (bluefox) Added the reconnection strategy if DNS address cannot be resolved

### 1.8.9 (2020-12-27)

-   (bluefox) Updated configuration GUI to the latest state

### 1.8.8 (2020-12-14)

-   (bluefox) Corrected the "Google home" error

### 1.8.6 (2020-12-13)

-   (bluefox) Try to fix google home error

### 1.8.5 (2020-11-23)

-   (bluefox) Corrected the configuration table for Google home

### 1.8.4 (2020-11-18)

-   (bluefox) Corrected the configuration table for Google home

### 1.8.3 (2020-11-16)

-   (bluefox) Trying to fix the set to false at start for Google home

### 1.8.2 (2020-11-15)

-   (bluefox) Added the debug outputs for Google home

### 1.8.1 (2020-11-13)

-   (bluefox) The deletion of google home devices was corrected

### 1.8.0 (2020-11-12)

-   (bluefox) The Google home table was rewritten

### 1.7.15 (2020-11-05)

-   (Morluktom) Corrected the request for temperature

### 1.7.14 (2020-11-05)

-   (bluefox) Updated the select ID dialog.

### 1.7.12 (2020-09-25)

-   (bluefox) Updated the select ID dialog.

### 1.7.9 (2020-09-17)

-   (bluefox) Updated GUI for config.

### 1.7.7 (2020-09-02)

-   (bluefox) Added information about changed linking process.

### 1.7.6 (2020-08-25)

-   (bluefox) Some colors were changed in the dark mode.

### 1.7.5 (2020-08-21)

-   (Apollon77) Crash prevented (Sentry IOBROKER-IOT-W)
-   (bluefox) Values for modes will be converted to number in Alisa

### 1.7.3 (2020-08-16)

-   (bluefox) Added vacuum cleaner to Alisa

### 1.7.1 (2020-08-16)

-   (bluefox) Added blinds, lock and thermostat to Alisa

### 1.6.4 (2020-08-06)

-   (Apollon77) crash prevented (Sentry IOBROKER-IOT-V)

### 1.6.3 (2020-08-04)

-   (bluefox) Added french letters to allowed symbols

### 1.6.1 (2020-07-10)

-   (bluefox) Used new SelectID Dialog in GUI

### 1.5.3 (2020-05-28)

-   (bluefox) Small change for nightscout

### 1.5.2 (2020-05-21)

-   (bluefox) Changed requirements for password
-   (bluefox) Do not try to load the "sharp" if the blood sugar not enabled

### 1.4.18 (2020-05-11)

-   (Apollon77) Make sure that invalid configured states or values without a timestamp do not crash adapter (Sentry IOBROKER-IOT-8)
-   (Apollon77) Make sure publishes after the disconnect to not break adapter (Sentry IOBROKER-IOT-A)

### 1.4.17 (2020-05-11)

-   (bluefox) Better error output is implemented

### 1.4.14 (2020-05-01)

-   (bluefox) Fixed the problem if admin is not on 8081 port

### 1.4.12 (2020-04-30)

-   (Apollon77) error case handled where system.config objects does not exist (Sentry IOBROKER-IOT-5)

### 1.4.11 (2020-04-26)

-   (bluefox) fixed IOBROKER-IOT-REACT-F

### 1.4.10 (2020-04-24)

-   (bluefox) Fixed crashes reported by sentry

### 1.4.7 (2020-04-23)

-   fixed iot crash when timeouts in communications to Google happens (Sentry IOBROKER-IOT-2)
-   fixed iot crash when google answers without customData (Sentry IOBROKER-IOT-1)

### 1.4.6 (2020-04-18)

-   (Apollon77) Add the Sentry error reporting to `React Frontend`

### 1.4.4 (2020-04-14)

-   (Apollon77) remove js-controller 3.0 warnings and replace `adapter.objects` access
-   (Apollon77) add linux dependencies for canvas library
-   (Apollon77) add sentry configuration

### 1.4.2 (2020-04-08)

-   (TA2k) Fix updateState for Google Home

### 1.4.1 (2020-04-04)

-   (bluefox) The blood glucose request supported now

### 1.3.4 (2020-02-26)

-   (TA2k) Fixed deconz issues in Google Home

### 1.3.3 (2020-02-12)

-   (Apollon77) fix alisa error with invalid smartName attributes

### 1.3.2 (2020-02-10)

-   (Apollon77) usage with all kinds of admin ports and reverse proxies optimized

### 1.3.1 (2020-02-09)

-   (Apollon77) Dependency updates
-   (Apollon77) Make compatible with Admin > 4.0 because of updated socket.io

### 1.2.1 (2020-01-18)

-   (bluefox) Fixed problem if the port of admin is not 8081

### 1.2.0 (2020-01-04)

-   (TA2k) Google Home handling and visualization improved.

### 1.1.10 (2020-01-03)

-   (bluefox) Now is allowed to select the temperature values as alexa states
-   (bluefox) Allowed the setting type immediately after insertion of new state

### 1.1.9 (2019-11-27)

-   (bluefox) Fixed: sometimes the configuration could not be loaded

### 1.1.8 (2019-09-12)

-   (bluefox) Optimization of google home communication was done

### 1.1.7 (2019-09-11)

-   (bluefox) The sending rate to google home is limited now

### 1.1.6 (2019-09-11)

-   (TA2k) Room fix for Google Home and LinkedDevices

### 1.1.4 (2019-09-10)

-   (bluefox) decreased keepalive value to fix issue with disconnect

### 1.1.3 (2019-09-09)

-   (TA2k) Google Home problem fixed with LinkedDevices

### 1.1.0 (2019-09-06)

-   (bluefox) Added support of aliases

### 1.0.8 (2019-09-03)

-   (TA2k) Improved support for Google Home
-   (TA2k) Added auto detection for RGB, RGBSingle, Hue, CT, MediaDevice, Switch, Info, Socket, Light, Dimmer, Thermostat, WindowTilt, Blinds, Slider
-   (TA2k) Added support for manually adding states as devices
-   (TA2k) Fix update state after Sync
-   (TA2k) Added typical Google Home devices and traits/actions
-   (TA2k) Fix only process update message when Alexa is checked in the options

### 1.0.4 (2019-08-01)

-   (bluefox) Fixed password encoding. Please enter password anew!

### 1.0.3 (2019-07-30)

-   (bluefox) Fixed language issues for google home and yandex alice

### 1.0.1 (2019-07-26)

-   (bluefox) Support of private skills/actions was added.

### 1.0.0 (2019-07-14)

-   (TA2k) Google Home list was added

### 0.5.0 (2019-06-29)

-   (bluefox) tried to add yandex Alisa

### 0.4.3 (2019-04-14)

-   (Apollon77) Change enable/disable of Amazon Alexa and of Google Home from configuration to be really "active if selected".

### 0.4.2 (2019-03-10)

-   (bluefox) Allowed the enablement and disable of Amazon Alexa and of Google Home from configuration.

### 0.4.1 (2019-02-19)

-   (bluefox) Add version check to google home

### 0.3.1 (2019-01-13)

-   (bluefox) Blockly was fixed

### 0.3.0 (2018-12-30)

-   (bluefox) Detection of google devices was fixed

### 0.2.2 (2018-12-21)

-   (bluefox) Generation of new URL key was added

### 0.2.0 (2018-12-18)

-   (bluefox) Change the name of adapter

### 0.1.8 (2018-10-21)

-   (bluefox) Added extended diagnostics

### 0.1.7 (2018-10-14)

-   (bluefox) The configuration dialog was corrected
-   (bluefox) The possibility to create the answer with script for the custom skill was implemented.

### 0.1.4 (2018-09-26)

-   (bluefox) Initial commit

## License

The MIT License (MIT)

Copyright (c) 2018-2025 bluefox <dogafox@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
