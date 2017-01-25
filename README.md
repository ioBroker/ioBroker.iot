![Logo](admin/cloud.png)
ioBroker cloud adapter
=================
[![NPM version](http://img.shields.io/npm/v/iobroker.cloud.svg)](https://www.npmjs.com/package/iobroker.cloud)
[![Downloads](https://img.shields.io/npm/dm/iobroker.cloud.svg)](https://www.npmjs.com/package/iobroker.cloud)

[![NPM](https://nodei.co/npm/iobroker.cloud.png?downloads=true)](https://nodei.co/npm/iobroker.cloud/)

This adapter allows connection from internet through ioBroker cloud to local installation of ioBroker.

## Settings
### APP-KEY
To use cloud adapter you should first get the APP-Key on [https://iobroker.net](https://iobroker.net).

This is application key that the user can get on [https://iobroker.net](https://iobroker.net) site. Please get the key there and enter it here.

![Intro](img/intro.png)

### Instance
All requests from cloud adapter will be routed to some WEB Instance. User must specify here the WEB instance, that will be showed to user, when he logs in https://iobroker.net site.

### Allow self-signed certificates
If you use standard iobroker.net cloud, you can deactivate it. This option is only important if own cloud used.

### Language
If you select "default" language the smart names of devices and of enumerations will not be translated. If some language specified all known names will be translated into this language.
It is done to switch fast between many languages for demonstration purposes.

### Place function in names first
Change the order of function and roles in self generated names:

- if false: "Room function", e.g. "Living room dimmer"
- if true: "Function room", e.g. "Dimmer living room"

### Concatenate words with
You can define the word which will be placed between function and room. E.g. "in" and from "Dimmer living room" will be "Dimmer in living room".

But is not suggested to do so, because recognition engine must analyse one more word and it can lead to misunderstandings.

### OFF level for switches
Some groups consist of mixed devices: dimmers and switches. It is allowed to control them with "ON" and "OFF" commands and with percents.
If command is "Set to 30%" and the *OFF level" is "30%" so the switches will be turned on. By command "Set to 25%" all switches will be turned OFF.

Additionally if the command is "OFF", so the adapter will remember the current dimmer level if the actual value is over or equal to the "30%".
Later when the new "ON" command will come the adapter will switch the dimmer not to 100% but to the level in memory.

Example:

- Assume, that *OFF level* is 30%.
- Virtual device "Light" has two physical devices: *switch* and *dimmer*.
- Command: "set the light to 40%". The adapter will remember this value for *dimmer*, will set it for "dimmer" and will turn the *switch* ON.
- Command: "turn the light off". The adapter will set the *dimmer* to 0% and will turn off the *switch*.
- Command: "turn on the light". *dimmer* => 40%, *switch* => ON.
- Command: "set the light to 20%". *dimmer* => 20%, *switch* => OFF. The value for dimmer will not be remembered, because it is bellow *OFF level*.
- Command: "turn on the light". *dimmer* => 40%, *switch* => ON.

### by ON
You can select the behaviour of ON command will come for the number state. The specific value can be selected or last non zero value will be used.

## How names will be generated
The adapter tries to generate virtual devices for smart home control (e.g. Amazon Alexa or Google Home).

The are two important enumerations for that: rooms and functions.

Rooms are like: living room, bath room, sleeping room.
Functions are like: light, blind, heating.

Following conditions must be met to get the state in the automatically generated list:

- the state must be in some "function" enumeration.
- the state must have role ("state", "switch" or "level.*", e.g. level.dimmer) if not directly included into "functions".
It can be that the channel is in the "functions", but state itself not.
- the state must be writable: common.write = true
- the state dimmer must have common.type as 'number'
- the state heating must have common.unit as '°C', '°F' or '°K' and common.type as 'number'

If the state is only in "functions" and not in any "room", the name of state will be used.

The state names will be generated from function and room. E.g. all *lights* in the *living room* will be collected in the virtual device *living room light*.
The user cannot change this name, because it is generated automatically.
But if the enumeration name changes, this name will be changed too. (e.g. function "light" changed to "lights", so the *living room light* will be changed to *living room lights*)

All the rules will be ignored if the state has common.smartName. In this case just the smart name will be used.

if *common.smartName* is **false**, the state or enumeration will not be included into the list generation.

The configuration dialog lets comfortable remove and add the single states to virtual groups or as single device.
![Configuration](img/configuration.png)

If the group has only one state it can be renamed, as for this the state's smartName will be used.
If the group has more than one state, the group must be renamed via the enumeration's names.

To create own groups the user can install "scenes" adapter or create "script" in Javascript adapter.

## Changelog
### 0.6.2 (2017-01-25)
* (bluefox) add option "Place function in names first"

### 0.6.1 (2017-01-24)
* (bluefox) fix reconnect
* (bluefox) change smartName structure

### 0.5.0 (2017-01-20)
* (bluefox) add value by ON

### 0.4.2 (2017-01-12)
* (bluefox) add daily restart

### 0.4.1 (2017-01-06)
* (bluefox) use devices with ":" symbols in the names
* (bluefox) add debug outputs

### 0.4.0 (2017-01-06)
* (bluefox) Support of english language
* (bluefox) Use rooms of channel and not only states

### 0.3.3 (2017-01-02)
* (bluefox) Fix error with smartNames
* (bluefox) Take the superset of actions for group and not the last one
* (bluefox) if group has switches and dimmers, turn devices OFF if the percent level is less than 30%
* (bluefox) Remember ON level for dimmers to switch it later ON

### 0.3.0 (2016-12-29)
* (bluefox) Implement Heating profile for Alexa

### 0.2.0 (2016-12-13)
* (bluefox) support of amazon alexa

### 0.1.2 (2016-11-17)
* (bluefox) update socket.io

### 0.1.1 (2016-10-23)
* (bluefox) update some packages

### 0.1.0 (2016-08-01)
* (bluefox) support of read/write files
