# Understanding: Headless JS

> Headless JS task execution mechanism for background JavaScript

## Phase: SYNTHESIZING

## Hypothesis

`HeadlessEventService` extends `HeadlessJsTaskService` to execute JavaScript tasks in the background. Key characteristics:
- Configures task name as "HeadlessHandler"
- 5 second timeout for tasks
- Allows execution while app is in foreground
- Receives data from intent extras
- Triggered periodically by `HeadlessService`

## Sources

- android/.../HeadlessEventService.java - Headless JS task service

## Validated Understanding

**Implementation Details:**

1. **Task Configuration** (`getTaskConfig()`):
   - Task name: `"HeadlessHandler"` (must match JS registration)
   - Data: From intent extras via `Arguments.fromBundle(extras)`
   - Timeout: 5000ms (5 seconds)
   - Allow while foreground: `true`

2. **Execution Flow**:
   - `HeadlessService` starts `HeadlessEventService` via intent
   - `HeadlessEventService` acquires WakeLock via `HeadlessJsTaskService.acquireWakeLockNow()`
   - React Native runtime executes JavaScript task named "HeadlessHandler"
   - Task must complete within 5 seconds or will be killed

3. **Integration Point**:
   - JavaScript side must register task:
     ```javascript
     AppRegistry.registerHeadlessTask('HeadlessHandler', () => myTask);
     ```
   - Task receives data passed from native side

## Children

| Child | Status |
|-------|--------|
| - | N/A (leaf node) |

## Flow Recommendation

Type: SDD
Confidence: high
Rationale: Internal service logic, React Native headless JS implementation

## Bubble Up

- Executes JavaScript in background
- Triggered by foreground-service
- Requires JavaScript task registration

---

*Created by /legacy ENTERING phase, updated by SYNTHESIZING phase*
