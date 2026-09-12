> 文档模板：v0.4.2

<p align="center">
  <h1 align="center"> <code>react-native-headless</code> </h1>
</p>

本项目基于 [react-native-headless](https://github.com/telefon-one/react-native-headless) 开发。
版本所属关系如下：

| 三方库名称 | 三方库版本（npm 地址） | 发布信息 | 支持 RN 版本 | Autolink | 编译 API 版本 | 社区基线版本 | 源码地址 |
| ------------ | ------------ | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| react-native-headless | [~0.0.5](https://www.npmjs.com/package/react-native-headless) | [GitHub Releases](https://github.com/react-native-oh-library/react-native-headless/releases) | 0.84.* | 是 | API12+ | 0.0.4 | [master](https://github.com/react-native-oh-library/react-native-headless/tree/master) |

## 简介

本库为 React Native 提供后台任务保活、前后台切换等原生能力封装。

## 下载安装

进入到工程目录并输入以下命令：

**npm**

```bash
npm install @react-native-ohos/react-native-headless
```

**yarn**

```bash
yarn add @react-native-ohos/react-native-headless
```

## Link

| 版本 | 是否支持 Autolink | RN 框架版本 |
|--------------------------------------|----------------|-----------|
| ～0.0.5 | 是 | 0.84.* |

使用 AutoLink 的工程需要根据该文档配置，Autolink 框架指导文档：[Autolinking 文档](https://gitcode.com/CPF-RN/ohos_react_native/blob/master/docs/zh-cn/Autolinking.md)

如您使用的版本支持 Autolink，并且工程已接入 Autolink，可跳过 ManualLink 配置。

<details>
  <summary>ManualLink：此步骤为手动配置原生依赖项的指导</summary>

首先需要使用 DevEco Studio 打开项目里的 HarmonyOS 工程 `harmony`。

### 1. Overrides RN SDK

为了让工程依赖同一个版本的 RN SDK，需要在工程根目录的 `oh-package.json5` 添加 overrides 字段：

```json
{
  "overrides": {
    "@rnoh/react-native-openharmony": "～0.84.1"
  }
}
```

关于该字段的作用请阅读[官方说明](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/ide-oh-package-json5-V5#zh-cn_topic_0000001792256137_overrides)。

### 2. 引入原生端代码

方法一：通过 har 包引入（推荐）

> [!TIP] har 包位于三方库安装路径的 `harmony/headless.har`。

打开 `entry/oh-package.json5`，添加以下依赖：

```json
"dependencies": {
  "react-native-headless": "file:../../node_modules/react-native-headless/harmony/headless.har"
}
```

点击右上角的 `sync` 按钮，或在终端执行：

```bash
cd entry
ohpm install
```

方法二：直接链接源码

> [!TIP] 如需使用直接链接源码，请参考[直接链接源码说明](https://gitcode.com/CPF-RN/usage-docs/blob/master/zh-cn/link-source-code.md)。

### 3. 配置 CMakeLists 和引入 HeadlessPackage

打开 `entry/src/main/cpp/CMakeLists.txt`，添加：

```cmake
set(OH_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")

add_subdirectory("${OH_MODULES}/react-native-headless/src/main/cpp" ./headless)

target_link_libraries(rnoh_app PUBLIC headless)
```

打开 `entry/src/main/cpp/PackageProvider.cpp`，添加：

```cpp
#include "HeadlessPackage.h"

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx) {
    return {
        std::make_shared<HeadlessPackage>(ctx),
    };
}
```

### 4. 在 ArkTS 侧引入 HeadlessPackage

打开 `entry/src/main/ets/RNOHPackagesFactory.ets`，添加：

```typescript
import HeadlessPackage from 'react-native-headless';

export function createRNOHPackages(ctx: RNPackageContext): RNOHPackage[] {
  return [
    new HeadlessPackage(ctx),
  ];
}
```

</details>

### 运行

点击右上角的 `sync` 按钮，或在命令行终端执行：

```bash
cd entry
ohpm install
```

然后编译、运行即可。

## 约束与限制

### 兼容性

本文档内容基于以下版本验证通过：

1.RNOH: 0.84.2; SDK: HarmonyOS 6.0.0 Release SDK; IDE: DevEco Studio 6.0.2.636; ROM: 6.0.0.125;

### 权限要求

在宿主工程 `entry/src/main/module.json5` 中声明：

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

> [!TIP] `backgroundModes` 须与真实业务匹配。示例使用 `dataTransfer`（DATA_TRANSFER），若超 10 分钟未更新传输进度，系统会取消长时任务。实际业务应改用匹配类型（如 `audioPlayback`、`location` 等）。

JS Bundle 路径：`example/harmony/entry/src/main/resources/rawfile/bundle.harmony.js`（由 `npm run dev` 生成）。

### 编译运行 API 要求

> [!TIP] 当前三方库支持在 `API12+` 工程编译，及 `API12+` ROM 运行。

> [!TIP] 以下功能依赖特定版本的 API，使用低于指定 API 版本的 ROM 运行可能导致部分功能受限。

1. `toBackground()` 映射 `UIAbilityContext.moveAbilityToBackground()`，需要 **API 12+**。
2. `HeadlessTaskCancelled` 事件依赖 `backgroundTaskManager.on('continuousTaskCancel')`，需要 **API 15+**；低版本设备收不到该事件，但不影响 `stopService()` 复位。

## 使用示例

下面的代码展示了这个库的基本使用场景：

> [!WARNING] 使用时 import 的库名不变。

```javascript
import Headless from 'react-native-headless';
import { DeviceEventEmitter } from 'react-native';

// 启动后台长时任务（Harmony：backgroundTaskManager；Android：Foreground Service）
await Headless.startService();

// 监听周期事件（Harmony 降级替代 registerHeadlessTask('HeadlessHandler')）
const tickSub = DeviceEventEmitter.addListener('HeadlessTick', (payload) => {
  console.log(payload.task, payload.tick, payload.timestamp);
});

// 长时任务被系统/用户取消
const cancelSub = DeviceEventEmitter.addListener('HeadlessTaskCancelled', (payload) => {
  console.log('cancelled, reason =', payload.reason);
});

// 停止
await Headless.stopService();

// 前后台（见下方使用说明中的平台差异）
await Headless.toForeground();
await Headless.toBackground();
```

## 使用说明

**后台长时任务**

```javascript
await Headless.startService();
// 运行期间 Harmony 每 2s 发送 HeadlessTick；Android 通过 HeadlessEventService 触发 HeadlessHandler
await Headless.stopService(); // 幂等：未运行时静默成功
```

**Android 无头任务注册（仅 Android）**

```javascript
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask('HeadlessHandler', () => async (data) => {
  // 后台 JS 逻辑
});
```

> HarmonyOS 无 `HeadlessJsTaskService` 等价物，请改用 `DeviceEventEmitter.addListener('HeadlessTick', ...)`。

**前后台切换**

```javascript
// 退到后台（Harmony 真实能力；Android 上游为空实现）
await Headless.toBackground();

// 尝试拉到前台
await Headless.toForeground();
// ⚠️ Harmony：应用在后台时，普通三方应用无法主动 startAbility 拉起自身
//    （需 ohos.permission.START_ABILITIES_FROM_BACKGROUND，仅系统应用可申请）
//    推荐通过 startService 时长时任务通知 + 用户点击 WantAgent 回前台
```

**锁屏相关**

```javascript
await Headless.noLock(); // Android/鸿蒙均为 no-op（与 Android 源码空实现对等，不提供锁屏穿透）
```

## 接口说明

> [!TIP] 「Platform」列表示该属性/接口在原三方库上支持的平台。

> [!TIP] 「HarmonyOS 平台支持」列为 yes 表示 HarmonyOS 平台完整支持；no 表示不支持；partially 表示部分支持。使用方法跨平台一致，效果对标 Android 上游实现或官方允许的等价能力。

### 模块导出

| 名称 | 类型 | 必填 | Platform | HarmonyOS 平台支持 | 描述 |
|------|------|------|----------|-------------------|------|
| Headless | `NativeModule` / `TurboModule` | 是 | Android, HarmonyOS | yes | 默认导出，模块名 `HeadlessModule` |

### API

| 名称 | 类型 | 参数类型 | 返回值 | 必填 | Platform | HarmonyOS 平台支持 | 描述 |
|------|------|----------|--------|------|----------|-------------------|------|
| startService | function | 无 | `Promise<void>` | 否 | Android, HarmonyOS | yes | 启动后台任务。Harmony：申请长时任务 + 系统通知；Android：启动 Foreground Service。成功后 Harmony 每 2s 发送 `HeadlessTick`。重复调用幂等。 |
| stopService | function | 无 | `Promise<void>` | 否 | Android, HarmonyOS | yes | 停止后台任务，撤销通知与周期事件。未运行时静默成功（与 Android 语义对等）。 |
| toForeground | function | 无 | `Promise<void>` | 否 | Android, HarmonyOS | partially | 尝试将应用拉到前台。Android：`startActivity(MainActivity)` 可从后台拉起。Harmony：`startAbility` 拉起自身 UIAbility；**应用在后台时普通三方应用会被系统拒绝**（[组件启动规则](https://gitcode.com/openharmony/docs/blob/OpenHarmony-6.0-Release/zh-cn/application-dev/application-models/component-startup-rules.md)）。 |
| toBackground | function | 无 | `Promise<void>` | 否 | Android, HarmonyOS | yes | 将应用退到后台。Harmony：`moveAbilityToBackground()`（API 12+，真实能力）。Android 上游为空实现。 |
| noLock | function | 无 | `Promise<void>` | 否 | Android, HarmonyOS | yes | 占位 API，立即 resolve，**不做任何操作**。对标 Android 源码空实现（`FLAG_SHOW_WHEN_LOCKED` 代码被注释未生效），不提供锁屏穿透。 |

### 事件

| 名称 | 参数类型 | Platform | HarmonyOS 平台支持 | 描述 |
|------|----------|----------|-------------------|------|
| HeadlessTick | [HeadlessTickPayload](#HeadlessTickPayload) | HarmonyOS | yes | 长时任务运行期间每 2s 触发，降级替代 Android `registerHeadlessTask('HeadlessHandler')`。 |
| HeadlessTaskCancelled | [HeadlessTaskCancelledPayload](#HeadlessTaskCancelledPayload) | HarmonyOS | partially | 长时任务被系统/用户取消时触发（API 15+）。 |

#### HeadlessTickPayload

| 名称 | 参数类型 | 默认值 | 必填 | 描述 |
|------|----------|--------|------|------|
| task | string | `"HeadlessHandler"` | 是 | 任务名，对应 Android HeadlessEventService 注册的 taskName |
| tick | number | — | 是 | 本次长时任务周期内第几个 tick（从 1 开始） |
| timestamp | number | — | 是 | 事件产生时刻（epoch 毫秒） |

#### HeadlessTaskCancelledPayload

| 名称 | 参数类型 | 默认值 | 必填 | 描述 |
|------|----------|--------|------|------|
| task | string | `"HeadlessHandler"` | 是 | 任务名 |
| reason | number | — | 是 | 取消原因：`1`=用户取消（移除通知），`2`=系统取消，等 |

### 未实现功能

| 能力 | Platform | HarmonyOS 平台支持 | 原因 |
|------|----------|-------------------|------|
| 开机自启（BootUpReceiver / BOOT_COMPLETED） | Android | no | HarmonyOS 不向三方应用开放开机广播；`ohos.permission.RECEIVER_STARTUP_COMPLETED` 仅系统应用可申请 |
| AppRegistry.registerHeadlessTask | Android | no | RNOH 无 HeadlessJsTaskService 等价物，已降级为 `HeadlessTick` 事件 |
| 锁屏穿透显示 | Android, HarmonyOS | no | Android 源码未实现；Harmony 需 [Live View Kit](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/liveview-preparations) |

## 快速验证（运行 Example）

### 前置条件

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18 |
| DevEco Studio | 5.0+ / 6.0+ |
| HarmonyOS SDK | API 12+ |

### 运行步骤

```bash
# 1. 根目录安装并构建 JS 产物
npm install --legacy-peer-deps

# 2. 安装 example 依赖
cd example
npm install --legacy-peer-deps

# 3. 生成 Harmony JS Bundle
npm run dev

# 4. DevEco Studio 打开 example/harmony，Sync 后编译运行
```

> Example 已预置插件依赖与 Package 注册，无需手动 Link。

## 遗留问题

- `toForeground()` 在 HarmonyOS 后台场景下无法可靠自动拉回前台，需改用长时任务通知 + 用户点击（系统 [组件启动规则](https://gitcode.com/openharmony/docs/blob/OpenHarmony-6.0-Release/zh-cn/application-dev/application-models/component-startup-rules.md) 限制）。
- `HeadlessTaskCancelled` 依赖 API 15+ 的 `continuousTaskCancel` 事件；API 12–14 设备收不到该事件。
- 示例使用 `DATA_TRANSFER` 长时任务类型，超 10 分钟未更新进度会被系统取消。

## 其他

- import 包名始终为 `'react-native-headless'`，Harmony 侧通过 RNOH alias 映射到原生 HAR。
- Android 上游原生代码见 [telefon-one/react-native-headless](https://github.com/telefon-one/react-native-headless)；本仓库当前分支以 HarmonyOS 适配为主。

## 目录结构

````
react-native-headless/          # 项目根目录
├── harmony/                    # 鸿蒙适配代码
│   ├── headless.har            # 预构建 har 包
│   └── headless/               # 鸿蒙适配核心代码
│       ├── index.ets           # 鸿蒙适配入口（导出 HeadlessPackage）
│       └── src/main/ets/
│           ├── HeadlessModule.ets              # TurboModule 实现
│           └── HeadlessTurboModulesFactory.ets # Package 注册
├── src/                        # RN JS 源码
│   ├── index.js                # 入口（导出 Headless）
│   ├── Headless.js             # 跨平台模块获取
│   └── specs/NativeHeadlessModule.ts  # TurboModule Spec
├── dist/                       # bob 构建产物（npm 发布入口）
├── example/                    # HarmonyOS 示例工程
│   ├── App.tsx
│   └── harmony/                # DevEco 工程
├── jest/                       # 单元测试
├── README.md                   # 中文文档
└── README_en.md                # 英文文档
````

## 贡献代码

使用过程中发现任何问题都可以提交 [Issue](https://github.com/telefon-one/react-native-headless/issues)，也非常欢迎提交 [PR](https://github.com/telefon-one/react-native-headless/pulls)。

## 开源协议

本项目基于 [ISC License](https://github.com/telefon-one/react-native-headless/blob/master/LICENSE)（原始库协议）。
