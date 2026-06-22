# CLAUDE.md — 项目开发指南

## 项目概述

浏览器端视频编辑器，基于 Vue 3 + TypeScript + Vite 4 构建，使用 WebCodecs API 解码编码视频，`@webav/av-cliper` 为视频引擎核心。纯前端运行，无需服务端。

## 技术栈

- **框架**：Vue 3 (Composition API + `<script setup>`) + TypeScript
- **构建**：Vite 4 + pnpm
- **UI**：Element Plus 2 + Tailwind CSS 3 + Sass
- **视频引擎**：@webav/av-cliper + @webav/av-canvas (0.9.0-beta.21)
- **画布**：leafer-ui (1.0.0-rc.23)
- **状态管理**：Pinia
- **路由**：Vue Router 4（文件自动扫描 `src/pages/routers/*.ts`）
- **测试**：Vitest + jsdom

## 目录结构

```
src/
├── class/          # 领域模型
├── components/     # Vue 组件（PascalCase）
│   ├── container/  # 五大布局容器
│   ├── panels/     # 资源面板
│   └── item/       # 播放器 + 时间线组件
├── pages/routers/  # 路由配置
├── pages/views/    # 页面视图
├── stores/         # Pinia
├── data/options/   # 属性表单配置
├── hooks/          # 组合式函数
├── utils/          # 工具函数
└── plugins/        # 插件
```

**路径别名**：`@/*` → `src/*`，`pages/*` → `src/pages/*`

## 构建命令

- `pnpm dev` — 开发服务器（端口 4008，HTTP）
- `pnpm dev-ssl` — 开发服务器（端口 4008，HTTPS）
- `pnpm build-only` — 生产构建
- `pnpm type-check` — TypeScript 类型检查
- `pnpm test:unit` — 运行单元测试
- `pnpm lint` / `pnpm lint-fix` — ESLint 检查/修复

## 编码规范

### 命名
- 组件文件名：PascalCase（`VideoTrack.vue`）
- 变量/函数：camelCase（`baseFps`, `getMD5`）
- 类型/接口：PascalCase（`BaseTrackItem`）
- Pinia Store：camelCase（`trackState`）

### TypeScript
- 使用 `interface` 定义 Props，导入类型用 `import type`
- **Never 使用 `any` 类型**
- 使用 `// @ts-expect-error` 而非 `// @ts-ignore`

### Vue 组件
- `<script setup lang="ts">`，顺序 template → script → style
- `defineProps` 先于 `defineEmits`
- 组件必须有 `name` 属性（与文件名一致）
- 全部事件必须在 `emits` 中声明
- 布尔 prop 默认值为 `false`
- `v-for` 必须有 `:key`
- 禁止 `v-html`，禁止 `template` 中使用 `this`

### 样式
- 优先 Tailwind CSS 工具类，复杂样式用 scoped Sass
- 暗色模式通过 `.dark` 类名控制
- **Never 使用内联样式**，**Never 硬编码颜色值**

## Never 规则

- ⛔ **Never 使用 `any` 类型**
- ⛔ **Never 对整个文件禁用 ESLint**
- ⛔ **Never 在产品代码留 `console.log`**
- ⛔ **Never 提交大段注释掉的代码**
- ⛔ **Never 用内联样式**
- ⛔ **Never 在渲染路径做耗时操作**（解码/合成只能用 async API）
- ⛔ **Never 在 `v-for` 省略 `:key`**
- ⛔ **Never 硬编码敏感信息**（API Key、IP、SSH、凭证等）
- ⛔ **Never 修改以下自动生成文件**：`auto-imports.d.ts`、`components.d.ts`、`.eslintrc-auto-import.json`
- ⛔ **Never 同时提交 `pnpm-lock.yaml` 和 `yarn.lock`**
- ⛔ **Never 跳过 `pnpm type-check` 直接提交**
- ⛔ **Never 使用 `require()` 导入 ES 模块**
- ⛔ **Never 在 UI 线程同步执行解码/帧合成**

## 常见模式

**新增页面**：
1. `src/pages/routers/` 下新建 `Xxx.ts`（path, name, meta.title）
2. `src/pages/views/` 下新建 `Xxx.vue`
3. 路由自动注册，组件懒加载

**定义 Store**：
```ts
export const useXxxState = defineStore('xxxState', () => {
  const state = ref(...);
  function action() { ... }
  return { state, action };
});
```

## 重要提醒

- `@webav/av-cliper` 为 0.x beta，API 可能变更
- COOP/COEP 头对 SharedArrayBuffer 是必须的（`nginx.conf` 已配置，开发环境需手动启用）
- 新增属性表单配置放在 `src/data/options/`，参考 `_template.ts`
- 详情文档见 [docs/project-overview.md](docs/project-overview.md)
