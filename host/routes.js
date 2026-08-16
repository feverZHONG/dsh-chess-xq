// dsh-chess-xq —— Host 半 · 路由
// 职责：/dsh-chess/* 全部 HTTP 端点：
//   GET  /dsh-chess(/)?      根端点（ok + 名称）
//   GET  /dsh-chess/state    莉娅消息/命令 + 配置 + 对局报告（client 1s 轮询）
//   POST /dsh-chess/report   客户端上报对局状态（带 line 时顺带进台词队列）
//   POST /dsh-chess/cmd      推一条指令（new_game 等），client 轮询消费
//   POST /dsh-chess/config   写配置（aiDepth）
// 状态全部来自 state（createPluginState 产物），本模块只负责 HTTP 面。
import { sanitizeConfig, writeConfig } from './config.js'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function registerRoutes(ctx, state) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: '/dsh-chess',
      handler: async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const p = url.pathname
        const json = (code, obj) => {
          res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify(obj))
        }

        if (p === '/dsh-chess' || p === '/dsh-chess/') {
          json(200, { ok: true, name: 'dsh-chess-xq' })
          return
        }
        if (p === '/dsh-chess/state') {
          json(200, {
            ok: true,
            messages: state.listMessages(),
            config: state.config,
            report: state.getReport(),
          })
          return
        }
        if (p === '/dsh-chess/report' && req.method === 'POST') {
          let body = {}
          try { body = JSON.parse(await readBody(req)) } catch { /* ignore */ }
          state.applyReport(body)
          if (body && body.line) state.pushLine(body.line)
          json(200, { ok: true })
          return
        }
        if (p === '/dsh-chess/cmd' && req.method === 'POST') {
          let body = {}
          try { body = JSON.parse(await readBody(req)) } catch { /* ignore */ }
          const cmd = typeof body.cmd === 'string' ? body.cmd : ''
          if (!cmd) { json(400, { ok: false, error: 'empty cmd' }); return }
          json(200, { ok: true, queued: state.pushCommand(cmd) })
          return
        }
        if (p === '/dsh-chess/config' && req.method === 'POST') {
          let body = {}
          try { body = JSON.parse(await readBody(req)) } catch { /* ignore */ }
          if (body && body.aiDepth !== undefined) state.config.aiDepth = sanitizeConfig({ aiDepth: body.aiDepth }).aiDepth
          writeConfig(state.config)
          json(200, { ok: true, config: state.config })
          return
        }
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('not found')
      },
    }),
    'dsh-chess-xq: routes',
  )
}

export { registerRoutes }
