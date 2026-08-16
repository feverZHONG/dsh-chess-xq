// dsh-chess-xq —— client 半 · 游戏核心（共享状态 + 对局状态机 + Host 通信）
// 仿 dsh-puzzle 的 core.js 结构：模块级共享 store（跨组件/重挂载存活），
// 操作全部走本模块（改状态 → 挑莉娅台词 → 上报 host → bump 重渲染）。
// 移植自 chess-xq（web/src/hooks/useGame.ts + useSave.ts），并把 LINES 台词池接线进对局事件。
var t = require('./types');
var e = require('./engine');
var ai = require('./ai');
var L = require('./lines');

var POLL_MS = 1000;
var PANEL_EVENT = 'dsh-chess-panel';
var STORAGE_KEY = 'dsh-chess-xq-saves';
var POS_KEY = 'dsh-chess-xq-panel-pos';
var MAX_MESSAGES = 20;

var panelState = { open: false, pos: null };
var rerender = { fn: null };

var store = {
  board: null,
  currentColor: t.Color.RED,
  selected: null,          // 选中格（17×14 sq）或 null
  legalMoves: [],          // 合法落点 sq 列表
  status: 'playing',       // playing | red_win | black_win | draw
  moveHistory: [],         // [{from,to,captured}]
  boardHistory: [],        // 每步后的盘面（[0]=初始），悔棋用
  lastMove: null,
  aiThinking: false,
  aiTimer: null,
  aiDepth: 3,              // AI 搜索深度（host 配置同步）
  liyaLine: '',            // 当前莉娅台词（对局事件触发，渲染时固定）
  captures: 0,             // 累计吃子数（首杀台词）
  prevHumanCaptured: false, // 上一步是人吃子（兑子台词）
  saidEndgame: false,
  messages: [],            // 工具发来的话 [{seq,text}]
  seenSeq: 0,
  saves: [],               // [{id,date,summary}]
  showSaves: false,
};

function bump() { if (rerender.fn) rerender.fn(function (x) { return x + 1; }); }

// ── 面板开关 ──
function setPanelOpen(open) {
  panelState.open = open;
  try { window.dispatchEvent(new CustomEvent(PANEL_EVENT)); } catch (err) {}
  bump();
}
function togglePanel() { setPanelOpen(!panelState.open); }

// ── 面板位置记忆（0.2.0：界面不固定 → 拖到哪存哪，刷新不丢）──
function loadPos() {
  try {
    var raw = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (raw && Number.isFinite(raw.x) && Number.isFinite(raw.y)) return { x: raw.x, y: raw.y };
  } catch (err) {}
  return null;
}
function savePos() {
  try {
    if (panelState.pos) localStorage.setItem(POS_KEY, JSON.stringify(panelState.pos));
  } catch (err) {}
}

// ── 对局基础 ──
function clearAiTimer() {
  if (store.aiTimer) { clearTimeout(store.aiTimer); store.aiTimer = null; }
}

function pieceCount(board) {
  var n = 0;
  for (var i = 0; i < t.BOARD_SIZE; i++) if (board[i] > t.Sq.EMPTY) n++;
  return n;
}

function say(line) {
  store.liyaLine = line || '';
  reportWithLine(line);
  bump();
}

function newGame() {
  clearAiTimer();
  store.board = e.initBoard();
  store.currentColor = t.Color.RED;
  store.selected = null;
  store.legalMoves = [];
  store.status = 'playing';
  store.moveHistory = [];
  store.boardHistory = [e.initBoard()];
  store.lastMove = null;
  store.aiThinking = false;
  store.captures = 0;
  store.prevHumanCaptured = false;
  store.saidEndgame = false;
  store.liyaLine = L.pick(L.LINES.opening);
  reportWithLine(store.liyaLine);
  bump();
}

