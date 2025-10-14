# Alexa V3 Scenes Implementation

## Summary
This implementation adds support for scenes in Alexa Smart Home V3 API. Scenes were previously only available in V1/V2 but were being ignored in V3 because there was no handler for the "button" type detected by ioBroker's type-detector.

## Changes Made

### 1. New Files Created

#### `src/lib/AlexaSmartHomeV3/Alexa/Capabilities/SceneController.ts`
- Implements Alexa.SceneController capability
- Configures capability as non-retrievable and non-proactively-reported (scenes don't report state)
- Sets `supportsDeactivation: false` (scenes can only be activated, not deactivated)

#### `src/lib/AlexaSmartHomeV3/Controls/Scene.ts`
- Implements Scene control that handles "button" type from type-detector
- Returns SCENE_TRIGGER as display category
- Overrides `handle()` method to process `Activate` directive
- When activated, sets the button state to `true` to trigger the scene
- Returns `ActivationStarted` response as per Alexa specification

### 2. Type Definitions Updated

#### Both `src/lib/AlexaSmartHomeV3/types.d.ts` and `src-admin/src/Tabs/alexa.types.d.ts`:
- Added `'SCENE_TRIGGER'` to `AlexaV3Category`
- Added `'Alexa.SceneController'` to `AlexaV3Namespace`
- Added `'Activate'` and `'ActivationStarted'` to `AlexaV3DirectiveType`
- Added `supportsDeactivation?: boolean` to `AlexaV3Capability` interface

### 3. Factory Registration
- Updated `src/lib/AlexaSmartHomeV3/Controls/index.ts` to register Scene control
- Updated `src/lib/AlexaSmartHomeV3/Alexa/Capabilities/index.ts` to export SceneController

### 4. Tests Added
- Created comprehensive test suite in `test/AlexaSmartHomeV3/Directives/test-AlexaSmartHomeV3-SceneController.js`
- Added test resources:
  - `test/AlexaSmartHomeV3/Resources/scene.json` - Sample scene control configuration
  - `test/AlexaSmartHomeV3/Resources/SceneController.Activate.request.json` - Sample Activate directive
- Updated `test/AlexaSmartHomeV3/helpers.js` to include `sceneControl()` helper

## How It Works

1. **Detection**: ioBroker's type-detector identifies scenes as "button" type with role matching `/^(button|action)(\.[.\w]+)?$/`

2. **Discovery**: When Alexa performs device discovery, scenes are now included with:
   - Category: SCENE_TRIGGER
   - Capability: Alexa.SceneController (not retrievable, not proactively reported)

3. **Activation**: When user says "Alexa, turn on [scene name]":
   - Alexa sends `Alexa.SceneController.Activate` directive
   - Scene control sets the button state to `true`
   - Returns `Alexa.SceneController.ActivationStarted` response

4. **State Management**: Scenes don't report state (SceneController is not retrievable), which is correct per Alexa specification

## Testing

All tests pass successfully:
- ✅ 134 tests passing (including 7 new Scene/SceneController tests)
- ✅ Scene matching tests
- ✅ Scene activation tests
- ✅ Discovery property tests

## Example Scene Configuration

From the test resources, a typical scene configuration looks like:
```json
{
    "states": [
        {
            "name": "SET",
            "defaultRole": "button",
            "id": "deconz.0.Groups.6.recall",
            "write": true,
            "read": false,
            "type": "boolean"
        }
    ],
    "type": "button",
    "object": {
        "common": {
            "name": "recall",
            "role": "button",
            "smartName": {
                "en": "Living Room Movie"
            }
        }
    }
}
```

## Resolution

This implementation resolves the issue where scenes worked in V1/V2 but were being ignored in V3. Now scenes will:
- ✅ Appear in V3 device discovery
- ✅ Be controllable via Alexa voice commands
- ✅ Work with the new ioBroker.assistant skill
- ✅ Display with SCENE_TRIGGER category in Alexa app
