// dsh-chess-xq —— client 半 · 中国象棋 AI（alpha-beta 搜索 + 位置估值表 PST）
// 移植自 chess-xq（web/src/game/ai.ts）。深度默认 3，可配置（1~4）。
// 注意：搜索是同步的，深度 3 在浏览器主线程可能卡几百毫秒（参考实现同款）。
var t = require('./types');
var e = require('./engine');

var PIECE_VALUE = {
  1: 100000, 2: 100, 3: 120, 4: 270, 5: 600, 6: 285, 7: 30,
  9: 100000, 10: 100, 11: 120, 12: 270, 13: 600, 14: 285, 15: 30,
};

var PIECE_ORDER = { 1: 7, 5: 6, 6: 5, 4: 4, 3: 3, 2: 2, 7: 1 };

var PST_PAWN = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [20, 0, 20, 0, 30, 0, 20, 0, 20],
  [20, 0, 20, 0, 30, 0, 20, 0, 20],
  [30, 10, 30, 20, 50, 20, 30, 10, 30],
  [40, 20, 40, 30, 60, 30, 40, 20, 40],
  [50, 30, 50, 40, 70, 40, 50, 30, 50],
  [50, 40, 50, 50, 90, 50, 50, 40, 50],
];

var PST_KNIGHT = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [-10, -20, -10, -20, 10, -20, -10, -20, -10],
  [-10, 0, 0, -10, 10, -10, 0, 0, -10],
  [10, 0, 0, 10, 20, 10, 0, 0, 10],
  [0, 0, 10, 20, 30, 20, 10, 0, 0],
];

var PST_ROOK = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [10, 20, 20, 20, 20, 20, 20, 20, 10],
  [10, 20, 30, 30, 30, 30, 30, 20, 10],
  [10, 20, 30, 40, 40, 40, 30, 20, 10],
  [10, 20, 30, 50, 60, 50, 30, 20, 10],
];

var PST_CANNON = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 10, 0, 0, 0, 10, 0, 0],
  [0, 10, 10, 0, 0, 0, 10, 10, 0],
  [10, 10, 20, 10, 10, 10, 20, 10, 10],
  [10, 20, 30, 30, 40, 30, 30, 20, 10],
];

var PST_ADVISOR = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 10, 20, 10, 0, 0, 0],
];

var PST_BISHOP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 10, 0, 0, 0, 10, 0, 0],
];

var PST_KING = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 20, 30, 20, 0, 0, 0],
];

var PIECE_PST = {
  1: PST_KING, 9: PST_KING,
  2: PST_ADVISOR, 10: PST_ADVISOR,
  3: PST_BISHOP, 11: PST_BISHOP,
  4: PST_KNIGHT, 12: PST_KNIGHT,
  5: PST_ROOK, 13: PST_ROOK,
  6: PST_CANNON, 14: PST_CANNON,
  7: PST_PAWN, 15: PST_PAWN,
};

function evaluate(board) {
  var score = 0;
  for (var sq = 0; sq < t.BOARD_SIZE; sq++) {
    var piece = board[sq];
    if (piece <= t.Sq.EMPTY) continue;
    var rc = e.to9x10(sq), r9 = rc[0], c9 = rc[1];
    var isRed = t.colorOf(piece) === t.Color.RED;
    var baseVal = PIECE_VALUE[piece];
    var bonus = 0;
    if (t.typeOf(piece) === t.PieceType.PAWN) {
      if ((isRed && r9 <= 4) || (!isRed && r9 >= 5)) bonus = 70;
    }
    var pstRow = isRed ? r9 : (9 - r9);
    var posVal = PIECE_PST[piece][pstRow][c9];
    score += isRed ? (baseVal + bonus + posVal) : -(baseVal + bonus + posVal);
  }
  return score;
}

function moveScore(move, board) {
  var capturedType = move.captured ? t.typeOf(move.captured) : 0;
  var attackerType = t.typeOf(board[move.from]);
  if (capturedType > 0) {
    return 10000 + PIECE_ORDER[capturedType] * 10 - PIECE_ORDER[attackerType];
  }
  return 0;
}

function sortMoves(moves, board) {
  for (var i = 0; i < moves.length; i++) moves[i].score = moveScore(moves[i], board);
  moves.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
}

var searchNodes = 0;
function resetSearchStats() { searchNodes = 0; }
function getSearchNodes() { return searchNodes; }

function alphaBeta(board, depth, alpha, beta, color) {
  searchNodes++;
  if (e.isCheckmate(board, color)) return -100000 + (100 - depth);
  if (e.isStalemate(board, color)) return -100000 + (100 - depth);
  if (depth === 0) return evaluate(board) * (color === t.Color.RED ? 1 : -1);
  var moves = e.getLegalMoves(board, color);
  if (moves.length === 0) return -100000 + (100 - depth);
  sortMoves(moves, board);
  for (var i = 0; i < moves.length; i++) {
    e.applyMove(board, moves[i]);
    var score = -alphaBeta(board, depth - 1, -beta, -alpha, t.oppositeColor(color));
    e.undoMove(board, moves[i]);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function findBestMove(board, color, depth) {
  depth = depth || 3;
  resetSearchStats();
  var moves = e.getLegalMoves(board, color);
  if (moves.length === 0) return { move: null, score: -100000, nodes: 0 };
  if (moves.length === 1) return { move: moves[0], score: 0, nodes: 1 };
  sortMoves(moves, board);
  var bestMove = null;
  var bestScore = -Infinity;
  for (var i = 0; i < moves.length; i++) {
    e.applyMove(board, moves[i]);
    var score = -alphaBeta(board, depth - 1, -Infinity, Infinity, t.oppositeColor(color));
    e.undoMove(board, moves[i]);
    if (score > bestScore) { bestScore = score; bestMove = moves[i]; }
  }
  return { move: bestMove, score: bestScore, nodes: searchNodes };
}

module.exports = { evaluate, findBestMove, resetSearchStats, getSearchNodes };
