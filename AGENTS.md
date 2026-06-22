# AGENTS.md

> AI 开发助手行为指南，用于多人协作时保持代码一致性。

---

## 项目概述

Fly-Cut 是一个浏览器端视频编辑器，基于 Vue 3 + TypeScript + Vite 构建，使用 WebCodecs API 进行视频编解码，`@webav/av-cliper` 作为核心视频引擎。纯前端运行，无需服务端。

详细项目介绍请参考 [docs/project-overview.md](docs/project-overview.md)。

---

## 技术栈摘要

| 类别 | 技术 |
|---|---|
| 框架 | Vue 3 (Composition API + `<script setup>`) |
| 语言 | TypeScript (~4.7.4) |
| 构建 | Vite 4 |
| 包管理器 | pnpm（⚠️ 仓库残留 `yarn.lock`，清理前勿提交） |
| CSS | Tailwind CSS 3 + Sass |
| UI 库 | Element Plus ^2.2.29 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4（文件自动扫描） |
| 视频引擎 | @webav/av-cliper + @webav/av-canvas (0.9.0-beta.21) |
| 画布 | leafer-ui (1.0.0-rc.23) |

---

## 目录结构核心约定

```
src/
├── class/          # 领域模型类（如 VideoTrack, AudioTrack 等）
├── components/     # Vue 组件（PascalCase 命名）
│   ├── container/  # 五大布局容器
│   ├── panels/     # 资源面板
│   ├── item/       # 播放器 + 时间线组件
│   └── icons/      # SVG 图标组件
├── pages/
│   ├── routers/    # 路由配置（自动扫描）
│   └── views/      # 页面视图（懒加载）
├── stores/         # Pinia Store
├── data/           # 常量、配置、属性表单定义
├── hooks/          # 组合式函数
├── utils/          # 工具函数
├── plugins/        # 插件（路由自动加载、图标注册）
└── assets/         # 全局样式 + 静态资源
```

## 路径别名

- `@/*` → `src/*`
- `pages/*` → `src/pages/*`

---

## 约定式路由

路由由 `src/plugins/installRouter.ts` 自动扫描 `src/pages/routers/*.ts` 实现。

**新增页面的步骤：**

1. 在 `src/pages/routers/` 下新建 `xxx.ts`：

```ts
import type { RouteRecordRaw } from 'vue-router';
const routes: Array<RouteRecordRaw> = [
  {
    path: '/xxx',
    name: 'Xxx',
    meta: { title: '页面标题' }
  }
];
export default routes;
```

2. 在 `src/pages/views/` 下新建 `Xxx.vue`，`name` 字段与路由配置的 `name` 保持一致。

`installRouter.ts` 会自动完成：路由注册 + 懒加载组件 + `document.title` 设置。

---

## 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 组件名（文件名） | PascalCase | `VideoTrack.ts`, `CanvasPlayer.vue` |
| 组件名（`name` 属性） | PascalCase，与文件名一致 | `name: 'CanvasPlayer'` |
| 变量/函数 | camelCase | `baseFps`, `getMD5()` |
| 常量 | camelCase 或 UPPER_SNAKE_CASE | `baseFps`, `TrackType` |
| 类型/接口 | PascalCase | `BaseTrackItem`, `TrackLineItem` |
| 文件名（组件） | PascalCase | `VideoTrack.vue` |
| 文件名（工具/配置） | camelCase | `trackConfig.ts` |
| Pinia Store | camelCase 以 State 结尾 | `trackState`, `playerState` |
| 自定义事件 | camelCase | `@update:modelValue` |
| 属性绑定 | kebab-case（模版中） | `:preview-width` |

---

## 编写规范

**Vue 组件**

- 使用 `<script setup lang="ts">` 组合式 API
- 单文件组件顺序：`<template>` → `<script>` → `<style>`
- `defineProps` 先于 `defineEmits`
- 布尔类型 prop 默认值为 `false`
- `emits` 声明所有事件，使用 camelCase
- 组件必须有 `name` 属性（与文件名一致）
- 禁止使用 `v-html`，禁止在 `template` 中使用 `this`
- 禁止在 `v-for` 中省略 `:key`

**样式**

- 优先使用 Tailwind CSS 工具类
- 复杂样式写在 `<style lang="scss" scoped>` 中
- 暗色模式通过 `.dark` 类名控制（Tailwind `dark:` 前缀）
- 颜色值引用 Tailwind 主题变量或 CSS 变量，避免硬编码
- Never 使用内联样式

