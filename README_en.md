> Document Template: v0.4.2

<p align="center">
  <h1 align="center"> <code>react-native-headless</code> </h1>
</p>

This project is based on [react-native-headless](https://github.com/telefon-one/react-native-headless).

The version correspondence details are as follows:

| Name | Version (Npm Address) | Release Information | Supported RN Version | Supported Autolink | Compile API Version | Community Baseline Version | Source Code Address |
| --------------| -------------- | ------------------------------ | ------------- | ------------- |------------------------ | ------------ | ------------- |
| react-native-headless | [～0.0.5](https://www.npmjs.com/package/react-native-headless) | [GitHub Releases](https://github.com/react-native-oh-library/react-native-headless/releases) | 0.84.* | Yes | API12+ | 0.0.4 | [master](https://github.com/react-native-oh-library/react-native-headless/tree/master) |

## Introduction

This library provides native capabilities encapsulation for React Native, such as background task maintenance and front-end/back-end switching.

## Installation

Go to the project directory and execute the following instruction:

**npm**

```bash
npm install @react-native-ohos/react-native-headless
```

**yarn**

```bash
yarn add @react-native-ohos/react-native-headless
```

## Link

| Version | Supported Autolink | Supported RN Version |
|--------------------------------------|--------------------|----------------------|
| ～0.0.5 | Yes | 0.84.* |

Projects using AutoLink need to be configured according to this document. AutoLink framework guide: [Autolinking documentation](https://gitcode.com/CPF-RN/ohos_react_native/blob/master/docs/zh-cn/Autolinking.md)

If the version you are using supports Autolink and the project has integrated Autolink, you can skip the ManualLink configuration.

<details>
  <summary>ManualLink: This step provides guidance for manually configuring native dependencies.</summary>

Open the `harmony` directory of the OpenHarmony project in DevEco Studio.

### 1. Overrides RN SDK

To ensure the project relies on the same version of the RN SDK, add an `overrides` field in the project's root `oh-package.json5` file:

```json
{
  "overrides": {
    "@rnoh/react-native-openharmony": "~0.84.1"
  }
}
```

For more information about the purpose of this field, please refer to the [official documentation](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V5/ide-oh-package-json5-V5#en-us_topic_0000001792256137_overrides).

### 2. Introducing Native Code

Method 1 (recommended): Use the HAR file.

> [!TIP] The HAR file is stored at `harmony/headless.har` in the installation path of the third-party library.

Open `entry/oh-package.json5` and add the following dependencies:

```json
"dependencies": {
  "react-native-headless": "file:../../node_modules/react-native-headless/harmony/headless.har"
}
```

Click the `sync` button in the upper right corner, or run:

```bash
cd entry
ohpm install
```

Method 2: Directly link to the source code.

> [!TIP] For details, see [Directly Linking Source Code](https://gitcode.com/CPF-RN/usage-docs/blob/master/en/link-source-code.md).

### 3. Configuring CMakeLists and Introducing HeadlessPackage

Open `entry/src/main/cpp/CMakeLists.txt` and add:

```cmake
set(OH_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")

add_subdirectory("${OH_MODULES}/react-native-headless/src/main/cpp" ./headless)

target_link_libraries(rnoh_app PUBLIC headless)
```

Open `entry/src/main/cpp/PackageProvider.cpp` and add:

```cpp
#include "HeadlessPackage.h"

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx) {
    return {
        std::make_shared<HeadlessPackage>(ctx),
    };
}
```

### 4. Introducing HeadlessPackage to ArkTS

Open `entry/src/main/ets/RNOHPackagesFactory.ets` and add:

```typescript
import HeadlessPackage from 'react-native-headless';

export function createRNOHPackages(ctx: RNPackageContext): RNOHPackage[] {
  return [
    new HeadlessPackage(ctx),
  ];
}
```

</details>

## Running

Click the `sync` button in the upper right corner, or run:

```bash
cd entry
ohpm install
```

Then build and run the code.

## Constraints

### Compatibility

This document is verified based on the following versions:

1.RNOH: 0.84.2; SDK: HarmonyOS 6.0.0 Release SDK; IDE: DevEco Studio 6.0.2.636; ROM: 6.0.0.125;

### Permission Requirements

Declare in the host app's `entry/src/main/module.json5`:

```json
"requestPermissions": [
  {
    "name": "ohos.permission.KEEP_BACKGROUND_RUNNING"
  }
],
"abilities": [
  {
    "name": "EntryAbility",
    "backgroundModes": ["dataTransfer"]
  }
]
```

> [!TIP] `backgroundModes` must match your actual business scenario. The example uses `dataTransfer` (DATA_TRANSFER). If progress is not updated for more than 10 minutes, the system cancels the continuous task. Use a matching type in production (e.g. `audioPlayback`, `location`).

JS Bundle path: `example/harmony/entry/src/main/resources/rawfile/bundle.harmony.js` (generated by `npm run dev`).

### API Requirements

> [!TIP] The current third-party library supports compilation in `API12+` projects and execution on `API12+` ROMs.

> [!TIP] The following features depend on specific API versions. Running on a ROM below the specified API version may result in limited functionality.

1. `toBackground()` maps to `UIAbilityContext.moveAbilityToBackground()`, requiring **API 12+**.
2. The `HeadlessTaskCancelled` event depends on `backgroundTaskManager.on('continuousTaskCancel')`, requiring **API 15+**. Devices below API 15 will not receive this event, but `stopService()` still resets state correctly.

## Example

The following code shows the basic use scenario of the repository:

> [!WARNING] The name of the imported repository remains unchanged.

```javascript
import Headless from 'react-native-headless';
import { DeviceEventEmitter } from 'react-native';

// Start background continuous task (Harmony: backgroundTaskManager; Android: Foreground Service)
await Headless.startService();

// Listen for periodic events (Harmony degraded alternative to registerHeadlessTask('HeadlessHandler'))
const tickSub = DeviceEventEmitter.addListener('HeadlessTick', (payload) => {
  console.log(payload.task, payload.tick, payload.timestamp);
});

// Continuous task cancelled by system or user
const cancelSub = DeviceEventEmitter.addListener('HeadlessTaskCancelled', (payload) => {
  console.log('cancelled, reason =', payload.reason);
});

// Stop
await Headless.stopService();

// Foreground/background (see platform differences in How to Use)
await Headless.toForeground();
await Headless.toBackground();
```

## How to Use

**Background continuous task**

```javascript
await Headless.startService();
// While running: Harmony emits HeadlessTick every 2s; Android triggers HeadlessHandler via HeadlessEventService
await Headless.stopService(); // Idempotent: silently succeeds when not running
```

**Android headless task registration (Android only)**

```javascript
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask('HeadlessHandler', () => async (data) => {
  // Background JS logic
});
```

> HarmonyOS has no `HeadlessJsTaskService` equivalent. Use `DeviceEventEmitter.addListener('HeadlessTick', ...)` instead.

**Foreground/background switching**

```javascript
// Move to background (real capability on Harmony; upstream Android is a no-op)
await Headless.toBackground();

// Attempt to bring to foreground
await Headless.toForeground();
// ⚠️ Harmony: when the app is in background, third-party apps cannot reliably startAbility to bring themselves to foreground
//    (requires ohos.permission.START_ABILITIES_FROM_BACKGROUND, system apps only)
//    Recommended: use the continuous task notification from startService() + user tap on WantAgent
```

**Lock screen**

```javascript
await Headless.noLock(); // No-op on both Android and Harmony (parity with upstream Android empty implementation; no lock-screen bypass)
```

## Available APIs

> [!TIP] The **Platform** column indicates the platform where the properties are supported in the original third-party library.

> [!TIP] If the value of **HarmonyOS Support** is **yes**, it means that the HarmonyOS platform supports this property; **no** means the opposite; **partially** means some capabilities are supported. The usage method is the same on different platforms and the effect is aligned with the upstream Android behavior or officially allowed equivalent capabilities.

### Module Export

| Name | Type | Required | Platform | HarmonyOS Support | Description |
|------|------|----------|----------|-------------------|-------------|
| Headless | `NativeModule` / `TurboModule` | Yes | Android, HarmonyOS | yes | Default export. Module name: `HeadlessModule`. |

### API

| Name | Type | Parameter Type | Return Value | Required | Platform | HarmonyOS Support | Description |
|------|------|----------------|--------------|----------|----------|-------------------|-------------|
| startService | function | None | `Promise<void>` | No | Android, HarmonyOS | yes | Start background task. Harmony: request continuous task + system notification; Android: start Foreground Service. After success, Harmony emits `HeadlessTick` every 2s. Repeated calls are idempotent. |
| stopService | function | None | `Promise<void>` | No | Android, HarmonyOS | yes | Stop background task, dismiss notification and periodic events. Silently succeeds when not running (parity with Android). |
| toForeground | function | None | `Promise<void>` | No | Android, HarmonyOS | partially | Attempt to bring the app to foreground. Android: `startActivity(MainActivity)` can launch from background. Harmony: `startAbility` to self UIAbility; **rejected when app is in background for third-party apps** ([Component Startup Rules](https://gitcode.com/openharmony/docs/blob/OpenHarmony-6.0-Release/en/application-dev/application-models/component-startup-rules.md)). |
| toBackground | function | None | `Promise<void>` | No | Android, HarmonyOS | yes | Move app to background. Harmony: `moveAbilityToBackground()` (API 12+, real capability). Upstream Android is a no-op. |
| noLock | function | None | `Promise<void>` | No | Android, HarmonyOS | yes | Placeholder API, resolves immediately, **does nothing**. Parity with upstream Android empty implementation (`FLAG_SHOW_WHEN_LOCKED` code commented out). Does not provide lock-screen bypass. |

### Events

| Name | Parameter Type | Platform | HarmonyOS Support | Description |
|------|----------------|----------|-------------------|-------------|
| HeadlessTick | [HeadlessTickPayload](#HeadlessTickPayload) | HarmonyOS | yes | Emitted every 2s while continuous task runs. Degraded alternative to Android `registerHeadlessTask('HeadlessHandler')`. |
| HeadlessTaskCancelled | [HeadlessTaskCancelledPayload](#HeadlessTaskCancelledPayload) | HarmonyOS | partially | Emitted when continuous task is cancelled by system or user (API 15+). |

#### HeadlessTickPayload

| Name | Parameter Type | Default Value | Required | Description |
|------|----------------|---------------|----------|-------------|
| task | string | `"HeadlessHandler"` | Yes | Task name, matching Android HeadlessEventService taskName |
| tick | number | — | Yes | Tick count within current continuous task period (starts at 1) |
| timestamp | number | — | Yes | Event timestamp (epoch milliseconds) |

#### HeadlessTaskCancelledPayload

| Name | Parameter Type | Default Value | Required | Description |
|------|----------------|---------------|----------|-------------|
| task | string | `"HeadlessHandler"` | Yes | Task name |
| reason | number | — | Yes | Cancel reason: `1`=user cancelled (notification removed), `2`=system cancelled, etc. |

### Unsupported Features

| Capability | Platform | HarmonyOS Support | Reason |
|------------|----------|-------------------|--------|
| Boot auto-start (BootUpReceiver / BOOT_COMPLETED) | Android | no | HarmonyOS does not expose boot broadcast to third-party apps; `ohos.permission.RECEIVER_STARTUP_COMPLETED` is system-only |
| AppRegistry.registerHeadlessTask | Android | no | RNOH has no HeadlessJsTaskService equivalent; degraded to `HeadlessTick` events |
| Lock-screen bypass display | Android, HarmonyOS | no | Not implemented in upstream Android source; Harmony requires [Live View Kit](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/liveview-preparations) |

## Quick Verification (Run Example)

### Prerequisites

| Dependency | Version Requirement |
|------------|---------------------|
| Node.js | >= 18 |
| DevEco Studio | 5.0+ / 6.0+ |
| HarmonyOS SDK | API 12+ |

### Steps

```bash
# 1. Install and build JS artifacts at repo root
npm install --legacy-peer-deps

# 2. Install example dependencies
cd example
npm install --legacy-peer-deps

# 3. Generate Harmony JS Bundle
npm run dev

# 4. Open example/harmony in DevEco Studio, Sync, build and run
```

> The example already includes plugin dependencies and Package registration; no manual Link required.

## Known Issues

- `toForeground()` cannot reliably auto-bring the app to foreground from background on HarmonyOS. Use continuous task notification + user tap instead ([Component Startup Rules](https://gitcode.com/openharmony/docs/blob/OpenHarmony-6.0-Release/en/application-dev/application-models/component-startup-rules.md)).
- `HeadlessTaskCancelled` depends on API 15+ `continuousTaskCancel` event; API 12–14 devices will not receive it.
- The example uses `DATA_TRANSFER` continuous task type; the system cancels it if progress is not updated for more than 10 minutes.

## Other

- Always import as `'react-native-headless'`. Harmony side maps to the native HAR via RNOH alias.
- Upstream Android native code is at [telefon-one/react-native-headless](https://github.com/telefon-one/react-native-headless); this branch focuses on HarmonyOS adaptation.

## Directory Structure

````
react-native-headless/          # Project root
├── harmony/                    # HarmonyOS adaptation code
│   ├── headless.har            # Prebuilt HAR package
│   └── headless/               # Core HarmonyOS adaptation
│       ├── index.ets           # Entry (exports HeadlessPackage)
│       └── src/main/ets/
│           ├── HeadlessModule.ets              # TurboModule implementation
│           └── HeadlessTurboModulesFactory.ets # Package registration
├── src/                        # RN JS source
│   ├── index.js                # Entry (exports Headless)
│   ├── Headless.js             # Cross-platform module accessor
│   └── specs/NativeHeadlessModule.ts  # TurboModule Spec
├── dist/                       # bob build output (npm publish entry)
├── example/                    # HarmonyOS example project
│   ├── App.tsx
│   └── harmony/                # DevEco project
├── jest/                       # Unit tests
├── README.md                   # Chinese documentation
└── README_en.md                # English documentation
````

## How to Contribute

If you find any problem when using react-native-headless, submit an [Issue](https://github.com/telefon-one/react-native-headless/issues) or a [PR](https://github.com/telefon-one/react-native-headless/pulls).

## License

This repository is based on the [ISC License](https://github.com/telefon-one/react-native-headless/blob/master/LICENSE) (original library license).
