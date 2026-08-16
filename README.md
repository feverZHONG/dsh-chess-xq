# dsh-chess-xq-plugin

DeepSeek Harness（DSH）WebUI 的中国象棋人机对战插件「天界象棋」：阁下执红先手，本天使（AI）执黑。
规则引擎 + 阿尔法-贝塔搜索（带位置估值表），移植自本地早期项目 chess-xq（中国象棋）并接线台词。

## 功能特性

- 输入框工具行左端「♟ 象棋」小开关打开浮窗面板（标题可拖拽移动，**位置记忆**：拖到哪下次还在哪）
- **行走历史在主页面右侧**（固定竖条，最新一手在最上面，以此类推），不占棋盘浮窗空间
- 完整中国象棋规则：走法生成 / 将军 / 将死 / 困毙（和棋）/ 飞将判定，红先黑后
- AI 执黑：alpha-beta 搜索（默认深度 3），AI 思考时面板有转圈提示和「本天使思考中…」
- **莉娅有活台词**：开局 / 将军 / 被将军 / 吃子 / 首杀 / 兑子 / 兵过河 / 残局 / 昏招 / 悔棋 / 胜负 / 和棋
  各场景随机台词（移植自 chess-xq 的 `lines.ts`，原 web 版定义了但没接线，本插件接进对局事件）
- 可悔棋（撤回一整轮：阁下 + AI）、保存 / 读取 / 删除存档（localStorage，FEN 格式）
- 设置页可调 AI 难度（1~4 层搜索）

## AI 侧工具（模型可用）

| 工具 | 作用 |
|:-----|:-----|
| `chess_talk` | 往对局面板发一句话（提示/鼓励/吐槽），显示在棋盘旁气泡里 |
| `chess_state` | 查当前对局：轮到谁 / 状态 / 步数 / 最后一步 / 本天使最近台词 |
| `chess_new_game` | 开一局新棋（重置棋盘，重新执红先行） |

对局里本天使说过的台词也会进 host 队列，`chess_state` 能看到——聊天里她知道自己下棋时说了什么。

## 安装

```powershell
# 从源码目录安装
dsh plugin --profile web add <插件目录>

# 或从打包好的 tgz 安装（可移植，不依赖源目录存活）
dsh plugin --profile web add dsh-chess-xq-plugin-0.1.0.tgz
```

安装后重启 WebUI 生效。`dsh` 请替换为你安装的 DSH CLI 调用方式。

## 打包

一键交付（重建 client → 语法自检 → 插件自检 → 打包 → git 提交，做减法）：

```powershell
node skills/dsh-plugin-dev/scripts/deliver-plugin.mjs dsh-chess-xq [--version x.y.z] [--commit "消息"]
```

产物 `dsh-chess-xq-plugin-<版本>.tgz` 输出到 `workspace/dsh-plugins/dist/`。

## 配置

- 持久化到 `$DSH_HOME/dsh-chess-xq-config.json`（AI 深度），跨重启恢复
- 无 Config schema、无 settings namespace 依赖，安装即用
- 存档在浏览器 localStorage（`dsh-chess-xq-saves`），换浏览器/清缓存会丢

## 架构

- **Host 半**（`index.js` 入口 + `host/`）：`index.js` 只做组装（一次 apply 一份状态 → 注册路由/工具）；
  `host/config.js` 配置持久化、`host/state.js` 可变状态（消息/命令队列 + 对局报告快照）、
  `host/routes.js` 路由 `/dsh-chess/*`（state / report / cmd / config）、
  `host/tools.js` 三个 AI 工具
- **Client 半**（`client.js` 产物 + `client/src/` 源码 + `client/build.mjs` 打包）：
  `types.js`（常量）/ `engine.js`（规则引擎）/ `ai.js`（alpha-beta + PST）/ `lines.js`（台词池）/
  `core.js`（共享状态 + 对局状态机 + host 通信）/ `board.js`（SVG 棋盘）/ `panel.js`（浮窗面板）/
  `ui.js`（入口开关 + 设置页）/ `entry.js`（槽位编排）；
  `conversation.input.left` 入口开关 + `shell.overlay` 浮窗面板 + `settings.section` 难度设置；
  1s 轮询拉消息/命令/配置
- **零第三方依赖**（host 只用 node 内置模块，client 打包也是 node 内置 fs），无 Config schema，安装即用

## 开发

DSH client bundle 是单文件直出（无构建步骤、require 无相对路径），所以 client 源码按功能拆到
`client/src/`，改源码后必须重跑打包生成产物：

```powershell
node client/build.mjs
```

刷新页面即生效（client 半热重建）；host 半（`host/`、`index.js`）改动需重启 WebUI。

## License

MIT