**TypeScript**

- 使用 `interface` 定义 Props 类型
- 导入类型时使用 `import type`
- Never 使用 `any` 类型
- 使用 `// @ts-expect-error` 而非 `// @ts-ignore`
- 避免魔法数字，提取为具名常量

**状态管理**

- 使用 Pinia Composition API 风格（setup store）
- 直接操作 `localStorage` 应集中在特定的 Store 或工具函数中
- 更新 Store 状态时优先使用函数封装而非直接赋值

---

## 代码验证与自动生成文件

以下文件由工具自动生成，**永远不要手动修改**：

| 文件 | 生成方式 |
|---|---|
| `auto-imports.d.ts` | `unplugin-auto-import` |
| `components.d.ts` | `unplugin-vue-components` |
| `.eslintrc-auto-import.json` | `unplugin-auto-import` |

---

## 属性编辑表单系统

项目使用自定义声明式表单系统。

在 `src/data/options/` 下按轨道类型定义配置（`video.ts`, `text.ts`, `audio.ts` 等），`formItemUtils.ts` 负责映射到实际表单渲染。

`_template.ts` 是全量参考示例，新增轨道类型的表单配置时参考此文件。

---

## Never 规则

### ⛔ 类型安全

- Never 使用 `any` 类型 —— 必须明确类型，包括 `end` 字段
- Never 对整个文件使用 `/* eslint-disable */` —— 只有特定行可禁用
- Never 跳过 TypeScript 类型检查提交代码（运行 `pnpm type-check`）

### ⛔ 代码质量

- Never 在渲染路径中执行耗时操作（解码、合成等只能在 async 函数或 Worker 中执行）
- Never 在产品代码中保留 `console.log` —— 调试日志只允许在开发环境
- Never 提交大段注释掉的代码 —— 无用的代码直接删除，有保留价值的加 TODO 注释
- Never 使用 `require()` 导入 ES 模块 —— 优先使用 `import` 语法
- Never 在 `v-for` 中省略 `:key`
- Never 使用内联样式（`style=""`）—— 使用 Tailwind 类或 scoped style

### ⛔ 工程规范

- Never 同时提交 `pnpm-lock.yaml` 和 `yarn.lock` —— 锁定一个包管理器
- Never 直接修改 `dist/`、`node_modules/`、`.husky/` 中的构建产物
- Never 硬编码敏感信息（API Key、服务器 IP、SSH 路径、OSS 凭证）—— 使用环境变量
- Never 使用 `input.oncancel` —— 该事件已从 HTML 规范移除
- Never 在组件外使用 Pinia —— `useXxxStore()` 只能在 `setup()` 内部或组件顶层调用
- Never 跳过 COOP/COEP 响应头 —— SharedArrayBuffer 依赖它们，排查问题时优先确认

### ⛔ 视频引擎

- Never 直接依赖 `@webav/av-cliper` 的内部类型 —— 如有类型缺失，在项目中声明补齐而非侵入改写库
- Never 在 UI 线程中执行同步解码或帧合成 —— 始终通过 `@webav` 的异步 API
- Never 假设 `OffscreenSprite` 或 `MP4Clip` 的 API 稳定 —— 该库为 0.x beta 版本

---

## 本地开发环境要求

- SharedArrayBuffer 需要 COOP/COEP 响应头（`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`）
- 生产环境通过 nginx 配置（见 `nginx.conf`），开发环境在 `vite.config.ts` 中配置
- 如遇到视频解码问题，优先检查 COOP/COEP 头是否生效

---

## 常见代码模式

**解码视频帧：**

```ts
import { MP4Clip, OffscreenSprite } from '@webav/av-cliper';

const clip = new MP4Clip(source);
const sprite = new OffscreenSprite('my-video', clip);
await sprite.ready;
// 使用 sprite 进行绘制或合成
```

**Store 定义（Composition API 风格）：**

```ts
import { defineStore } from 'pinia';

export const useTrackState = defineStore('trackState', () => {
  const tracks = ref<Track[]>([]);
  const selectedId = ref<string | null>(null);

  function addTrack(track: Track) {
    tracks.value.push(track);
  }

  return { tracks, selectedId, addTrack };
});
```

---

## 参考文档

- [项目概览](docs/project-overview.md) — 整体说明、目录结构、维护风险、开发路线图
- [docs/project-overview.md](docs/project-overview.md) — 同上
- `docs/` 目录是项目长期文档存放地，新增重要决策或架构变更时更新
