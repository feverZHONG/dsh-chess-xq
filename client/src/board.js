// dsh-chess-xq —— client 半 · 棋盘组件（SVG，React.createElement 直译 Board.tsx）
// 布局常量与参考实现一致：格 50px，内边距 30px，画布 510×560。
// 点击统一走透明点击层（rect 最后渲染盖住全格），onCellClick(row, col)。
var react = require('react');
var e = require('./engine');
var t = require('./types');

var CELL_SIZE = 50;
var PADDING = 30;
var BOARD_WIDTH = 9 * CELL_SIZE;
var BOARD_HEIGHT = 10 * CELL_SIZE;
var SVG_WIDTH = BOARD_WIDTH + PADDING * 2;
var SVG_HEIGHT = BOARD_HEIGHT + PADDING * 2;

function el(type, props, ...children) {
  // 🐛 0.1.0：children 只收一个参数，棋子的 <text> 全被丢弃 → 棋子「纯贴图」没名字
  // 修：rest 参数收齐后逐个传给 createElement（单子/数组/多子都兼容）
  return react.createElement.apply(null, [type, props].concat(children));
}

function Board(props) {
  var board = props.board;
  var onCellClick = props.onCellClick;
  var selectedSquare = props.selectedSquare;
  var legalMoves = props.legalMoves || [];
  var lastMove = props.lastMove || null;

  // 收集棋子
  var pieces = [];
  for (var r = 0; r <= 9; r++) {
    for (var c = 0; c <= 8; c++) {
      var sq = e.from9x10(r, c);
      var piece = board[sq];
      if (piece > t.Sq.EMPTY) pieces.push({ row: r, col: c, piece: piece });
    }
  }

  function isSelected(row, col) {
    if (selectedSquare === undefined || selectedSquare === null) return false;
    var rc = e.to9x10(selectedSquare);
    return rc[0] === row && rc[1] === col;
  }

  var nodes = [];

  // 木质底板
  nodes.push(el('rect', {
    key: 'bg',
    x: PADDING - 5, y: PADDING - 5,
    width: BOARD_WIDTH + 10, height: BOARD_HEIGHT + 10,
    fill: '#DEB887', rx: 4,
  }));

  var g = [];
  // 横线
  for (var r0 = 0; r0 < 10; r0++) {
    g.push(el('line', {
      key: 'h-' + r0,
      x1: 0, y1: r0 * CELL_SIZE, x2: BOARD_WIDTH, y2: r0 * CELL_SIZE,
      stroke: '#5D4037', strokeWidth: (r0 === 0 || r0 === 9) ? 2 : 1,
    }));
  }
  // 竖线
  for (var c0 = 0; c0 < 9; c0++) {
    g.push(el('line', {
      key: 'v-' + c0,
      x1: c0 * CELL_SIZE, y1: 0, x2: c0 * CELL_SIZE, y2: BOARD_HEIGHT,
      stroke: '#5D4037', strokeWidth: (c0 === 0 || c0 === 8) ? 2 : 1,
    }));
  }
  // 楚河汉界
  g.push(el('line', {
    key: 'river',
    x1: 0, y1: 4.5 * CELL_SIZE, x2: BOARD_WIDTH, y2: 4.5 * CELL_SIZE,
    stroke: '#5D4037', strokeWidth: 2, strokeDasharray: '5,5',
  }));
  g.push(el('text', { key: 'river-l', x: BOARD_WIDTH * 0.25, y: 4.5 * CELL_SIZE - 8, textAnchor: 'middle', fill: '#5D4037', fontSize: 14, fontWeight: 'bold' }, '楚河'));
  g.push(el('text', { key: 'river-r', x: BOARD_WIDTH * 0.75, y: 4.5 * CELL_SIZE - 8, textAnchor: 'middle', fill: '#5D4037', fontSize: 14, fontWeight: 'bold' }, '汉界'));
  // 九宫斜线（红方底部 + 黑方顶部）
  g.push(el('line', { key: 'p-r1', x1: 3 * CELL_SIZE, y1: 7 * CELL_SIZE, x2: 5 * CELL_SIZE, y2: 9 * CELL_SIZE, stroke: '#5D4037', strokeWidth: 1 }));
  g.push(el('line', { key: 'p-r2', x1: 5 * CELL_SIZE, y1: 7 * CELL_SIZE, x2: 3 * CELL_SIZE, y2: 9 * CELL_SIZE, stroke: '#5D4037', strokeWidth: 1 }));
  g.push(el('line', { key: 'p-b1', x1: 3 * CELL_SIZE, y1: 0, x2: 5 * CELL_SIZE, y2: 2 * CELL_SIZE, stroke: '#5D4037', strokeWidth: 1 }));
  g.push(el('line', { key: 'p-b2', x1: 5 * CELL_SIZE, y1: 0, x2: 3 * CELL_SIZE, y2: 2 * CELL_SIZE, stroke: '#5D4037', strokeWidth: 1 }));
  // 兵位标记
  [2, 4, 6].forEach(function (c) {
    g.push(el('circle', { key: 'p-red-' + c, cx: c * CELL_SIZE, cy: 3 * CELL_SIZE, r: 4, fill: '#5D4037' }));
  });
  [2, 4, 6].forEach(function (c) {
    g.push(el('circle', { key: 'p-blk-' + c, cx: c * CELL_SIZE, cy: 6 * CELL_SIZE, r: 4, fill: '#5D4037' }));
  });
  // 炮位标记
  g.push(el('circle', { key: 'c-1', cx: 1 * CELL_SIZE, cy: 2 * CELL_SIZE, r: 4, fill: '#5D4037' }));
  g.push(el('circle', { key: 'c-2', cx: 7 * CELL_SIZE, cy: 2 * CELL_SIZE, r: 4, fill: '#5D4037' }));
  g.push(el('circle', { key: 'c-3', cx: 1 * CELL_SIZE, cy: 7 * CELL_SIZE, r: 4, fill: '#5D4037' }));
  g.push(el('circle', { key: 'c-4', cx: 7 * CELL_SIZE, cy: 7 * CELL_SIZE, r: 4, fill: '#5D4037' }));
  // 列标记
  for (var c1 = 0; c1 < 9; c1++) {
    g.push(el('text', { key: 'col-t-' + c1, x: c1 * CELL_SIZE + CELL_SIZE / 2, y: -5, textAnchor: 'middle', fill: '#5D4037', fontSize: 12 }, String.fromCharCode(97 + c1)));
    g.push(el('text', { key: 'col-b-' + c1, x: c1 * CELL_SIZE + CELL_SIZE / 2, y: BOARD_HEIGHT + 20, textAnchor: 'middle', fill: '#5D4037', fontSize: 12 }, String.fromCharCode(97 + c1)));
  }
  // 行标记
  for (var r1 = 0; r1 < 10; r1++) {
    g.push(el('text', { key: 'row-l-' + r1, x: -15, y: r1 * CELL_SIZE + CELL_SIZE / 2 + 4, textAnchor: 'middle', fill: '#5D4037', fontSize: 12 }, String(10 - r1)));
    g.push(el('text', { key: 'row-r-' + r1, x: BOARD_WIDTH + 20, y: r1 * CELL_SIZE + CELL_SIZE / 2 + 4, textAnchor: 'middle', fill: '#5D4037', fontSize: 12 }, String(10 - r1)));
  }
  // 上一步落子高亮
  if (lastMove) {
    [lastMove.from, lastMove.to].forEach(function (sq, idx) {
      var rc = e.to9x10(sq);
      g.push(el('rect', {
        key: 'last-' + idx,
        x: rc[1] * CELL_SIZE + 2, y: rc[0] * CELL_SIZE + 2,
        width: CELL_SIZE - 4, height: CELL_SIZE - 4,
        fill: 'rgba(255, 215, 0, 0.25)', rx: 4,
      }));
    });
  }
  // 合法走法提示
  legalMoves.forEach(function (sq) {
    var rc = e.to9x10(sq);
    g.push(el('circle', {
      key: 'legal-' + sq,
      cx: rc[1] * CELL_SIZE + CELL_SIZE / 2, cy: rc[0] * CELL_SIZE + CELL_SIZE / 2,
      r: 8, fill: '#4CAF50', opacity: 0.6,
    }));
  });
  // 棋子
  pieces.forEach(function (p) {
    var isRed = t.colorOf(p.piece) === 0;
    var selected = isSelected(p.row, p.col);
    g.push(el('g', {
      key: 'piece-' + p.row + '-' + p.col,
      transform: 'translate(' + (p.col * CELL_SIZE + CELL_SIZE / 2) + ', ' + (p.row * CELL_SIZE + CELL_SIZE / 2) + ')',
    },
      el('circle', {
        r: CELL_SIZE * 0.42,
        fill: isRed ? '#E53935' : '#1A1A1A',
        stroke: selected ? '#FFD700' : '#333',
        strokeWidth: selected ? 3 : 2,
        style: { cursor: 'pointer' },
      }),
      el('text', {
        textAnchor: 'middle', dominantBaseline: 'middle',
        fill: isRed ? '#FFF' : '#DDD', fontSize: 24, fontWeight: 'bold',
        style: { pointerEvents: 'none' },
      }, t.PIECE_CN[p.piece])));
  });
  // 点击层（最后渲染，覆盖全格）
  for (var r2 = 0; r2 < 10; r2++) {
    for (var c2 = 0; c2 < 9; c2++) {
      g.push(el('rect', {
        key: 'click-' + r2 + '-' + c2,
        x: c2 * CELL_SIZE, y: r2 * CELL_SIZE,
        width: CELL_SIZE, height: CELL_SIZE,
        fill: 'transparent',
        style: { cursor: 'pointer', pointerEvents: 'fill' },
        onClick: (function (rr, cc) { return function () { if (onCellClick) onCellClick(rr, cc); }; })(r2, c2),
      }));
    }
  }

  nodes.push(el('g', { key: 'grid', transform: 'translate(' + PADDING + ', ' + PADDING + ')' }, g));

  return el('svg', {
    width: SVG_WIDTH, height: SVG_HEIGHT,
    viewBox: '0 0 ' + SVG_WIDTH + ' ' + SVG_HEIGHT,
    className: 'dsh-chess-board',
    style: { display: 'block', maxWidth: '100%', height: 'auto' },
  }, nodes);
}

module.exports = { Board, CELL_SIZE, PADDING, BOARD_WIDTH, BOARD_HEIGHT, SVG_WIDTH, SVG_HEIGHT };
