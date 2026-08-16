// dsh-chess-xq —— client 半 · 中国象棋常量与基础函数
// 移植自 chess-xq（web/src/game/types.ts）：
// 棋盘用 17×14 哨兵数组，有效区 9×10（row/col 偏移 3）；棋子编码：bit3 = 颜色，低 3 位 = 兵种。
// 红方在下（row 9 是红底线），黑方在上（row 0 是黑底线）。
var ROWS = 17;
var COLS = 14;
var BOARD_SIZE = ROWS * COLS;

var Sq = { SENTINEL: -1, EMPTY: 0 };

var ROW_OFFSET = 3;
var COL_OFFSET = 3;

var RED_PALACE = { rowMin: 7, rowMax: 9, colMin: 3, colMax: 5 };
var BLK_PALACE = { rowMin: 0, rowMax: 2, colMin: 3, colMax: 5 };

var Color = { RED: 0, BLACK: 1 };
var OPPOSITE = { 0: 1, 1: 0 };

var PieceType = { KING: 1, ADVISOR: 2, BISHOP: 3, KNIGHT: 4, ROOK: 5, CANNON: 6, PAWN: 7 };

var Piece = {
  K_RED: 1, A_RED: 2, B_RED: 3, N_RED: 4, R_RED: 5, C_RED: 6, P_RED: 7,
  K_BLK: 9, A_BLK: 10, B_BLK: 11, N_BLK: 12, R_BLK: 13, C_BLK: 14, P_BLK: 15,
};

function colorOf(piece) { return (piece >> 3) & 1; }
function typeOf(piece) { return piece & 7; }
function oppositeColor(c) { return c === Color.RED ? Color.BLACK : Color.RED; }

// 9×10 坐标 <-> 17×14 哨兵数组下标
function sqIdx(row9x10, col9x10) { return (row9x10 + ROW_OFFSET) * COLS + (col9x10 + COL_OFFSET); }
function sqToRC(sq) { return [Math.floor(sq / COLS) - ROW_OFFSET, (sq % COLS) - COL_OFFSET]; }
function inBoard(r, c) { return r >= 0 && r <= 9 && c >= 0 && c <= 8; }

var KNIGHT_MOVES = [
  [-2, -1, -1, 0], [-2, 1, -1, 0],
  [-1, -2, 0, -1], [-1, 2, 0, 1],
  [1, -2, 0, -1], [1, 2, 0, 1],
  [2, -1, 1, 0], [2, 1, 1, 0],
];

var ADVISOR_DELTAS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

var BISHOP_MOVES = [
  [-2, -2, -1, -1], [-2, 2, -1, 1],
  [2, -2, 1, -1], [2, 2, 1, 1],
];

var LINE_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
var KING_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

var PIECE_TO_FEN = {
  1: 'K', 2: 'A', 3: 'B', 4: 'N', 5: 'R', 6: 'C', 7: 'P',
  9: 'k', 10: 'a', 11: 'b', 12: 'n', 13: 'r', 14: 'c', 15: 'p',
};

var FEN_TO_PIECE = {
  'K': 1, 'A': 2, 'B': 3, 'N': 4, 'R': 5, 'C': 6, 'P': 7,
  'k': 9, 'a': 10, 'b': 11, 'n': 12, 'r': 13, 'c': 14, 'p': 15,
};

var PIECE_CN = {
  1: '帅', 2: '仕', 3: '相', 4: '马', 5: '车', 6: '炮', 7: '兵',
  9: '将', 10: '士', 11: '象', 12: '马', 13: '车', 14: '砲', 15: '卒',
};

module.exports = {
  ROWS, COLS, BOARD_SIZE, Sq, ROW_OFFSET, COL_OFFSET,
  RED_PALACE, BLK_PALACE, Color, OPPOSITE, PieceType, Piece,
  colorOf, typeOf, oppositeColor, sqIdx, sqToRC, inBoard,
  KNIGHT_MOVES, ADVISOR_DELTAS, BISHOP_MOVES, LINE_DIRS, KING_DIRS,
  PIECE_TO_FEN, FEN_TO_PIECE, PIECE_CN,
};
