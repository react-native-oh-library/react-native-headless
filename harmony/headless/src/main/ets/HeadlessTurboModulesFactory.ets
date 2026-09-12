/**
 * react-native-headless 鸿蒙适配 RNOHPackage 注册入口。
 *
 * HeadlessPackage 经 ohos/package.json 的 harmony.autolinking
 * （etsPackageClassName: HeadlessPackage）由 hvigor autolink 注入 example；
 * index.ets 以 default 导出本 Package 供 HAR autolink 消费。
 */

import { RNOHPackage } from '@rnoh/react-native-openharmony/ets';
import type { UITurboModule, UITurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { HeadlessModule } from './HeadlessModule';
import { TM } from './generated/ts';

export class HeadlessPackage extends RNOHPackage {
  getUITurboModuleFactoryByNameMap(): Map<string, (ctx: UITurboModuleContext) => UITurboModule | null> {
    const map = new Map<string, (ctx: UITurboModuleContext) => UITurboModule | null>();
    map.set(TM.HeadlessModule.NAME, (ctx: UITurboModuleContext) => new HeadlessModule(ctx));
    return map;
  }

  override async createEagerUITurboModuleByNameMap(ctx: UITurboModuleContext): Promise<Map<string, UITurboModule>> {
    const module = new HeadlessModule(ctx);
    return new Map<string, UITurboModule>()
      .set(TM.HeadlessModule.NAME, module);
  }
}
