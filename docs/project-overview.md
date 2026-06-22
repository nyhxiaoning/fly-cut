# Fly-Cut 项目概览

> 浏览器端视频编辑器（类似 CapCut Web / 剪映网页版）
> 基于 WebCodecs API，纯前端完成视频解码、编辑和导出

---

## 1. 项目定位

Fly-Cut 是一个运行在浏览器中的视频编辑工具，利用 **WebCodecs API** 进行视频的编解码，无需服务端参与渲染。核心能力包括：

- 多轨时间线编辑（视频、音频、图片、文字、特效、滤镜、转场）
- 画布预览播放器
- 拖拽剪辑、吸附对齐
- 本地 + OSS 云存储素材管理
- 属性面板编辑（位置、缩放、透明度、文字样式、颜色等）
- MP4 视频合成导出
- 暗色模式

---

## 2. 技术栈

| 类别 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 框架 | Vue 3 | ~3.2.45 | Composition API + `<script setup>` |
| 语言 | TypeScript | ~4.7.4 | |
| 构建 | Vite | ^4.0.0 | 插件：`@vitejs/plugin-vue`、`unplugin-auto-import`、`unplugin-vue-components`、`unplugin-icons` |
| 路由 | Vue Router 4 | ^4.1.6 | 文件自动扫描加载 |
| 状态管理 | Pinia | ^2.0.28 | |
| UI 库 | Element Plus | ^2.2.29 | |
| CSS | Tailwind CSS 3 + Sass | ^3.2.4 | |
| 视频引擎 | @webav/av-cliper + @webav/av-canvas | 0.9.0-beta.21 | 核心依赖，WebCodecs 封装 |
| 画布编辑 | leafer-ui + @leafer-in/editor | 1.0.0-rc.23 | |
| 拖拽缩放 | vue3-moveable | ^0.18.1 | |
| 音频 | wavesurfer.js | ^7.7.11 | |
| 工具库 | @vueuse/core, lodash-es, axios, spark-md5 | — | |
| 文件存储 | opfs-tools | ^0.4.1 | Origin Private File System |
| 测试 | Vitest | ^0.25.8 | |
| 代码规范 | ESLint + @vue/eslint-config-typescript | — | |
| 包管理 | pnpm | — | 注意：仓库中残留了 `yarn.lock` |
| 部署 | Docker (nginx) | — | 需 COOP/COEP 头支持 SharedArrayBuffer |

---

## 3. 目录结构