// ── 人类走子（执红）──
function handleCell(row, col) {
  if (store.status !== 'playing' || store.currentColor !== t.Color.RED) return;
  var sq = e.from9x10(row, col);

  if (store.selected !== null && store.legalMoves.indexOf(sq) >= 0) {
    var move = { from: store.selected, to: sq, captured: store.board[sq] };
    commitHumanMove(move);
    return;
  }

  var piece = store.board[sq];
  if (piece !== t.Sq.EMPTY && piece !== t.Sq.SENTINEL && t.colorOf(piece) === t.Color.RED) {
    var moves = e.getLegalMoves(store.board, t.Color.RED).filter(function (m) { return m.from === sq; });
    store.selected = sq;
    store.legalMoves = moves.map(function (m) { return m.to; });
  } else {
    store.selected = null;
    store.legalMoves = [];
  }
  bump();
}

function commitHumanMove(move) {
  var beforeEval = ai.evaluate(store.board); // 红方视角
  var newBoard = e.makeMove(store.board, move);
  var newStatus = 'playing';
  if (e.isCheckmate(newBoard, t.Color.BLACK)) newStatus = 'red_win';
  else if (e.isStalemate(newBoard, t.Color.BLACK)) newStatus = 'draw';

  store.board = newBoard;
  store.currentColor = t.Color.BLACK;
  store.selected = null;
  store.legalMoves = [];
  store.status = newStatus;
  store.moveHistory = store.moveHistory.concat([move]);
  store.boardHistory = store.boardHistory.concat([newBoard]);
  store.lastMove = move;
  store.prevHumanCaptured = move.captured > t.Sq.EMPTY;
  if (move.captured > t.Sq.EMPTY) store.captures++;

  pickLineHuman(move, newBoard, newStatus, beforeEval);

  if (newStatus === 'playing') scheduleAi();
  report();
  bump();
}

function pickLineHuman(move, newBoard, status, beforeEval) {
  if (status === 'red_win') { say(L.pick(L.LINES.playerWin)); return; }
  if (status === 'draw') { say(L.pick(L.LINES.draw)); return; }
  if (e.isInCheck(newBoard, t.Color.BLACK)) { say(L.pick(L.LINES.playerCheck)); return; }
  if (move.captured > t.Sq.EMPTY) { say(L.pick(L.LINES.playerCapture)); return; }

  // 兵过河
  var toRC = e.to9x10(move.to);
  var piece = newBoard[move.to];
  if (t.typeOf(piece) === t.PieceType.PAWN && t.colorOf(piece) === t.Color.RED && toRC[0] <= 4) {
    say(L.pick(L.LINES.pawnCross)); return;
  }
  // 后退（红方 row 增大 = 后退）
  var fromRC = e.to9x10(move.from);
  if (toRC[0] > fromRC[0] && Math.random() < 0.5) { say(L.pick(L.LINES.playerRetreat)); return; }
  // 昏招（红方视角估值掉 ≥ 150）
  var afterEval = ai.evaluate(newBoard);
  if (beforeEval - afterEval >= 150 && Math.random() < 0.6) { say(L.pick(L.LINES.blunder)); return; }
  // 残局提示（一次性）
  if (!store.saidEndgame && pieceCount(newBoard) <= 8) {
    store.saidEndgame = true;
    say(L.pick(L.LINES.endgame)); return;
  }
  // 安静棋：保留上一条台词
}

// ── AI 走子（执黑）──
function scheduleAi() {
  clearAiTimer();
  store.aiThinking = true;
  store.liyaLine = L.pick(L.LINES.thinking);
  report();
  bump();
  store.aiTimer = setTimeout(doAiMove, 700);
}

function doAiMove() {
  store.aiTimer = null;
  if (store.status !== 'playing' || store.currentColor !== t.Color.BLACK) {
    store.aiThinking = false;
    bump();
    return;
  }
  var result = ai.findBestMove(store.board, t.Color.BLACK, store.aiDepth);
  if (!result.move) {
    store.aiThinking = false;
    store.liyaLine = L.pick(L.LINES.no_moves);
    bump();
    return;
  }
  var move = result.move;
  var newBoard = e.makeMove(store.board, move);
  var newStatus = 'playing';
  if (e.isCheckmate(newBoard, t.Color.RED)) newStatus = 'black_win';
  else if (e.isStalemate(newBoard, t.Color.RED)) newStatus = 'draw';

  var aiCaptured = move.captured > t.Sq.EMPTY;
  var trade = aiCaptured && store.prevHumanCaptured;

  store.board = newBoard;
  store.currentColor = t.Color.RED;
  store.selected = null;
  store.legalMoves = [];
  store.status = newStatus;
  store.moveHistory = store.moveHistory.concat([move]);
  store.boardHistory = store.boardHistory.concat([newBoard]);
  store.lastMove = move;
  store.aiThinking = false;
  if (aiCaptured) store.captures++;
  store.prevHumanCaptured = false;

  pickLineAi(newStatus, aiCaptured, trade, newBoard);

  report();
  bump();
}

