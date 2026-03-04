# Understanding: Native Module

> React Native bridge connecting JavaScript to Android native APIs

## Phase: SYNTHESIZING

## Hypothesis

This module provides the React Native bridge layer. It exposes native Android functionality to JavaScript through the standard React Native module pattern:
- `HeadlessPackage`: Registers the module
- `HeadlessModule`: Implements the actual functionality
- JavaScript wrapper in `src/Headless.js`

Key methods exposed:
- `startService()` - Start the headless service
- `stopService()` - Stop the headless service
- `toForeground()` - Bring app to foreground
- `toBackground()` - Send app to background
- `noLock()` - Handle lock screen (commented out)

## Sources

- src/Headless.js - JavaScript wrapper
- index.js - Module export
- android/.../HeadlessModule.java - Native module implementation
- android/.../HeadlessPackage.java - Package registration

## Validated Understanding

**Implementation Details:**

1. **Module Registration** (`HeadlessPackage.java`):
   - Implements `ReactPackage` interface
   - `createNativeModules()` adds `HeadlessModule` to module list
   - `createViewManagers()` returns empty list (no custom views)

2. **Native Module** (`HeadlessModule.java`):
   - Extends `ReactContextBaseJavaModule`
   - Constructor initializes `HandlerThread` with `THREAD_PRIORITY_FOREGROUND`
   - Thread priority set to `Thread.MAX_PRIORITY`
   - Methods exposed via `@ReactMethod` annotation

3. **Method Implementation**:
   - `toForeground()`: Launches MainActivity with `FLAG_ACTIVITY_NEW_TASK | Intent.EXTRA_DOCK_STATE_CAR`
   - `toBackground()`: Currently empty (no-op)
   - `startService()`: Starts `HeadlessService`
   - `stopService()`: Stops `HeadlessService`
   - `noLock()`: Commented out, intended for lock screen handling

4. **JavaScript Interface** (`src/Headless.js`):
   - Simple export: `export default Headless` from `NativeModules`
   - Alternative class-based implementation commented out

## Children

| Child | Status |
|-------|--------|
| - | N/A (leaf node) |

## Flow Recommendation

Type: SDD
Confidence: high
Rationale: Internal service logic, React Native module implementation detail

## Bubble Up

- Provides JavaScript bridge to native Android services
- Depends on foreground-service, headless-js modules
- Uses standard React Native module pattern

---

*Created by /legacy ENTERING phase, updated by SYNTHESIZING phase*