```
fly-cut/
├── public/                          # 静态资源
│   ├── favicon.ico
│   ├── sample/                      # 样本视频素材
│   └── filter/                      # 滤镜相关图片
├── src/
│   ├── main.ts                      # 入口（Pinia、Router、图标注册）
│   ├── App.vue                      # 根组件（ElConfigProvider + RouterView）
│   ├── assets/
│   │   ├── main.css                 # 全局样式（Tailwind + Element Plus 覆盖 + 暗色变量）
│   │   ├── iconfont/                # Iconfont 图标库
│   │   └── *.png / *.gif            # UI 素材图
│   ├── class/                       # 领域模型类
│   │   ├── Base.ts                  # 共享类型（BaseTrackItem, TrackType, getMD5）
│   │   ├── Track.ts                 # Track 联合类型 + TrackLineItem 接口
│   │   ├── VideoTrack.ts            # 视频轨道模型（解码、绘制、合成、分割）
│   │   ├── AudioTrack.ts            # 音频轨道模型
│   │   ├── ImageTrack.ts            # 图片轨道模型
│   │   └── TextTrack.ts             # 文字轨道模型
│   ├── components/
│   │   ├── container/               # 编辑区五大布局容器
│   │   │   ├── HeaderContainer.vue  # 顶部栏（Logo、暗色切换、导出按钮）
│   │   │   ├── ResourcesContainer.vue  # 左侧素材面板容器
│   │   │   ├── CanvasPlayer.vue     # 中间播放器容器
│   │   │   ├── AttributeContainer.vue  # 右侧属性编辑容器
│   │   │   └── TrackContainer.vue   # 底部时间线容器
│   │   ├── item/
│   │   │   ├── player/              # 播放器组件（Player, PlayerControl, PlayerMoveable）
│   │   │   ├── trackItem/           # 时间线组件（TrackItem, TrackLine, TrackHandler 等）
│   │   │   │   └── template/        # 各轨道类型的模板（Video/Audio/Image/Text/Effect/Filter/Transition）
│   │   │   └── formItem/            # 属性编辑表单系统（FormItem, AttrContainer, ColorPicker）
│   │   ├── panels/                  # 资源面板（LocalPanel, AudioPanel, VideoPanel, ImagePanel, TextPanel）
│   │   ├── icons/                   # SVG 图标组件
│   │   ├── Tabs.vue / Subsection/   # 可复用 UI 组件
│   │   └── MenuList.vue / ItemList.vue / TrackList.vue / SplitLine.vue / Loading.vue
│   ├── data/
│   │   ├── constant.ts              # 全局常量（Token Key、文件类型映射、Moveable 配置）
│   │   ├── trackConfig.ts           # 轨道高度、FPS（30）、WaveSurfer 配置
│   │   ├── baseMenu.ts              # 左侧菜单定义
│   │   ├── errorCode.ts             # HTTP 状态码消息映射
│   │   └── options/                 # 属性表单配置（每种轨道类型 + _template.ts 全量示例）
│   ├── hooks/
│   │   ├── useScrollPage.ts         # 无限滚动
│   │   └── useSound.ts              # 音频预览
│   ├── pages/
│   │   ├── routers/                 # 路由配置（Editor.ts → "/", Preview.ts → "/preview"）
│   │   └── views/                   # 页面视图（Editor.vue 主编辑区, Preview.vue 占位）
│   ├── plugins/
│   │   ├── installRouter.ts         # 自动扫描 routers/*.ts、懒加载 views 视图
│   │   └── installIcon.ts           # 自动注册 icons/ 下的 SVG 组件
│   ├── stores/                      # Pinia 状态
│   │   ├── trackState.ts            # 轨道列表、选中、拖拽数据、帧计数
│   │   ├── playerState.ts           # 播放器状态（暂停/播放、画布配置）
│   │   ├── pageState.ts             # 全局 UI 状态（暗色模式、布局尺寸、加载状态）
│   │   ├── trackAttribute.ts        # 逐轨道属性映射 + 图层坐标计算
│   │   └── resourceStore.ts         # ⚠️ 空 Store，仅骨架
│   ├── utils/
│   │   ├── webcodecs.ts             # 编解码封装（VideoDecoder, AudioDecoder, ImageDecoder）
│   │   ├── common.ts                # 工具（时间格式化、ID 生成、文字尺寸、文件 IO）
│   │   ├── file.ts                  # 文件选择、OSS 上传、大小比对
│   │   ├── trackUtils.ts            # 重叠检测 + 运行时类型守卫
│   │   ├── storeUtil.ts             # Store 层重叠检测
│   │   ├── canvasUtil.ts            # 时间线画布绘制（网格、标尺、高亮）
│   │   ├── formItemUtils.ts         # 表单配置映射
│   │   ├── initHotKey.ts            # 键盘快捷键（Delete 删除）
│   │   └── __test__/trackUtils.test.ts  # 仅有的测试文件（5 个用例）
│   └── components.d.ts / auto-imports.d.ts  # 自动生成类型声明
├── viteUtil/                        # 开发工具
│   ├── cert/                        # 本地 HTTPS 自签名证书
│   └── viteProxyServer/             # 自定义 Vite 插件：Mock API Server
├── script/                          # 构建/部署脚本
│   ├── build.sh                     # 构建 + 压缩
│   └── devlop.sh                    # 构建 + SCP 到远程服务器
├── vite.config.ts
├── Dockerfile                       # nginx 镜像部署
├── nginx.conf                       # 含 COOP/COEP 头配置
├── postcss.config.js
├── .eslintrc.cjs
├── pnpm-lock.yaml
├── yarn.lock                        # ⚠️ 迁移残留，应清理
└── index.html                       # 入口 HTML（含 Google Tag Manager）
```

---

