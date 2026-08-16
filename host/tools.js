// dsh-chess-xq —— Host 半 · 模型侧工具
// 职责：注册三个 ctx.tools 工具（抄 dsh-puzzle 原始定义写法）：
//   chess_talk       往对局面板发话（走 state 消息队列）
//   chess_state      查当前对局：轮到谁/状态/步数/最后一步/本天使最近台词
//   chess_new_game   开一局新棋（推 cmd 指令，面板 1 秒内生效）
// 只依赖 state（createPluginState 产物）+ config.writeConfig。
import { writeConfig } from './config.js'

const renderJson = (_args, value) => [{ type: 'text', text: JSON.stringify(value) }]

function registerTools(ctx, state) {
  ctx.tools.register({
    name: 'chess_talk',
    description: '给网页里的「天界象棋」对局面板发一句话（提示、鼓励、吐槽都行），会显示在棋盘旁的气泡里。',
    parameters: {
      type: 'object',
      properties: { message: { type: 'string', description: '要发给对局面板的话' } },
      required: ['message'],
    },
    output: {
      schema: {
        type: 'object',
        properties: { ok: { type: 'boolean' }, queued: { type: 'integer' } },
        required: ['ok', 'queued'],
        additionalProperties: false,
      },
      render: renderJson,
    },
    async execute(args) {
      return { ok: true, queued: state.pushLine(String(args && args.message ? args.message : '')) }
    },
  })

  ctx.tools.register({
    name: 'chess_state',
    description: '查看「天界象棋」当前对局：轮到谁（0=红方阁下 / 1=黑方本天使）、状态（进行中/胜负/和棋）、已走步数、AI 是否在思考、最后一步、最近说过的台词。',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: {
        type: 'object',
        properties: {
          turn: { type: 'integer' }, status: { type: 'string' }, moves: { type: 'integer' },
          aiThinking: { type: 'boolean' }, lastMove: { type: 'object' },
          aiDepth: { type: 'integer' }, lines: { type: 'array' },
        },
        additionalProperties: true,
      },
      render: renderJson,
    },
    async execute() {
      const rep = state.getReport()
      return {
        ...rep,
        aiDepth: state.config.aiDepth,
        lines: state.listMessages().filter((m) => m.kind === 'line').map((m) => m.text),
      }
    },
  })

  ctx.tools.register({
    name: 'chess_new_game',
    description: '让网页里的「天界象棋」开一局新棋（棋盘重置、重新执红先行）。面板 1 秒内自动生效。',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: {
        type: 'object',
        properties: { ok: { type: 'boolean' }, queued: { type: 'integer' } },
        required: ['ok', 'queued'],
        additionalProperties: false,
      },
      render: renderJson,
    },
    async execute() {
      return { ok: true, queued: state.pushCommand('new_game') }
    },
  })
}

export { registerTools }
