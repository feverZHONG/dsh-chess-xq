// dsh-chess-xq —— client 半 · 小 UI 组件（输入框开关 + 设置页）
// InputToggle：conversation.input.left 常驻开关（仿 dsh-puzzle，入口只留一个）。
// ChessSettings：settings.section —— AI 难度设置 + 当前局摘要（数据 fetch + 本地 useState）。
var react = require('react');
var core = require('./core');

function InputToggle() {
  var tickState = react.useState(0);
  var setTick = tickState[1];
  react.useEffect(function () {
    function onEvt() { setTick(function (x) { return x + 1; }); }
    window.addEventListener(core.PANEL_EVENT, onEvt);
    return function () { window.removeEventListener(core.PANEL_EVENT, onEvt); };
  }, []);
  return react.createElement('button', {
    type: 'button',
    title: '天界象棋',
    'aria-label': '天界象棋',
    'aria-expanded': core.panelState.open,
    onClick: core.togglePanel,
    style: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 26, height: 26, borderRadius: 7, cursor: 'pointer', padding: 0,
      border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.3))',
      background: core.panelState.open ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.15))' : 'transparent',
      color: 'var(--dsw-alias-label-primary, inherit)',
      fontSize: 14, lineHeight: 1, flex: 'none',
    },
  }, '♟');
}

var DIFF_LABELS = { 1: '萌新（1 层）', 2: '入门（2 层）', 3: '认真（3 层）', 4: '全力（4 层）' };

function ChessSettings() {
  var cfgState = react.useState({ aiDepth: 3 });
  var cfg = cfgState[0];
  var setCfg = cfgState[1];
  var repState = react.useState(null);
  var rep = repState[0];
  var setRep = repState[1];
  var errState = react.useState('');
  var error = errState[0];
  var setError = errState[1];

  function loadAll() {
    fetch('/dsh-chess/state', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        if (d.config && typeof d.config === 'object') setCfg(d.config);
        if (d.report && typeof d.report === 'object') setRep(d.report);
      })
      .catch(function () {});
  }

  react.useEffect(function () {
    loadAll();
    var id = setInterval(loadAll, 2000);
    return function () { clearInterval(id); };
  }, []);

  function setDepth(n) {
    setError('');
    fetch('/dsh-chess/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ aiDepth: n }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.config) setCfg(d.config); })
      .catch(function () { setError('保存失败（Host 路由不可达）'); });
  }

  function newGame() {
    setError('');
    fetch('/dsh-chess/cmd', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: 'new_game' }),
    }).catch(function () { setError('发起失败（Host 路由不可达）'); });
  }

  var btnStyle = {
    cursor: 'pointer', font: 'inherit', fontSize: 13,
    color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-3)',
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, padding: '5px 12px',
  };

  var depthOpts = [1, 2, 3, 4].map(function (n) {
    return react.createElement('option', { key: n, value: String(n) }, DIFF_LABELS[n]);
  });

  var nodes = [
    react.createElement('h2', { key: 'head', style: { margin: '0 0 8px', fontSize: 16, fontWeight: 600 } }, '天界象棋'),
    react.createElement('p', { key: 'tip', style: { margin: '0 0 10px', fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-secondary)' } },
      '中国象棋人机对战：阁下执红先手，本天使执黑。点输入框左侧「♟」打开对局面板，可悔棋、存档、调 AI 难度。'),
  ];

  if (rep) {
    var turnText = rep.turn === 0 ? '红方走（阁下）' : '黑方走（本天使）';
    var statusText = rep.status === 'playing' ? ('进行中 · ' + turnText)
      : rep.status === 'red_win' ? '红方胜'
      : rep.status === 'black_win' ? '黑方胜'
      : '和棋';
    nodes.push(react.createElement('div', { key: 'now', style: { marginBottom: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)' } },
      react.createElement('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-secondary)' } }, '当前局'),
      react.createElement('div', { style: { fontSize: 15, fontWeight: 600, marginTop: 2 } }, statusText),
      react.createElement('div', { style: { marginTop: 4, fontSize: 13, color: 'var(--dsw-alias-label-tertiary)' } },
        '已走 ' + rep.moves + ' 步' + (rep.aiThinking ? ' · 本天使思考中' : ''))));
  }

  nodes.push(react.createElement('div', { key: 'depth', style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
    react.createElement('span', { style: { fontSize: 13 } }, 'AI 难度'),
    react.createElement('select', {
      value: String(cfg.aiDepth || 3),
      onChange: function (ev) { setDepth(Number(ev.target.value)); },
      style: Object.assign({}, btnStyle, { cursor: 'pointer' }),
    }, depthOpts),
    react.createElement('button', { type: 'button', onClick: newGame, style: btnStyle }, '♟ 新开一局')));

  if (error) {
    nodes.push(react.createElement('div', { key: 'err', style: { marginBottom: 10, padding: '8px 12px', borderRadius: 10, fontSize: 13, color: 'var(--dsw-alias-state-danger-primary, #e5484d)', border: '1px solid var(--dsw-alias-state-danger-primary, #e5484d)', background: 'var(--dsw-alias-bg-layer-1)' } }, error));
  }

  nodes.push(react.createElement('p', { key: 'hint', style: { margin: '10px 0 0', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' } },
    '本天使可以发话到棋盘（chess_talk）、查看对局进展（chess_state）、直接开新局（chess_new_game）。存档存在浏览器本地（localStorage）。'));

  return react.createElement('div', { key: 'dsh-chess-xq', style: { padding: '4px 0', color: 'var(--dsw-alias-label-primary)' } }, nodes);
}

module.exports = { InputToggle, ChessSettings };
