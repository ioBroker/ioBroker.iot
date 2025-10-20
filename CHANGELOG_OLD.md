# Older changes
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

-   (foxriver76) we now write data received from custom services with the acknowledgment flag

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
-   (TA2k) Added auto detection for RGB, RGBSingle, Color, CT, MediaDevice, Switch, Info, Socket, Light, Dimmer, Thermostat, WindowTilt, Blinds, Slider
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
## 4.1.3 (2025-10-15)
- (@GermanBluefox) Fixed custom skill
- (@GermanBluefox) Added RGB single and scene support

## 4.1.2 (2025-10-14)
- (@GermanBluefox) Made Alexa V3 default
- (@GermanBluefox) Updated packages
- (@GermanBluefox) Corrected Alexa V3 engine

## 4.0.3 (2025-08-27)
- (@GermanBluefox) Added response ID to custom skill responses

## 4.0.2 (2025-08-26)
- (@GermanBluefox) Some files were rewritten in TypeScript
- (@GermanBluefox) Improvement of Alexa V3

## 3.6.0 (2025-07-02)
-   (@foxriver76) new features for upcoming Visu App 1.4.0

## 3.5.2 (2025-06-04)
-   (@GermanBluefox) Corrected error in back-end

## 3.5.1 (2025-05-31)
-   (@GermanBluefox) Rewrite Rules with TypeScript
-   (@GermanBluefox) Package updates. SVG logo
