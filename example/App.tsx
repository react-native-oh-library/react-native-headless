/**
 * react-native-headless 鸿蒙适配 Example
 *
 * 覆盖全部 5 个公开 API（startService / stopService / toForeground /
 * toBackground / noLock）与降级能力 HeadlessTick 周期事件监听，
 * 每个操作均展示真实返回值（成功 / BusinessError code+message）。
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AppState,
  DeviceEventEmitter,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Headless from 'react-native-headless';

// Hermes 无 Intl，用 Date getter 手拼时间（HH:mm:ss）
function formatTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => (n < 10 ? '0' + n : '' + n);
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

type LogItem = {
  id: number;
  time: string;
  api: string;
  ok: boolean;
  detail: string;
};

type TickInfo = {
  task: string;
  tick: number;
  timestamp: number;
};

const MAX_LOGS = 50;

function App(): JSX.Element {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [tickInfo, setTickInfo] = useState<TickInfo | null>(null);
  const [tickTotal, setTickTotal] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [appState, setAppState] = useState<string>(
    AppState.currentState === undefined ? 'unknown' : AppState.currentState,
  );
  // toBackground 后自动回前台（模拟原库来电场景：后台事件把应用拉回前台）
  const [autoReturn, setAutoReturn] = useState(true);
  const logIdRef = useRef<number>(0);
  const autoReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendLog = useCallback((api: string, ok: boolean, detail: string) => {
    logIdRef.current += 1;
    const item: LogItem = {
      id: logIdRef.current,
      time: formatTime(Date.now()),
      api: api,
      ok: ok,
      detail: detail,
    };
    setLogs(prev => [item, ...prev].slice(0, MAX_LOGS));
  }, []);

  // 调用库方法并记录真实结果（成功 / BusinessError code+message）
  const callApi = useCallback(
    (api: string, fn: () => Promise<void>, onDone?: (ok: boolean) => void) => {
      if (!Headless) {
        appendLog(api, false, '模块未注册（TurboModule HeadlessModule 不可用）');
        return;
      }
      fn()
        .then(() => {
          appendLog(api, true, 'resolve（成功）');
          if (onDone) {
            onDone(true);
          }
        })
        .catch((error: {code?: number; message?: string}) => {
          const code = error && error.code !== undefined ? error.code : '?';
          const message =
            error && error.message !== undefined ? error.message : String(error);
          appendLog(api, false, `reject code=${code} message=${message}`);
          if (onDone) {
            onDone(false);
          }
        });
    },
    [appendLog],
  );

  const onStartService = useCallback(() => {
    callApi('startService', () => Headless.startService(), ok => {
      if (ok) {
        setIsRunning(true);
        setTickTotal(0);
        setTickInfo(null);
      }
    });
  }, [callApi]);

  const onStopService = useCallback(() => {
    callApi('stopService', () => Headless.stopService(), ok => {
      if (ok) {
        setIsRunning(false);
      }
    });
  }, [callApi]);

  const onToForeground = useCallback(() => {
    callApi('toForeground', () => Headless.toForeground());
  }, [callApi]);

  const onToBackground = useCallback(() => {
    callApi('toBackground', () => Headless.toBackground(), ok => {
      if (ok && autoReturn) {
        // 后台停留 5s 后拉回前台：真实还原原库场景
        // （HeadlessHandler 收到来电 → toForeground 把应用带回前台）
        if (autoReturnTimerRef.current !== null) {
          clearTimeout(autoReturnTimerRef.current);
        }
        autoReturnTimerRef.current = setTimeout(() => {
          autoReturnTimerRef.current = null;
          callApi('toForeground(自动)', () => Headless.toForeground());
        }, 5000);
      }
    });
  }, [callApi, autoReturn]);

  const onNoLock = useCallback(() => {
    callApi('noLock', () => Headless.noLock());
  }, [callApi]);

  // HeadlessTick 周期事件监听（对应 Android registerHeadlessTask('HeadlessHandler')，
  // 鸿蒙无 HeadlessJsTaskService，降级为 DeviceEventEmitter 事件）
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'HeadlessTick',
      (payload: TickInfo) => {
        if (payload && typeof payload.tick === 'number') {
          setTickInfo(payload);
          setTickTotal(payload.tick);
          setIsRunning(true);
        }
      },
    );
    // 长时任务被系统/用户取消（如 DATA_TRANSFER 超 10 分钟未更新进度）：
    // 库侧同步状态并通知 JS，Example 更新运行态展示
    const cancelSubscription = DeviceEventEmitter.addListener(
      'HeadlessTaskCancelled',
      (payload: {task?: string; reason?: number}) => {
        const reasonText =
          payload && typeof payload.reason === 'number'
            ? payload.reason === 1
              ? '用户取消（移除通知）'
              : payload.reason === 2
                ? '系统取消'
                : `reason=${payload.reason}`
            : '未知原因';
        setIsRunning(false);
        appendLog('HeadlessTaskCancelled', false, `长时任务已停止：${reasonText}`);
      },
    );
    return () => {
      subscription.remove();
      cancelSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 前后台状态变化展示（toBackground 副作用可见）
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // 卸载时清理自动回前台定时器
  useEffect(() => {
    return () => {
      if (autoReturnTimerRef.current !== null) {
        clearTimeout(autoReturnTimerRef.current);
        autoReturnTimerRef.current = null;
      }
    };
  }, []);

  const statusColor = isRunning ? '#2e7d32' : '#757575';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>react-native-headless 鸿蒙适配</Text>
        <Text style={styles.subtitle}>
          长时任务 / 前后台切换 Example（HarmonyOS）
        </Text>

        {!Headless ? (
          <View style={[styles.card, {borderColor: '#c62828'}]}>
            <Text style={styles.errorText}>
              HeadlessModule 不可用：TurboModule 未注册，请检查 RNOHPackagesFactory
            </Text>
          </View>
        ) : null}

        {/* 状态总览 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>状态</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>长时任务</Text>
            <Text style={[styles.statusValue, {color: statusColor}]}>
              {isRunning ? '运行中' : '未运行'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>应用前后台</Text>
            <Text style={styles.statusValue}>{appState}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Tick 计数</Text>
            <Text style={styles.statusValue}>{tickTotal}</Text>
          </View>
        </View>

        {/* API：startService / stopService */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>后台长时任务</Text>
          <Text style={styles.cardDesc}>
            startService 申请长时任务（对应 Android 前台服务，通知栏出现任务通知）；{'\n'}
            运行期间每 2s 向 JS 发送 HeadlessTick 事件{'\n'}
            注：演示用 DATA_TRANSFER 类型，超 10 分钟未更新进度会被系统取消（收到
            HeadlessTaskCancelled 事件），实际业务应换用匹配的类型
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="btn-start-service"
              style={[styles.button, styles.buttonPrimary]}
              onPress={onStartService}>
              <Text style={styles.buttonText}>startService()</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="btn-stop-service"
              style={[styles.button, styles.buttonDanger]}
              onPress={onStopService}>
              <Text style={styles.buttonText}>stopService()</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* HeadlessTick 事件实时展示 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>HeadlessTick 事件（降级能力）</Text>
          <Text style={styles.cardDesc}>
            Android 端为 registerHeadlessTask('HeadlessHandler') 每 2s 触发；
            RNOH 无 HeadlessJsTaskService，降级为原生周期事件，此处为真实监听结果
          </Text>
          {tickInfo ? (
            <View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>task</Text>
                <Text style={styles.statusValue}>{tickInfo.task}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>tick</Text>
                <Text style={styles.statusValue}>#{tickInfo.tick}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>timestamp</Text>
                <Text style={styles.statusValue}>
                  {tickInfo.timestamp}（{formatTime(tickInfo.timestamp)}）
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.hintText}>
              未收到事件（startService 成功后每 2s 到达一次）
            </Text>
          )}
        </View>

        {/* API：toForeground / toBackground */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>前后台切换</Text>
          <Text style={styles.cardDesc}>
            toBackground 会退到后台（可开启 5s 后自动 toForeground 模拟来电拉回场景）；
            应用在后台时 toForeground 受系统管控可能被拒绝
          </Text>
          <TouchableOpacity
            testID="btn-auto-return"
            style={[styles.button, autoReturn ? styles.buttonPrimary : styles.buttonGhost]}
            onPress={() => setAutoReturn(prev => !prev)}>
            <Text style={autoReturn ? styles.buttonText : styles.buttonGhostText}>
              自动回前台：{autoReturn ? '开' : '关'}
            </Text>
          </TouchableOpacity>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="btn-to-foreground"
              style={[styles.button, styles.buttonPrimary]}
              onPress={onToForeground}>
              <Text style={styles.buttonText}>toForeground()</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="btn-to-background"
              style={[styles.button, styles.buttonDanger]}
              onPress={onToBackground}>
              <Text style={styles.buttonText}>toBackground()</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* API：noLock */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>noLock()</Text>
          <Text style={styles.cardDesc}>
            Android 原实现为空实现（锁屏窗口标志代码未生效），鸿蒙侧行为对等：no-op
          </Text>
          <TouchableOpacity
            testID="btn-no-lock"
            style={[styles.button, styles.buttonPrimary]}
            onPress={onNoLock}>
            <Text style={styles.buttonText}>noLock()</Text>
          </TouchableOpacity>
        </View>

        {/* 平台差异明示 */}
        <View style={[styles.card, {borderColor: '#ef6c00'}]}>
          <Text style={styles.cardTitle}>平台能力差异</Text>
          <Text style={styles.cardDesc}>
            ⛔ 开机自启（Android BootUpReceiver / BOOT_COMPLETED）：鸿蒙不向三方应用开放开机广播，{'\n'}
            本库在鸿蒙端不支持该能力，无替代实现{'\n'}
            ⚠️ Headless JS 无头任务：进程模型不同，降级为长时任务周期事件（见上方 HeadlessTick）
          </Text>
        </View>

        {/* 结果日志面板 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>调用结果（真实返回）</Text>
          {logs.length === 0 ? (
            <Text style={styles.hintText}>暂无调用记录</Text>
          ) : (
            logs.map(item => (
              <View key={item.id} style={styles.logRow}>
                <Text style={[styles.logTime, {color: item.ok ? '#2e7d32' : '#c62828'}]}>
                  {item.time} {item.ok ? '✓' : '✗'}
                </Text>
                <Text style={styles.logApi}>{item.api}</Text>
                <Text style={styles.logDetail}>{item.detail}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  subtitle: {
    fontSize: 13,
    color: '#757575',
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#757575',
    lineHeight: 18,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  statusLabel: {
    fontSize: 13,
    color: '#616161',
  },
  statusValue: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonPrimary: {
    backgroundColor: '#1565c0',
  },
  buttonDanger: {
    backgroundColor: '#c62828',
  },
  buttonGhost: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#9e9e9e',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonGhostText: {
    color: '#616161',
    fontSize: 13,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: '#9e9e9e',
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
  },
  logRow: {
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eeeeee',
  },
  logTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  logApi: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '600',
  },
  logDetail: {
    fontSize: 11,
    color: '#616161',
  },
});

export default App;
