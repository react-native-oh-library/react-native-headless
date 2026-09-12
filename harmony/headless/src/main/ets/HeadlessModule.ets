/**
 * react-native-headless 鸿蒙适配 ArkTS TurboModule 实现。
 *
 * 对应 Android 原实现（one.telefon.headless.HeadlessModule）：
 * - startService/stopService → backgroundTaskManager 长时任务（申请/取消），
 *   替代 Android 前台服务 + 常驻通知（长时任务申请成功后由系统发通知栏消息）。
 * - 长时任务运行期间以 2s 周期向 JS 发送 `HeadlessTick` 事件，替代
 *   HeadlessEventService 周期触发 registerHeadlessTask('HeadlessHandler')（能力降级项，
 *   RNOH 无 HeadlessJsTaskService 等价物，JS 侧以 DeviceEventEmitter 监听替代）。
 *   长时任务被系统/用户取消时向 JS 发送 `HeadlessTaskCancelled` 事件（API 15+ 监听）。
 * - toForeground → startAbility 拉起自身 UIAbility（对应 NEW_TASK 启动 MainActivity）。
 * - toBackground → moveAbilityToBackground（Android 原实现为空实现，鸿蒙侧提供真实能力）。
 * - noLock → no-op（Android 原实现即空实现，行为对等）。
 */

