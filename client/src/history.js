// dsh-chess-xq —— client 半 · 行走历史条（主页面右侧，shell.overlay 第二条目）
// 0.2.0：用户要求「行走历史迁移到主页面的右侧，上方是最新的行动」——
// 从棋盘浮窗里拿出来，做成固定在主窗口右侧中间的窄条，最新一手在最上面（倒序）。
// 与棋盘浮窗同生命周期：面板打开时显示，关闭时消失；数据走 core.store。
var react = require('react');
var core = require('./core');

function HistoryPanel() {
  var tickState = react.useState(0);
  var setTick = tickState[1];

  react.useEffect(function () {
    function onEvt() { setTick(function (x) { return x + 1; }); }
    window.addEventListener(core.PANEL_EVENT, onEvt);
    return function () { window.removeEventListener(core.PANEL_EVENT, onEvt); };
  }, []);

  if (!core.panelState.open) return null;

  var s = core.store;
  var items = [];
  if (!s.moveHistory.length) {
    items.push(react.createElement('p', { key: 'empty', style: { margin: '4px 0', fontSize: 12, color: 'var(--dsw-alias-label-tertiary, #999)' } }, '暂无记录'));
  } else {
    // 倒序：最新在上，以此类推
    for (var i = s.moveHistory.length - 1; i >= 0; i--) {
      var isRed = i % 2 === 0;
      items.push(react.createElement('div', {
        key: i,
        style: {
          display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.12))',
        },
      },
        react.createElement('span', {
          style: { minWidth: 20, fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #999)', flex: 'none' },
        }, Math.floor(i / 2) + 1 + (isRed ? '红' : '黑')),
        react.createElement('span', {
          style: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        }, core.formatMove(s.moveHistory[i]))));
    }
  }

  return react.createElement('div', {
    style: {
      position: 'fixed', right: 10, top: '50%', transform: 'translateY(-50%)',
      zIndex: 2900, width: 236, maxWidth: 'calc(100vw - 24px)',
      maxHeight: '70vh', overflowY: 'auto',
      background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
      color: 'var(--dsw-alias-label-primary, inherit)',
      border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))',
      borderRadius: 12, boxShadow: '0 10px 32px rgba(0,0,0,0.25)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: 12, padding: '10px 12px', userSelect: 'none',
    },
  },
    react.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    },
      react.createElement('span', { style: { fontWeight: 600, fontSize: 13 } }, '落子记录'),
      react.createElement('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #999)' } },
        s.moveHistory.length ? s.moveHistory.length + ' 手' : '') ),
    items);
}

module.exports = { HistoryPanel };
