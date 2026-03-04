# Understanding: Boot Receiver

> Device boot broadcast receiver for auto-starting the headless service

## Phase: SYNTHESIZING

## Hypothesis

`BootUpReceiver` is a `BroadcastReceiver` that listens for device boot completion and automatically starts the headless service. Key characteristics:
- Receives `BOOT_COMPLETED` broadcast (needs permission)
- Starts `HeadlessService` on boot
- Simple implementation - single line in `onReceive()`

## Sources

- android/.../BootUpReceiver.java - Boot broadcast receiver

## Validated Understanding

**Implementation Details:**

1. **Broadcast Receiver**:
   - Extends `BroadcastReceiver`
   - `onReceive()`: Single line - starts `HeadlessService`
   - No additional logic or validation

2. **Required Manifest Entries** (not in code, needed for functionality):
   ```xml
   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
   <receiver android:name=".BootUpReceiver">
       <intent-filter>
           <action android:name="android.intent.action.BOOT_COMPLETED" />
       </intent-filter>
   </receiver>
   ```

3. **Execution Flow**:
   - Device boots
   - System broadcasts `BOOT_COMPLETED`
   - `BootUpReceiver.onReceive()` called
   - `HeadlessService` started automatically

## Children

| Child | Status |
|-------|--------|
| - | N/A (leaf node) |

## Flow Recommendation

Type: SDD
Confidence: high
Rationale: Internal service logic, Android broadcast receiver

## Bubble Up

- Auto-starts service on device boot
- Depends on foreground-service
- Requires RECEIVE_BOOT_COMPLETED permission

---

*Created by /legacy ENTERING phase, updated by SYNTHESIZING phase*
