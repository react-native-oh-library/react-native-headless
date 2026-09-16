import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * react-native-headless 鸿蒙适配 TurboModule Spec。
 *
 * 由旧架构（ReactContextBaseJavaModule + NativeModules 直取）转换而来。
 * 模块名统一为 `HeadlessModule`（与 Android 原生注册名、TurboModuleRegistry.get 一致，
 * 修复原库 src/Headless.js 解构 NativeModules.Headless 得到 undefined 的缺陷）。
 */
export interface Spec extends TurboModule {
  /**
   * 启动后台长时任务（对应 Android 启动 HeadlessService 前台服务）。
   * 申请成功后系统通知栏出现任务运行通知，应用退后台不被冻结；
   * 任务运行期间原生侧以 2s 周期向 JS 发送 `HeadlessTick` 事件
   * （对应 Android HeadlessEventService 周期触发 registerHeadlessTask('HeadlessHandler')）。
   * 失败时 reject（BusinessError: code/message）。
   */
  startService(): Promise<void>;

  /**
   * 停止后台长时任务，撤销通知与周期事件（对应 Android stopService）。
   * 失败时 reject（BusinessError: code/message）。
   */
  stopService(): Promise<void>;

  /**
   * 将应用拉到前台（对应 Android 以 FLAG_ACTIVITY_NEW_TASK 启动 MainActivity）。
   * 应用处于后台时受系统后台启动管控，可能 reject。
   */
  toForeground(): Promise<void>;

  /**
   * 将应用退到后台（Android 原实现为空实现，鸿蒙侧映射 moveAbilityToBackground）。
   */
  toBackground(): Promise<void>;

  /**
   * 锁屏显示标志（Android 原实现为空实现——相关窗口标志代码被注释未生效）。
   * 行为对等：resolve，不做任何操作。
   */
  noLock(): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('HeadlessModule');
