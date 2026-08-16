// dsh-chess-xq —— 天界象棋插件 · Host 半入口（ESM）
// 职责：声明插件身份 + 组装：一次 apply 一份状态（state.js）→ 注册路由（routes.js）+ 工具（tools.js）。
// 各功能模块见 host/：config.js（配置持久化）/ state.js（可变状态）/
// routes.js（/dsh-chess/* 路由）/ tools.js（chess_talk / chess_state / chess_new_game）。
// 注意：不声明 Config schema（无 schemastery 依赖），配置全走 apply(ctx) + $DSH_HOME JSON。
// client 半见 client/src/（规则引擎 types/engine、AI ai、台词 lines、状态机 core、
// 棋盘 board、面板 panel、小组件 ui、入口 entry），打包产物 client.js。
import { createPluginState } from './host/state.js'
import { registerRoutes } from './host/routes.js'
import { registerTools } from './host/tools.js'

export const name = 'dsh-chess-xq'
export const inject = ['webServer', 'tools']

export function apply(ctx) {
  console.log('[dsh-chess-xq] plugin loaded (host half)')
  const state = createPluginState()
  registerRoutes(ctx, state)
  registerTools(ctx, state)
  console.log('[dsh-chess-xq] loaded, aiDepth=' + state.config.aiDepth)
}
