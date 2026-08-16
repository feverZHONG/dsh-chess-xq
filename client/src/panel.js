// dsh-chess-xq —— client 半 · 对局浮窗面板（shell.overlay，可拖拽）
// 仿 dsh-puzzle panel.js：useState tick 订阅 core.rerender + PANEL_EVENT；
// 所有状态走 core.store，操作走 core.*（改状态 → 上报 host → bump）。
var react = require('react');
var core = require('./core');
var boardMod = require('./board');
var t = require('./types');

function ChessPanel() {
  var tickState = react.useState(0);
  var setTick = tickState[1];

  react.useEffect(function () {
    core.rerender.fn = setTick;
    function onEvt() { setTick(function (x) { return x + 1; }); }
    window.addEventListener(core.PANEL_EVENT, onEvt);
    return function () {
      core.rerender.fn = null;
      window.removeEventListener(core.PANEL_EVENT, onEvt);
    };
  }, []);

  if (!core.panelState.open) return null;

  var s = core.store;
  var canUndo = s.moveHistory.length >= 2 && s.currentColor === t.Color.RED && s.status === 'playing';

  // 状态文案
  var statusText;
  if (s.status === 'red_win') statusText = '🎉 恭喜阁下获胜！';
  else if (s.status === 'black_win') statusText = '😔 阁下落败了...';
  else if (s.status === 'draw') statusText = '🤝 和棋！';
  else statusText = s.currentColor === t.Color.RED ? '阁下执红，请落子' : 'AI 执黑，思考中…';

  var btnStyle = {
    font: 'inherit', fontSize: 12, lineHeight: '1.4', padding: '3px 10px', borderRadius: 8,
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))',
    background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.6))',
    color: 'var(--dsw-alias-label-primary, inherit)', cursor: 'pointer',
  };
  var btnDisabled = Object.assign({}, btnStyle, { opacity: 0.45, cursor: 'not-allowed' });

  // 莉娅气泡：工具发来的话优先，其次对局台词
  var lastMsg = s.messages.length ? s.messages[s.messages.length - 1] : null;
  var bubbleEl = null;
  if (lastMsg) {
    bubbleEl = react.createElement('div', {
      style: {
        marginBottom: 8, fontSize: 12, lineHeight: '1.5',
        background: 'linear-gradient(90deg, rgba(255,209,220,0.92), rgba(251,194,235,0.92))',
        color: '#43223f', padding: '6px 10px', borderRadius: '10px 10px 10px 2px',
      },
    }, '莉娅：' + lastMsg.text);
  } else if (s.liyaLine) {
    bubbleEl = react.createElement('div', {
      style: {
        marginBottom: 8, fontSize: 12, lineHeight: '1.5',
        color: 'var(--dsw-alias-label-secondary, #888)',
        padding: '2px 2px', borderRadius: 8, fontStyle: 'italic',
      },
    }, '✦ ' + s.liyaLine);
  }

  // 存档列表
  var saveNodes = null;
  if (s.showSaves) {
    var items = [];
    if (!s.saves.length) {
      items.push(react.createElement('p', { key: 'empty', style: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-label-tertiary, #999)' } }, '还没有存档'));
    } else {
      s.saves.forEach(function (sv) {
        items.push(react.createElement('div', {
          key: sv.id,
          style: {
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 6,
            background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.5))',
            borderRadius: 8,
          },
        },
          react.createElement('div', { style: { flex: '1 1 auto', minWidth: 0 } },
            react.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #777)' } }, sv.date),
            react.createElement('div', { style: { fontSize: 12 } }, sv.summary)),
          react.createElement('button', { type: 'button', style: btnStyle, onClick: function (id) { return function () { core.loadGame(id); }; }(sv.id) }, '加载'),
          react.createElement('button', {
            type: 'button',
            style: Object.assign({}, btnStyle, { color: 'var(--dsw-alias-state-danger-primary, #e5484d)' }),
            onClick: function (id) { return function () { core.deleteSave(id); }; }(sv.id),
          }, '删除')));
      });
    }
    saveNodes = react.createElement('div', { style: { marginTop: 6, padding: 8, borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.2))' } },
      react.createElement('div', { style: { marginBottom: 6, fontSize: 12, fontWeight: 600 } }, '存档列表'), items);
  }

  // 胜负遮罩
  var overlay = null;
  if (s.status !== 'playing') {
    var oc;
    if (s.status === 'red_win') oc = { title: '🏆 胜利！', msg: '恭喜阁下击败本天使，荣登天界棋圣！', bg: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)' };
    else if (s.status === 'black_win') oc = { title: '💔 失利', msg: '阁下落败了，但胜败乃兵家常事，再接再厉！', bg: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)' };
    else oc = { title: '🤝 和棋', msg: '双方势均力敌，平局收场，乃君子之战！', bg: 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)' };
    overlay = react.createElement('div', {
      style: {
        position: 'absolute', inset: 0, background: oc.bg, borderRadius: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, color: '#fff', zIndex: 5, textAlign: 'center', padding: 16,
      },
    },
      react.createElement('div', { style: { fontSize: 20, fontWeight: 700 } }, oc.title),
      react.createElement('div', { style: { fontSize: 12, lineHeight: '18px', opacity: 0.9, maxWidth: 260 } }, oc.msg),
      react.createElement('div', { style: { fontSize: 12, opacity: 0.85, fontStyle: 'italic' } }, '「' + (s.liyaLine || '…') + '」'),
      react.createElement('button', { type: 'button', onClick: core.newGame, style: Object.assign({}, btnStyle, { background: 'rgba(255,255,255,0.22)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)', marginTop: 6 }) }, '再来一局'));
  }

  // AI 思考指示
  var thinkingEl = null;
  if (s.aiThinking && s.status === 'playing') {
    thinkingEl = react.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)' } },
      react.createElement('span', { style: {
        width: 12, height: 12, borderRadius: '50%', flex: 'none',
        border: '2px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.3))',
        borderTopColor: 'var(--dsw-alias-label-primary, #444)',
        animation: 'dsh-chess-spin 0.8s linear infinite',
      } }),
      '本天使思考中…');
  }

  // 落子记录列（0.2.1：从独立浮条搬回面板，棋盘右侧；最新在上，随 bump 实时刷新）
  var histItems = [];
  if (!s.moveHistory.length) {
    histItems.push(react.createElement('p', { key: 'empty', style: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-label-tertiary, #999)' } }, '暂无记录'));
  } else {
    for (var hi = s.moveHistory.length - 1; hi >= 0; hi--) {
      var hIsRed = hi % 2 === 0;
      histItems.push(react.createElement('div', {
        key: hi,
        style: {
          display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.12))',
        },
      },
        react.createElement('span', {
          style: { minWidth: 24, fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #999)', flex: 'none' },
        }, Math.floor(hi / 2) + 1 + (hIsRed ? '红' : '黑')),
        react.createElement('span', {
          style: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        }, core.formatMove(s.moveHistory[hi]))));
    }
  }
  var historyCol = react.createElement('div', {
    style: {
      width: 200, flex: 'none', alignSelf: 'stretch',
      padding: '8px 10px', borderRadius: 10,
      background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.5))',
      display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 500,
    },
  },
    react.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4, flex: 'none' } }, '落子记录'),
    react.createElement('div', { style: { overflowY: 'auto', flex: '1 1 auto', minHeight: 0 } }, histItems));

  // 面板定位：记忆上次位置（0.2.0 修「界面不固定」），没有则默认右上角；
  // 落子记录在棋盘右侧（0.2.1），本面板=棋盘+历史+控制一体
  if (!core.panelState.pos) {
    core.panelState.pos = core.loadPos() || {
      x: Math.max(8, (window.innerWidth || 1200) - 770),
      y: Math.max(8, 70),
    };
  }
  var pos = core.panelState.pos;

  function onHeaderDown(ev) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    var sx = ev.clientX, sy = ev.clientY;
    var bx = pos.x, by = pos.y;
    function onMove(mv) {
      core.panelState.pos = { x: bx + (mv.clientX - sx), y: by + (mv.clientY - sy) };
      core.bump();
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      core.savePos(); // 拖完落盘，下次打开还在老位置
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  var controls = react.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' } },
    react.createElement('button', { type: 'button', style: btnStyle, onClick: core.newGame }, '重新开始'),
    react.createElement('button', {
      type: 'button',
      style: canUndo ? btnStyle : btnDisabled,
      disabled: !canUndo,
      onClick: core.undo,
    }, '悔棋'),
    react.createElement('button', { type: 'button', style: btnStyle, onClick: core.saveGame }, '保存'),
    react.createElement('button', {
      type: 'button',
      style: btnStyle,
      onClick: function () { s.showSaves = !s.showSaves; core.bump(); },
    }, s.showSaves ? '收起存档' : '存档'));

  return react.createElement('div', {
    style: {
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 3000,
      width: 748, maxWidth: 'calc(100vw - 16px)',
      maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
      background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
      color: 'var(--dsw-alias-label-primary, inherit)',
      border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))',
      borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: 13, userSelect: 'none',
    },
  },
    react.createElement('div', {
      onMouseDown: onHeaderDown,
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', cursor: 'move',
        borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.2))',
        background: 'linear-gradient(90deg, rgba(255,209,220,0.35), rgba(251,194,235,0.35))',
        borderRadius: '14px 14px 0 0',
      },
      title: '按住标题可拖动',
    },
      react.createElement('span', { style: { fontWeight: 600, fontSize: 14 } }, '♟ 天界象棋'),
      react.createElement('button', {
        type: 'button',
        onClick: function () { core.setPanelOpen(false); },
        style: {
          border: 0, background: 'transparent', cursor: 'pointer',
          color: 'var(--dsw-alias-label-tertiary, #999)', fontSize: 15, padding: '2px 6px',
        },
      }, '✕')),
    react.createElement('div', { style: { padding: '6px 14px 14px' } },
      bubbleEl,
      react.createElement('div', { style: { fontSize: 14, fontWeight: 600 } }, statusText),
      react.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'stretch', margin: '6px 0 0' } },
        react.createElement('div', { style: { position: 'relative', width: 'max-content', maxWidth: '100%', flex: 'none' } },
          react.createElement(boardMod.Board, {
            board: s.board,
            onCellClick: core.handleCell,
            selectedSquare: s.selected,
            legalMoves: s.legalMoves,
            lastMove: s.lastMove,
          }),
          overlay),
        historyCol),
      controls,
      saveNodes,
      thinkingEl));
}

module.exports = { ChessPanel };
