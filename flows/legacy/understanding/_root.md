# Understanding: Project Root

> Entry point for recursive understanding. Children are top-level logical domains.

## Phase: EXPLORING

## Project Overview

**react-native-headless** - A React Native module providing headless JS execution capabilities for Android. Enables running JavaScript code in the background when the app is not visible or when the device is in sleep mode.

Key capabilities:
- Start/stop headless services
- Bring app to foreground from background
- Send app to background
- Boot-up auto-start capability

## Hypothesis

This is a **native Android module** that wraps Android's HeadlessJsTaskService and foreground service mechanisms. The module provides:
1. A React Native bridge (HeadlessModule) for native Android functionality
2. A foreground service (HeadlessService) for persistent background execution
3. An event service (HeadlessEventService) for headless JS task execution
4. A boot receiver (BootUpReceiver) for auto-start on device boot

The JavaScript side is minimal - just a thin wrapper over NativeModules.

## Validated Understanding

**Confirmed architecture:**

1. **React Native Module Pattern**: Uses standard React Native bridge architecture
   - `HeadlessPackage` registers the native module
   - `HeadlessModule` extends `ReactContextBaseJavaModule`
   - Methods annotated with `@ReactMethod` are exposed to JavaScript

2. **Service Architecture**:
   - `HeadlessService`: Extends Android `Service`, runs as foreground service with notification
   - `HeadlessEventService`: Extends `HeadlessJsTaskService`, executes JS tasks in background
   - Uses `HandlerThread` with `THREAD_PRIORITY_FOREGROUND` for background execution

3. **Key Implementation Details**:
   - `toForeground()`: Creates intent to launch MainActivity with `CATEGORY_LAUNCHER`
   - `startService()`: Starts `HeadlessService` which periodically triggers `HeadlessEventService`
   - `BootUpReceiver`: Broadcast receiver that starts service on device boot
   - Notification channel created for Android 8.0+ compatibility

4. **JavaScript Side**:
   - Minimal wrapper: `export default Headless` (from NativeModules)
   - Commented-out alternative implementation exists (class-based)


## Identified Domains

> Logical domains discovered. Each becomes a child directory for deeper exploration.

| Domain | Hypothesis | Priority | Status |
|--------|------------|----------|--------|
| native-module | React Native bridge for Android native APIs | HIGH | PENDING |
| foreground-service | Android foreground service for background execution | HIGH | PENDING |
| headless-js | Headless JS task execution mechanism | HIGH | PENDING |
| boot-receiver | Device boot broadcast receiver for auto-start | MEDIUM | PENDING |

## Source Mapping

> Which source paths map to which logical domains

| Source Path | -> Domain |
|-------------|----------|
| src/Headless.js | native-module (JS bridge) |
| index.js | native-module (export) |
| android/.../HeadlessModule.java | native-module (React Native bridge) |
| android/.../HeadlessService.java | foreground-service |
| android/.../HeadlessEventService.java | headless-js |
| android/.../BootUpReceiver.java | boot-receiver |
| android/.../HeadlessPackage.java | native-module (package registration) |

## Cross-Cutting Concerns

> Things that span multiple domains (may become ADRs)

- **Android permissions**: Required for foreground service, boot receiver
- **WakeLock management**: Power management for headless execution
- **Notification channel**: Required for foreground service (Android 8.0+)
- **HandlerThread**: Background thread management for native module

## Children Spawned

```
- native-module
- foreground-service
- headless-js
- boot-receiver
```

## Synthesis

> Updated after all children complete

**Complete Architecture:**

```
JavaScript App
     |
     v
HeadlessModule (Native Module)
     |
     +---> startService() --> HeadlessService (Foreground)
     |                            |
     |                            +---> Every 2s: HeadlessEventService (Headless JS)
     |
     +---> toForeground() --> Launch MainActivity
     |
     +---> stopService() --> Stop HeadlessService

BootUpReceiver (on device boot)
     |
     v
HeadlessService (auto-start)
```

**Key Design Decisions:**
1. Minimal JavaScript API - just pass-through to NativeModules
2. Foreground service with persistent notification (required for background execution)
3. 2-second polling interval for headless tasks
4. 5-second timeout for headless JS tasks
5. Boot auto-start capability

**Dependencies:**
- React Native >= 0.40.0
- Android Support Library (v4)
- Android 8.0+ notification channels

---

*Created by /legacy ENTERING phase*
