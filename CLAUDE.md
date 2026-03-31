# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ioBroker.iot is an ioBroker adapter that connects ioBroker smart home instances to cloud voice assistants: Amazon Alexa (V2 legacy + V3), Google Home, Yandex Alice, and custom Alexa skills. It communicates via AWS IoT Device SDK and translates ioBroker's state-based device model into voice assistant device representations.

## Build Commands

```bash
npm run build            # Full build: admin UI + rules UI + TypeScript backend
npm run build:backend    # TypeScript backend only (tsc + copy legacy JS files)
npm run build-admin      # Admin React UI only (Vite)
npm run rules-build      # Rules micro-frontend only (Vite + Module Federation)
npm run lint             # ESLint (flat config, only checks src/ TypeScript)
npm run translate        # Run i18n translation tool
```

### Install all dependencies (root + sub-projects)
```bash
npm run npm              # Runs npm install in root, src-admin/, and src-rules/
```

## Test Commands

```bash
npm test                 # All tests (gui + package + alexa-v3)
npm run test:gui         # Puppeteer GUI tests (admin UI startup/navigation)
npm run test:package     # Package file validation (io-package.json, etc.)
npm run test:alexa-v3    # Alexa V3 unit tests (mocha --grep AlexaSmartHomeV3)
npm run test:integration # GUI + Alexa V3 tests
```

Tests use **Mocha** with Puppeteer for GUI tests. Config: `.mocharc.json`. Screenshots go to `tmp/screenshots/`.

## Architecture

### Three Build Targets

1. **Backend** (`src/` -> `build/`): TypeScript compiled to ES2022/Node16 with strict mode. Entry point: `src/main.ts` -> `build/main.js`. Three legacy JS files (`alexaSmartHomeV2.js`, `alisa.js`, `googleHome.js`) are copied as-is to `build/lib/`.

2. **Admin UI** (`src-admin/` -> `admin/`): React 18 + Vite + MUI v6 + TypeScript. The built `index.html` gets renamed to `index_m.html` after build.

3. **Rules UI** (`src-rules/` -> `admin/rules/`): React + Vite + Module Federation micro-frontend. Provides custom action blocks for the ioBroker JavaScript rules engine. Loaded dynamically as a remote module.

### Backend Structure (`src/`)

- **`main.ts`** (~1900 lines): Main adapter class extending `@iobroker/adapter-core`. Manages AWS IoT device connection with progressive backoff retry. Handles message routing to voice assistant handlers. Max IoT message: 127KB.
- **`lib/AlexaSmartHomeV3/`** (100+ files): Modern Alexa implementation with layered architecture:
  - `DeviceManager.ts` - Discovers devices from ioBroker enumerations using `@iobroker/type-detector`
  - `Device.ts` - Maps ioBroker controls to Alexa endpoints
  - `Controls/` - Physical device types (Light, Dimmer, Blind, Lock, Thermostat, etc.)
  - `Alexa/Capabilities/` - Alexa capability implementations (PowerController, BrightnessController, etc.)
  - `Alexa/Properties/` - Alexa state properties
  - `Alexa/Directives/` - Discovery, ReportState, ChangeReport handlers
  - `Helpers/` - Logger, RateLimiter, IotProxy, AdapterProvider
- **`lib/remote.ts`** (~71KB): Remote access manager, proxy requests, socket connections
- **`lib/adminCommonSocket.ts`** (~35KB): WebSocket communication between admin UI and adapter
- **`lib/alexaCustom.ts`**: Custom Alexa skill handler (free-text voice commands)
- **`lib/alexaSmartHomeV2.js`**, **`lib/googleHome.js`**, **`lib/alisa.js`**: Legacy JS handlers (not TypeScript)

### Admin UI Structure (`src-admin/src/`)

- `App.tsx` - Main component with tab navigation
- `Tabs/Alexa3/` - Alexa V3 device management
- `Tabs/AlexaSmartNames.jsx`, `GoogleSmartNames.jsx`, `AlisaSmartNames.jsx` - Smart name editors (large files, 37-44KB each)
- `Tabs/Options.tsx`, `Services.tsx`, `Extended.tsx`, `Enums.tsx` - Configuration tabs

## Build Orchestration

`tasks.js` orchestrates the multi-step build using `@iobroker/build-tools`. The full `npm run build` pipeline: clean admin -> npm install src-admin -> Vite build admin -> copy to admin/ -> patch HTML -> rename to index_m.html -> clean rules -> npm install src-rules -> Vite build rules -> copy to admin/rules/ -> tsc backend -> copy legacy JS.

## Linting Scope

ESLint only checks `src/` TypeScript files. Ignored: `build/`, `src/lib/**/*.js` (legacy), `admin/`, `test/`, `src-admin/`, `src-rules/`, `tasks.js`, `*.mjs`.

## Key Patterns

- Adapter config type: `IotAdapterConfig` in `src/lib/types.d.ts`
- Device type detection: `@iobroker/type-detector` analyzes ioBroker states to determine device types
- Smart names: Generated from room + function names, configurable order via `functionFirst` config
- Cloud connection: AWS IoT Device SDK with certificates stored in adapter state objects
- The adapter runs as a daemon process in ioBroker (mode: "daemon" in io-package.json)