function pickLineAi(status, aiCaptured, trade, newBoard) {
  if (status === 'black_win') { say(L.pick(L.LINES.gameOver)); return; }
  if (status === 'draw') { say(L.pick(L.LINES.draw)); return; }
  if (e.isInCheck(newBoard, t.Color.RED)) { say(L.pick(L.LINES.check)); return; }
  if (aiCaptured) {
    if (store.captures === 1) { say(L.pick(L.LINES.firstBlood)); return; }
    if (trade) { say(L.pick(L.LINES.trade)); return; }
    say(L.pick(L.LINES.capture)); return;
  }
  // 兵过河
  var rc = e.to9x10(store.lastMove.to);
  var piece = newBoard[store.lastMove.to];
  if (t.typeOf(piece) === t.PieceType.PAWN && t.colorOf(piece) === t.Color.BLACK && rc[0] >= 5) {
    say(L.pick(L.LINES.pawnCross)); return;
  }
  if (!store.saidEndgame && pieceCount(newBoard) <= 8) {
    store.saidEndgame = true;
    say(L.pick(L.LINES.endgame));
  }
}

// ── 悔棋 / 保存 / 读取（移植 useGame.undoMove + useSave）──
function undo() {
  if (store.moveHistory.length < 2) return;
  if (store.currentColor !== t.Color.RED) return;
  clearAiTimer();
  store.aiThinking = false;
  var newHistory = store.moveHistory.slice(0, -2);
  var newBoardHistory = store.boardHistory.slice(0, -2);
  if (!newBoardHistory.length) return;
  var previousBoard = newBoardHistory[newBoardHistory.length - 1];
  store.board = previousBoard;
  store.currentColor = t.Color.RED;
  store.selected = null;
  store.legalMoves = [];
  store.status = 'playing';
  store.moveHistory = newHistory;
  store.boardHistory = newBoardHistory;
  store.lastMove = newHistory.length ? newHistory[newHistory.length - 1] : null;
  say(L.pick(L.LINES.undo));
  report();
  bump();
}

function getSummary(d) {
  var resultMap = { playing: '进行中', red_win: '红方胜', black_win: '黑方胜', draw: '和棋' };
  return ((d.moveHistory ? d.moveHistory.length : 0)) + ' 步 · ' + (resultMap[d.result] || d.result);
}

function loadSaves() {
  try {
    var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    store.saves = Object.keys(data).map(function (id) {
      return { id: id, date: data[id].date, summary: getSummary(data[id]) };
    });
  } catch (err) { store.saves = []; }
}

function saveGame() {
  var id = String(Date.now());
  var date = new Date().toLocaleString('zh-CN');
  var saveData = {
    date: date,
    fen: e.serializeFEN(store.board, store.currentColor),
    moveHistory: store.moveHistory.map(function (m) { return m.from + ',' + m.to + ',' + m.captured; }),
    result: store.status,
  };
  try {
    var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    existing[id] = saveData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    store.saves = [{ id: id, date: date, summary: getSummary(saveData) }].concat(store.saves);
    store.liyaLine = '存好了。本天使替阁下记着这盘棋。';
    bump();
    return true;
  } catch (err) { return false; }
}

