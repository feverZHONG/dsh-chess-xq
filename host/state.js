// dsh-chess-xq —— Host 半 · 可变状态
// 职责：一次 apply 一份的可变状态：莉娅消息/命令队列（seq 自增、上限 50）、
// 客户端上报的对局报告快照、配置（读自 $DSH_HOME JSON）。
// 用工厂 createPluginState() 而非模块级单例：多实例/重载不串状态；
// 只暴露方法读写，避免外部持有过期引用（pushMessage/applyReport 会重建数组/对象）。
import { readConfig } from './config.js'

function createPluginState() {
  let messages = []
  let seq = 0
  let lastReport = { turn: 0, status: 'playing', moves: 0, aiThinking: false, lastMove: null }
  const config = readConfig()

  function applyReport(body) {
    const b = body && typeof body === 'object' ? body : {}
    const last = lastReport.lastMove
    lastReport = {
      turn: b.turn === 0 || b.turn === 1 ? b.turn : lastReport.turn,
      status: ['playing', 'red_win', 'black_win', 'draw'].includes(b.status) ? b.status : lastReport.status,
      moves: Number.isInteger(b.moves) && b.moves >= 0 ? b.moves : lastReport.moves,
      aiThinking: !!b.aiThinking,
      lastMove: b.lastMove && typeof b.lastMove === 'object'
        ? {
            from: Number.isInteger(b.lastMove.from) ? b.lastMove.from : 0,
            to: Number.isInteger(b.lastMove.to) ? b.lastMove.to : 0,
            captured: Number.isInteger(b.lastMove.captured) ? b.lastMove.captured : 0,
          }
        : last,
    }
  }

  // 莉娅台词（client 对局事件上报的 line）也会进队列，模型侧 chess_state 能看到自己说过的话
  function pushLine(line) {
    const text = typeof line === 'string' && line.trim() ? line.trim() : ''
    if (!text) return messages.length
    messages.push({ seq: ++seq, kind: 'line', text })
    if (messages.length > 50) messages = messages.slice(-50)
    return messages.length
  }

  // 工具/设置页发的指令（如 new_game），client 轮询时消费
  function pushCommand(cmd) {
    const c = typeof cmd === 'string' && cmd.trim() ? cmd.trim() : ''
    if (!c) return messages.length
    messages.push({ seq: ++seq, kind: 'cmd', cmd: c })
    if (messages.length > 50) messages = messages.slice(-50)
    return messages.length
  }

  return {
    config,
    listMessages: () => messages.map((m) => ({ seq: m.seq, kind: m.kind, text: m.text, cmd: m.cmd })),
    getReport: () => lastReport,
    applyReport,
    pushLine,
    pushCommand,
  }
}

export { createPluginState }