import { UITurboModule, UITurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from './generated/ts';
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { Want, wantAgent, WantAgent } from '@kit.AbilityKit';

/** 周期事件名（JS 侧 DeviceEventEmitter.addListener('HeadlessTick') 监听） */
export const HEADLESS_TICK_EVENT = 'HeadlessTick';

/** 长时任务被系统/用户取消事件名（JS 侧 DeviceEventEmitter.addListener('HeadlessTaskCancelled') 监听） */
export const HEADLESS_CANCELLED_EVENT = 'HeadlessTaskCancelled';

/** backgroundTaskManager 错误码 9800005：长时任务校验失败（stop 场景下即任务已不存在/重复取消） */
const ERR_TASK_VERIFY_FAILED = 9800005;

/** 无头任务名，对应 Android HeadlessEventService 的 'HeadlessHandler' */
const HEADLESS_TASK_NAME = 'HeadlessHandler';

/** 周期触发间隔，对应 Android HeadlessService 的 2000ms */
const TICK_INTERVAL_MS = 2000;

/** 长时任务类型：演示用 DATA_TRANSFER，实际业务须与 module.json5 声明的 backgroundModes 一致 */
const BG_MODE = backgroundTaskManager.BackgroundMode.DATA_TRANSFER;

/** 周期事件负载（JS 侧与 ArkTS 侧字段约定，两侧一致） */
export interface HeadlessTickPayload {
  /** 任务名，对应 Android HeadlessHandler */
  task: string;
  /** 本次长时任务周期内第几个 tick（从 1 开始） */
  tick: number;
  /** 事件产生时刻（epoch 毫秒） */
  timestamp: number;
}

/** 长时任务被取消事件负载 */
export interface HeadlessTaskCancelledPayload {
  /** 任务名，对应 Android HeadlessHandler */
  task: string;
  /** 取消原因（backgroundTaskManager.ContinuousTaskCancelReason：1=用户取消 2=系统取消 等） */
  reason: number;
}

export class HeadlessModule extends UITurboModule implements TM.HeadlessModule.Spec {
  public static readonly NAME = TM.HeadlessModule.NAME;

  /** 周期定时器句柄，-1 表示未启动 */
  private tickTimerId: number = -1;
  /** 周期计数，随 stopService 归零 */
  private tickCount: number = 0;
  /** 长时任务是否运行中 */
  private isRunning: boolean = false;
  /** 是否已注册 continuousTaskCancel 监听 */
  private hasCancelListener: boolean = false;
  /** continuousTaskCancel 回调（预创建，保存引用以便 off()） */
  private cancelCallback: ((info: backgroundTaskManager.ContinuousTaskCancelInfo) => void) | null = null;

  constructor(ctx: UITurboModuleContext) {
    super(ctx);
    this.cancelCallback = (info: backgroundTaskManager.ContinuousTaskCancelInfo) => {
      if (!this.isRunning) {
        return;
      }
      this.stopTicking();
      this.isRunning = false;
      const payload: HeadlessTaskCancelledPayload = {
        task: HEADLESS_TASK_NAME,
        reason: info.reason,
      };
      this.ctx.logger.warn(
        `HeadlessModule continuousTaskCancel: reason is ${info.reason} id is ${info.id}`);
      this.ctx.rnInstance.emitDeviceEvent(HEADLESS_CANCELLED_EVENT, payload);
    };
  }

  /**
   * 启动长时任务并开始周期向 JS 发送 HeadlessTick 事件。
   * 对应 Android startService()（启动 HeadlessService 前台服务）。
   */
  startService(): Promise<void> {
    // 上下文在每次调用时即时读取（UITurboModule 可能早于配置就绪被实例化）
    const abilityContext = this.ctx.uiAbilityContext;
    if (abilityContext === undefined || abilityContext.abilityInfo === undefined) {
      return Promise.reject(this.toBusinessError(-1, 'uiAbilityContext is not available'));
    }
    if (this.isRunning) {
      // 已在运行：直接成功（Android 重复 startService 会叠加周期任务，属原库缺陷，此处不复刻）
      return Promise.resolve();
    }
    const bundleName = abilityContext.abilityInfo.bundleName;
    const abilityName = abilityContext.abilityInfo.name;
    // 点击长时任务通知栏消息后拉起本应用（对应 Android 通知的 contentIntent → MainActivity）
    const wantAgentInfo: wantAgent.WantAgentInfo = {
      wants: [{
        bundleName: bundleName,
        abilityName: abilityName,
      }],
      actionType: wantAgent.OperationType.START_ABILITY,
      requestCode: 0,
      wantAgentFlags: [wantAgent.WantAgentFlags.UPDATE_PRESENT_FLAG],
    };
    return new Promise<void>((resolve, reject) => {
      wantAgent.getWantAgent(wantAgentInfo).then((wantAgentObj: WantAgent) => {
        backgroundTaskManager.startBackgroundRunning(abilityContext, BG_MODE, wantAgentObj)
          .then(() => {
            this.isRunning = true;
            this.tickCount = 0;
            this.startTicking();
            this.ensureCancelListener();
            this.ctx.logger.info('HeadlessModule startBackgroundRunning succeeded');
            resolve();
          })
          .catch((error: BusinessError) => {
            this.ctx.logger.error(
              `startBackgroundRunning failed. code is ${error.code} message is ${error.message}`);
            reject(this.toBusinessError(error.code, error.message));
          });
      }).catch((error: BusinessError) => {
        this.ctx.logger.error(
          `getWantAgent failed. code is ${error.code} message is ${error.message}`);
        reject(this.toBusinessError(error.code, error.message));
      });
    });
  }

  /**
   * 停止长时任务并停止周期事件。
   * 对应 Android stopService()（停止 HeadlessService、撤通知）。
   * 行为对等：Android stopService 对未启动的服务静默成功（返回 false 不抛异常），
   * 此处未运行时直接 resolve；任务已不存在（9800005，如被系统提前取消）也视为已停止。
   */
  stopService(): Promise<void> {
    const abilityContext = this.ctx.uiAbilityContext;
    if (abilityContext === undefined) {
      return Promise.reject(this.toBusinessError(-1, 'uiAbilityContext is not available'));
    }
    if (!this.isRunning) {
      // 未在运行：对齐 Android stopService 幂等语义，静默成功
      this.stopTicking();
      this.removeCancelListener();
      return Promise.resolve();
    }
    this.stopTicking();
    this.isRunning = false;
    this.removeCancelListener();
    return new Promise<void>((resolve, reject) => {
      backgroundTaskManager.stopBackgroundRunning(abilityContext)
        .then(() => {
          this.ctx.logger.info('HeadlessModule stopBackgroundRunning succeeded');
          resolve();
        })
        .catch((error: BusinessError) => {
          if (error.code === ERR_TASK_VERIFY_FAILED) {
            // 9800005：stop 场景下即长时任务已不存在（被系统取消后重复 stop），
            // 对齐 Android stopService 对未运行服务静默成功的语义
            this.ctx.logger.warn(
              `stopBackgroundRunning: task already gone (code ${error.code}), treated as stopped`);
            resolve();
            return;
          }
          this.ctx.logger.error(
            `stopBackgroundRunning failed. code is ${error.code} message is ${error.message}`);
          reject(this.toBusinessError(error.code, error.message));
        });
    });
  }

  /**
   * 将应用拉到前台。
   * 对应 Android toForeground()（NEW_TASK 启动 MainActivity，extras foreground=true）。
   * 应用在后台时受系统后台启动管控，可能失败（reject）。
   */
  toForeground(): Promise<void> {
    const abilityContext = this.ctx.uiAbilityContext;
    if (abilityContext === undefined || abilityContext.abilityInfo === undefined) {
      return Promise.reject(this.toBusinessError(-1, 'uiAbilityContext is not available'));
    }
    const want: Want = {
      bundleName: abilityContext.abilityInfo.bundleName,
      abilityName: abilityContext.abilityInfo.name,
      parameters: {
        'foreground': true,
      },
    };
    return new Promise<void>((resolve, reject) => {
      abilityContext.startAbility(want)
        .then(() => {
          this.ctx.logger.info('HeadlessModule toForeground succeeded');
          resolve();
        })
        .catch((error: BusinessError) => {
          this.ctx.logger.error(
            `toForeground failed. code is ${error.code} message is ${error.message}`);
          reject(this.toBusinessError(error.code, error.message));
        });
    });
  }

  /**
   * 将应用退到后台。
   * Android 原实现为空实现，鸿蒙侧映射 moveAbilityToBackground()（API 12+）。
   */
  toBackground(): Promise<void> {
    const abilityContext = this.ctx.uiAbilityContext;
    if (abilityContext === undefined) {
      return Promise.reject(this.toBusinessError(-1, 'uiAbilityContext is not available'));
    }
    return new Promise<void>((resolve, reject) => {
      abilityContext.moveAbilityToBackground()
        .then(() => {
          this.ctx.logger.info('HeadlessModule toBackground succeeded');
          resolve();
        })
        .catch((error: BusinessError) => {
          this.ctx.logger.error(
            `toBackground failed. code is ${error.code} message is ${error.message}`);
          reject(this.toBusinessError(error.code, error.message));
        });
    });
  }

  /**
   * 锁屏显示标志。
   * Android 原实现为空实现（窗口标志代码被注释未生效），此处行为对等：no-op。
   */
  noLock(): Promise<void> {
    return Promise.resolve();
  }

  /** TurboModule 销毁时释放定时器、长时任务与系统事件监听 */
  public __onDestroy__(): void {
    super.__onDestroy__();
    this.removeCancelListener();
    this.stopTicking();
    if (this.isRunning) {
      const abilityContext = this.ctx.uiAbilityContext;
      if (abilityContext !== undefined) {
        backgroundTaskManager.stopBackgroundRunning(abilityContext)
          .catch(() => {});
      }
      this.isRunning = false;
    }
    this.cancelCallback = null;
  }

  /**
   * 注册长时任务取消监听（API 15+）。
   * 长时任务可能被系统取消（如 DATA_TRANSFER 超 10 分钟未更新进度）或用户移除通知，
   * 此时需同步内部运行态并通知 JS，避免 isRunning 漂移（startService 假成功/tick 空转）。
   * API 15 以下设备 on('continuousTaskCancel') 会同步抛 401，try-catch 兜底（仅无取消通知，
   * stopService 的 9800005 容错仍可解除状态死锁）。
   */
  private ensureCancelListener(): void {
    if (this.hasCancelListener || !this.cancelCallback) {
      return;
    }
    try {
      backgroundTaskManager.on('continuousTaskCancel', this.cancelCallback);
      this.hasCancelListener = true;
    } catch (error) {
      const e = error as BusinessError;
      this.ctx.logger.warn(
        `on('continuousTaskCancel') unavailable (code ${e.code}), skip cancel sync`);
    }
  }

  private removeCancelListener(): void {
    if (this.hasCancelListener && this.cancelCallback) {
      try {
        backgroundTaskManager.off('continuousTaskCancel', this.cancelCallback);
      } catch (_error) {
        // API 15 以下 off() 可能不可用，静默处理
      }
      this.hasCancelListener = false;
    }
  }

  /** 启动周期事件：立即发一次，之后每 TICK_INTERVAL_MS 一次（对应 Android 先 post 再 postDelayed） */
  private startTicking(): void {
    this.emitTick();
    this.tickTimerId = setInterval(() => {
      this.emitTick();
    }, TICK_INTERVAL_MS);
  }

  /** 停止周期事件并释放定时器句柄 */
  private stopTicking(): void {
    if (this.tickTimerId !== -1) {
      clearInterval(this.tickTimerId);
      this.tickTimerId = -1;
    }
    this.tickCount = 0;
  }

  /** 向 JS 侧发送一次 HeadlessTick 事件 */
  private emitTick(): void {
    this.tickCount += 1;
    const payload: HeadlessTickPayload = {
      task: HEADLESS_TASK_NAME,
      tick: this.tickCount,
      timestamp: Date.now(),
    };
    this.ctx.rnInstance.emitDeviceEvent(HEADLESS_TICK_EVENT, payload);
  }

  /** 组装跨桥错误对象（保证 code/message 字段完整传到 JS 侧） */
  private toBusinessError(code: number, message: string): BusinessError {
    const error: BusinessError = {
      code: code,
      message: message,
      name: 'BusinessError',
    };
    return error;
  }
}