function loadGame(id) {
  try {
    var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    var d = existing[id];
    if (!d) return null;
    clearAiTimer();
    var parsed = e.deserializeFEN(d.fen);
    store.board = parsed.board;
    store.currentColor = parsed.turn;
    store.status = (d.result === 'playing' || d.result === 'red_win' || d.result === 'black_win' || d.result === 'draw') ? d.result : 'playing';
    store.moveHistory = (d.moveHistory || []).map(function (s) {
      var p = String(s).split(',').map(Number);
      return { from: p[0], to: p[1], captured: p[2] };
    });
    // 从初始盘面重放重建 boardHistory，保证悔棋可用
    var hist = [e.initBoard()];
    for (var i = 0; i < store.moveHistory.length; i++) {
      hist.push(e.makeMove(hist[hist.length - 1], store.moveHistory[i]));
    }
    store.boardHistory = hist;
    store.selected = null;
    store.legalMoves = [];
    store.lastMove = store.moveHistory.length ? store.moveHistory[store.moveHistory.length - 1] : null;
    store.aiThinking = false;
    store.liyaLine = '把存档翻出来了。接着下。';
    if (store.status === 'playing' && store.currentColor === t.Color.BLACK) scheduleAi();
    report();
    bump();
    return true;
  } catch (err) { return false; }
}

function deleteSave(id) {
  try {
    var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete existing[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    store.saves = store.saves.filter(function (s) { return s.id !== id; });
    bump();
  } catch (err) {}
}

// ── 与 Host 通信 ──
function post(path, body) {
  try {
    return fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).catch(function () {});
  } catch (err) { return null; }
}

function report() {
  post('/dsh-chess/report', {
    turn: store.currentColor,
    status: store.status,
    moves: store.moveHistory.length,
    selected: store.selected,
    aiThinking: store.aiThinking,
    lastMove: store.lastMove
      ? { from: store.lastMove.from, to: store.lastMove.to, captured: store.lastMove.captured }
      : null,
  });
}

function reportWithLine(line) {
  post('/dsh-chess/report', {
    line: line || '',
    turn: store.currentColor,
    status: store.status,
    moves: store.moveHistory.length,
    lastMove: store.lastMove
      ? { from: store.lastMove.from, to: store.lastMove.to, captured: store.lastMove.captured }
      : null,
  });
}

// 轮询：拉工具消息/命令 + 配置（AI 深度）
function pullState() {
  fetch('/dsh-chess/state', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || typeof d !== 'object') return;
      var changed = false;
      if (Array.isArray(d.messages) && d.messages.length) {
        var fresh = d.messages.filter(function (m) { return m.seq > store.seenSeq; });
        if (fresh.length) {
          for (var i = 0; i < fresh.length; i++) {
            var m = fresh[i];
            if (m.kind === 'cmd' && m.cmd === 'new_game') {
              newGame(); // 工具 chess_new_game 触发新局
            } else {
              store.messages = store.messages.concat([{ seq: m.seq, text: m.text }]).slice(-MAX_MESSAGES);
            }
          }
          if (fresh[fresh.length - 1].seq > store.seenSeq) store.seenSeq = fresh[fresh.length - 1].seq;
          changed = true;
        }
      }
      var cfg = d.config;
      if (cfg && typeof cfg === 'object' && Number.isInteger(cfg.aiDepth) && cfg.aiDepth >= 1 && cfg.aiDepth <= 4) {
        if (cfg.aiDepth !== store.aiDepth) { store.aiDepth = cfg.aiDepth; changed = true; }
      }
      if (changed) bump();
    })
    .catch(function () { /* 轮询失败静默 */ });
}

function pollTick() { pullState(); }

function boot() {
  newGame();
  loadSaves();
  pullState();
}

function formatMove(move) {
  var colNames = 'abcdefghi';
  var fromRC = e.to9x10(move.from), toRC = e.to9x10(move.to);
  var piece = move.captured !== t.Sq.EMPTY ? t.PIECE_CN[move.captured] : '';
  var capture = piece ? '吃' + piece : '';
  return colNames[fromRC[1]] + (10 - fromRC[0]) + ' → ' + colNames[toRC[1]] + (10 - toRC[0]) + capture;
}

module.exports = {
  POLL_MS, PANEL_EVENT, STORAGE_KEY, MAX_MESSAGES,
  panelState, rerender, store,
  bump, setPanelOpen, togglePanel, loadPos, savePos,
  newGame, handleCell, scheduleAi, undo,
  saveGame, loadGame, deleteSave, loadSaves, getSummary,
  pullState, pollTick, boot, formatMove, say,
};
