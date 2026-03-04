# Understanding: Foreground Service

> Android foreground service for persistent background execution

## Phase: SYNTHESIZING

## Hypothesis

`HeadlessService` is an Android `Service` that runs as a foreground service with a persistent notification. Key characteristics:
- Uses `startForeground()` with notification
- Creates notification channel for Android 8.0+
- Uses `Handler` to periodically trigger `HeadlessEventService` (every 2 seconds)
- Uses `WakeLock` to keep CPU running
- Returns `START_STICKY` to restart if killed

## Sources

- android/.../HeadlessService.java - Foreground service implementation

## Validated Understanding

**Implementation Details:**

1. **Service Configuration**:
   - Extends Android `Service` class
   - Notification ID: 123456
   - Channel ID: "HEADLESS"
   - Channel name: "HEADLESS"
   - Channel description: "CHANEL DESCRIPTION" (typo in original)

2. **Execution Model**:
   - Uses `Handler` with `postDelayed()` for recurring execution
   - Interval: 2000ms (2 seconds)
   - Each tick: Starts `HeadlessEventService` and acquires WakeLock

3. **Foreground Service**:
   - Creates notification channel (API 26+)
   - Builds notification with:
     - Title: "Headless service"
     - Text: "Running..."
     - Small icon: `R.mipmap.ic_launcher`
     - Content intent: Opens `MainActivity`
     - Ongoing: true
   - Calls `startForeground(SERVICE_NOTIFICATION_ID, notification)`

4. **Lifecycle**:
   - `onCreate()`: Calls super, no additional setup
   - `onStartCommand()`: Posts handler, creates channel, starts foreground, returns `START_STICKY`
   - `onDestroy()`: Removes callbacks, calls super
   - `onBind()`: Returns null (not bindable)

## Children

| Child | Status |
|-------|--------|
| - | N/A (leaf node) |

## Flow Recommendation

Type: SDD
Confidence: high
Rationale: Internal service logic, Android service implementation

## Bubble Up

- Provides persistent background execution
- Triggers headless-js module every 2 seconds
- Requires foreground service permission

---

*Created by /legacy ENTERING phase, updated by SYNTHESIZING phase*