## 4. 常用命令

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 开发服务器（端口 4008，HTTP） |
| `pnpm dev-ssl` | 开发服务器（端口 4008，HTTPS + 自签名证书） |
| `pnpm build-only` | 生产构建 |
| `pnpm preview` | 预览构建产物 |
| `pnpm type-check` | TypeScript 类型检查 |
| `pnpm test:unit` | 运行单元测试（Vitest） |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm lint-fix` | ESLint 自动修复 |

---

## 5. 新增页面的方式

路由系统采用**文件自动扫描**机制，由 `src/plugins/installRouter.ts` 驱动的简易「约定式路由」：

1. 在 `src/pages/routers/` 下新建 `xxx.ts`，导出一个路由配置对象：

```ts
// src/pages/routers/MyPage.ts
export default [
  {
    path: '/my-page',
    name: 'MyPage',
    title: '我的页面',
    component: 'MyPage'  // 对应 views 下的文件名
  }
]
```

2. 在 `src/pages/views/` 下新建 `MyPage.vue`，正常编写页面组件。

`installRouter.ts` 会：
- 自动勾住 Vue Router 的 `beforeEach` 导航守卫，设置页面 `document.title`
- 根据路由配置的 `component` 字段，自动懒加载对应的视图组件

---

## 6. 历史技术决策（ADR）

### ADR-001：文件自动扫描路由

- **时间**：项目初期
- **决策**：实现 `installRouter.ts` 插件，自动扫描 `pages/routers/` 下的 TS 文件注册路由，同时自动设置页面标题
- **理由**：减少手动维护路由表的工作量，路由配置与视图文件就近放置
- **当前状态**：持续使用中

### ADR-002：自定义属性编辑表单系统

- **时间**：项目初期
- **决策**：不直接使用 Element Plus 表单，而是构建了一套声明式表单配置系统（`data/options/*.ts` + `formItemUtils.ts` + `AttrContainer.vue`）
- **理由**：每种轨道的属性表单结构不同，声明式配置更易扩展和维护
- **当前状态**：`_template.ts` 是全量示例，各实际类型（video.ts, text.ts 等）使用子集

### ADR-003：@webav/av-cliper 作为核心视频引擎

- **时间**：项目初期
- **决策**：基于 `@webav/av-cliper` 和 `@webav/av-canvas` 封装视频解码、合成能力
- **理由**：该库提供了 WebCodecs 的上层封装，屏蔽了底层编解码复杂性
- **当前状态**：0.9.0-beta.21，仍为 beta 版本，存在 API 不稳定的风险

---

## 7. 当前已知维护风险

### 🔴 高风险

| 风险 | 说明 |
|---|---|
| **核心依赖不稳定** | `@webav/av-cliper` 和 `@webav/av-canvas` 均为 0.x beta 版本，API 可能变更；项目与其高度耦合 |
| **类型安全漏洞** | `VideoTrack.end` 和 `ImageTrack.end` 类型为 `any`，本应为 `number` |
| **核心模块跳过 lint** | `src/utils/webcodecs.ts` 整个文件 `/* eslint-disable */` |
| **Vue 3.2 版本过老** | 当前 3.2.45 vs 最新 3.5.x，类型推导和模板类型检查能力差距大 |

### 🟡 中风险

| 风险 | 说明 |
|---|---|
| **测试覆盖严重不足** | 仅 1 个测试文件（5 个用例），核心视频逻辑零测试 |
| **大量注释代码** | `Base.ts`、`trackState.ts`、`common.ts`、`main.ts` 等多处存在大段注释掉的代码 |
| **各 Store 中散落 localStorage 操作** | `pageState`、`trackState`、`trackAttribute` 均直接读写，无统一管理 |
| **资源面板代码重复** | VideoPanel、ImagePanel、AudioPanel、TextPanel 的 index.vue 结构高度相似 |
| **`yarn.lock` 残留** | 包管理器已切换为 pnpm，应删除 `yarn.lock` |

### 🟢 低风险

| 风险 | 说明 |
|---|---|
| **`resourceStore.ts` 为空** | 定义了但无内容，接入 Pinia 也无实际作用 |
| **生产代码残留 console.log** | 多处调试日志未清理 |
| **`Preview.vue` 是脚手架占位页** | `/preview` 路由无实际功能 |
| **`input.oncancel` 不合法** | `file.ts` 中使用了已从 HTML 规范移除的事件 |
| **开发环境 COOP/COEP 头被注释** | 影响 SharedArrayBuffer 本地调试 |

---

## 8. 项目开发路线图建议

### 短期（清理技术债）

- [ ] 升级 Vue 3 → 3.4+，升级 TypeScript → 5.x，升级 Vite → 5/6
- [ ] 清理所有注释掉的代码
- [ ] 删除 `yarn.lock`
- [ ] 修复 `webcodecs.ts` 的 lint 问题
- [ ] 修复 `any` 类型声明（`VideoTrack.end`, `ImageTrack.end`）
- [ ] 清理生产代码中的 `console.log`

### 中期（夯实基础）

- [ ] 为核心业务逻辑编写单元测试（Track 模型、编解码流程、合成流程）
- [ ] 建立集成测试，验证完整编辑→导出流程
- [ ] 将 `localStorage` 操作集中到 Pinia plugin 或工具函数
- [ ] 重构资源面板，提取公共抽象组件
- [ ] 升级 `@webav` 依赖并适配可能的 API 变更

### 长期（功能增强）

- [ ] 完善 `/preview` 预览页面
- [ ] 增加更多导出格式支持
- [ ] 引入更多特效/滤镜/转场
- [ ] 考虑接入 Web Workers 优化解码性能
- [ ] 考虑 PWA 支持

---

> 本文档由项目代码分析自动生成，用于新成员 onboarding 和维护规划参考。
> 最后更新：2026-06-22
