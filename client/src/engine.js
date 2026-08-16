// dsh-chess-xq —— client 半 · 中国象棋规则引擎（纯函数，无状态）
// 移植自 chess-xq（web/src/game/engine.ts），逐函数直译。
var t = require('./types');

function initBoard() {
  var board = new Int8Array(t.BOARD_SIZE);
  for (var i = 0; i < t.BOARD_SIZE; i++) board[i] = t.Sq.SENTINEL;
  for (var r = 0; r <= 9; r++) for (var c = 0; c <= 8; c++) board[t.sqIdx(r, c)] = t.Sq.EMPTY;

  var blkBackRank = [t.Piece.R_BLK, t.Piece.N_BLK, t.Piece.B_BLK, t.Piece.A_BLK, t.Piece.K_BLK,
                     t.Piece.A_BLK, t.Piece.B_BLK, t.Piece.N_BLK, t.Piece.R_BLK];
  var redBackRank = [t.Piece.R_RED, t.Piece.N_RED, t.Piece.B_RED, t.Piece.A_RED, t.Piece.K_RED,
                     t.Piece.A_RED, t.Piece.B_RED, t.Piece.N_RED, t.Piece.R_RED];
  var blkPawns = [t.Piece.P_BLK, t.Sq.EMPTY, t.Piece.P_BLK, t.Sq.EMPTY, t.Piece.P_BLK,
                  t.Sq.EMPTY, t.Piece.P_BLK, t.Sq.EMPTY, t.Piece.P_BLK];
  var redPawns = [t.Piece.P_RED, t.Sq.EMPTY, t.Piece.P_RED, t.Sq.EMPTY, t.Piece.P_RED,
                  t.Sq.EMPTY, t.Piece.P_RED, t.Sq.EMPTY, t.Piece.P_RED];

  for (var c = 0; c <= 8; c++) {
    board[t.sqIdx(0, c)] = blkBackRank[c];
    board[t.sqIdx(2, c)] = c === 1 || c === 7 ? t.Piece.C_BLK : t.Sq.EMPTY;
    board[t.sqIdx(3, c)] = blkPawns[c];
    board[t.sqIdx(6, c)] = redPawns[c];
    board[t.sqIdx(7, c)] = c === 1 || c === 7 ? t.Piece.C_RED : t.Sq.EMPTY;
    board[t.sqIdx(9, c)] = redBackRank[c];
  }
  return board;
}

function to9x10(sq) { return t.sqToRC(sq); }
function from9x10(r, c) { return t.sqIdx(r, c); }

function inPalace(r, c, color) {
  var palace = color === t.Color.RED ? t.RED_PALACE : t.BLK_PALACE;
  return r >= palace.rowMin && r <= palace.rowMax && c >= palace.colMin && c <= palace.colMax;
}

function isCrossedRiver(r, color) {
  return color === t.Color.RED ? r <= 4 : r >= 5;
}

function genKingMoves(board, sq, color, moves) {
  var rc = to9x10(sq), r = rc[0], c = rc[1];
  for (var i = 0; i < t.KING_DIRS.length; i++) {
    var d = t.KING_DIRS[i], nr = r + d[0], nc = c + d[1];
    if (!t.inBoard(nr, nc)) continue;
    if (!inPalace(nr, nc, color)) continue;
    var to = from9x10(nr, nc);
    var target = board[to];
    if (target === t.Sq.SENTINEL) continue;
    if (target === t.Sq.EMPTY || t.colorOf(target) !== color) {
      moves.push({ from: sq, to: to, captured: target === t.Sq.EMPTY ? 0 : target });
    }
  }
}

function genAdvisorMoves(board, sq, color, moves) {
  var rc = to9x10(sq), r = rc[0], c = rc[1];
  for (var i = 0; i < t.ADVISOR_DELTAS.length; i++) {
    var d = t.ADVISOR_DELTAS[i], nr = r + d[0], nc = c + d[1];
    if (!t.inBoard(nr, nc)) continue;
    if (!inPalace(nr, nc, color)) continue;
    var to = from9x10(nr, nc);
    var target = board[to];
    if (target === t.Sq.SENTINEL) continue;
    if (target === t.Sq.EMPTY || t.colorOf(target) !== color) {
      moves.push({ from: sq, to: to, captured: target === t.Sq.EMPTY ? 0 : target });
    }
  }
}

function genBishopMoves(board, sq, color, moves) {
  var rc = to9x10(sq), r = rc[0], c = rc[1];
  for (var i = 0; i < t.BISHOP_MOVES.length; i++) {
    var m = t.BISHOP_MOVES[i], nr = r + m[0], nc = c + m[1];
    if (!t.inBoard(nr, nc)) continue;
    var hindrance = from9x10(r + m[2], c + m[3]);
    if (board[hindrance] !== t.Sq.EMPTY) continue;
    var to = from9x10(nr, nc);
    var target = board[to];
    if (target === t.Sq.SENTINEL) continue;
    if (target === t.Sq.EMPTY || t.colorOf(target) !== color) {
      moves.push({ from: sq, to: to, captured: target === t.Sq.EMPTY ? 0 : target });
    }
  }
}

function genKnightMoves(board, sq, color, moves) {
  var rc = to9x10(sq), r = rc[0], c = rc[1];
  for (var i = 0; i < t.KNIGHT_MOVES.length; i++) {
    var m = t.KNIGHT_MOVES[i], nr = r + m[0], nc = c + m[1];
    if (!t.inBoard(nr, nc)) continue;
    var hindrance = from9x10(r + m[2], c + m[3]);
    if (board[hindrance] !== t.Sq.EMPTY) continue;
    var to = from9x10(nr, nc);
    var target = board[to];
    if (target === t.Sq.SENTINEL) continue;
    if (target === t.Sq.EMPTY || t.colorOf(target) !== color) {
      moves.push({ from: sq, to: to, captured: target === t.Sq.EMPTY ? 0 : target });
    }
  }
}

function genRookMoves(board, sq, color, moves) {
  var rc = to9x10(sq), r = rc[0], c = rc[1];
  for (var i = 0; i < t.LINE_DIRS.length; i++) {
    var d = t.LINE_DIRS[i], nr = r + d[0], nc = c + d[1];
    while (t.inBoard(nr, nc)) {
      var to = from9x10(nr, nc);
      var target = board[to];
      if (target === t.Sq.SENTINEL) break;
      if (target !== t.Sq.EMPTY) {
        if (t.colorOf(target) !== color) moves.push({ from: sq, to: to, captured: target });
        break;
      }
      moves.push({ from: sq, to: to, captured: 0 });
      nr += d[0]; nc += d[1];
    }
  }
}

function genCannonMoves(board, sq, color, moves) {
  var rc = to9x10(sq), r = rc[0], c = rc[1];
  for (var i = 0; i < t.LINE_DIRS.length; i++) {
    var d = t.LINE_DIRS[i], nr = r + d[0], nc = c + d[1];
    var jumped = false;
    while (t.inBoard(nr, nc)) {
      var to = from9x10(nr, nc);
      var target = board[to];
      if (target === t.Sq.SENTINEL) break;
      if (!jumped) {
        if (target !== t.Sq.EMPTY) { jumped = true; }
        else { moves.push({ from: sq, to: to, captured: 0 }); }
      } else {
        if (target !== t.Sq.EMPTY) {
          if (t.colorOf(target) !== color) moves.push({ from: sq, to: to, captured: target });
          break;
        }
      }
      nr += d[0]; nc += d[1];
    }
  }
}

function genPawnMoves(board, sq, color, moves) {
  var rc = to9x10(sq), r = rc[0], c = rc[1];
  var forward = color === t.Color.RED ? -1 : 1;
  var crossed = isCrossedRiver(r, color);
  var fr = r + forward;
  if (t.inBoard(fr, c)) {
    var to = from9x10(fr, c);
    var target = board[to];
    if (target !== t.Sq.SENTINEL && (target === t.Sq.EMPTY || t.colorOf(target) !== color)) {
      moves.push({ from: sq, to: to, captured: target === t.Sq.EMPTY ? 0 : target });
    }
  }
  if (crossed) {
    for (var k = 0; k < 2; k++) {
      var dc = k === 0 ? -1 : 1;
      var nc = c + dc;
      if (t.inBoard(r, nc)) {
        var to2 = from9x10(r, nc);
        var target2 = board[to2];
        if (target2 !== t.Sq.SENTINEL && (target2 === t.Sq.EMPTY || t.colorOf(target2) !== color)) {
          moves.push({ from: sq, to: to2, captured: target2 === t.Sq.EMPTY ? 0 : target2 });
        }
      }
    }
  }
}

function genMoves(board, color) {
  var moves = [];
  for (var sq = 0; sq < t.BOARD_SIZE; sq++) {
    var piece = board[sq];
    if (piece <= t.Sq.EMPTY) continue;
    if (t.colorOf(piece) !== color) continue;
    switch (t.typeOf(piece)) {
      case t.PieceType.KING: genKingMoves(board, sq, color, moves); break;
      case t.PieceType.ADVISOR: genAdvisorMoves(board, sq, color, moves); break;
      case t.PieceType.BISHOP: genBishopMoves(board, sq, color, moves); break;
      case t.PieceType.KNIGHT: genKnightMoves(board, sq, color, moves); break;
      case t.PieceType.ROOK: genRookMoves(board, sq, color, moves); break;
      case t.PieceType.CANNON: genCannonMoves(board, sq, color, moves); break;
      case t.PieceType.PAWN: genPawnMoves(board, sq, color, moves); break;
    }
  }
  return moves;
}

function makeMove(board, move) {
  var newBoard = new Int8Array(board);
  newBoard[move.to] = newBoard[move.from];
  newBoard[move.from] = t.Sq.EMPTY;
  return newBoard;
}

function applyMove(board, move) {
  board[move.to] = board[move.from];
  board[move.from] = t.Sq.EMPTY;
}

function undoMove(board, move) {
  board[move.from] = board[move.to];
  board[move.to] = move.captured;
}

function getLegalMoves(board, color) {
  var pseudo = genMoves(board, color);
  return pseudo.filter(function (move) {
    var nb = makeMove(board, move);
    return !isInCheck(nb, color);
  });
}

function hasLegalMoves(board, color) {
  var pseudo = genMoves(board, color);
  for (var i = 0; i < pseudo.length; i++) {
    var nb = makeMove(board, pseudo[i]);
    if (!isInCheck(nb, color)) return true;
  }
  return false;
}

function findKing(board, color) {
  var king = color === t.Color.RED ? t.Piece.K_RED : t.Piece.K_BLK;
  for (var sq = 0; sq < t.BOARD_SIZE; sq++) if (board[sq] === king) return sq;
  return -1;
}

function forEachPiece(board, color, fn) {
  for (var sq = 0; sq < t.BOARD_SIZE; sq++) {
    var piece = board[sq];
    if (piece > t.Sq.EMPTY && t.colorOf(piece) === color) fn(sq, piece);
  }
}

function flyingGeneral(board) {
  var redKingSq = findKing(board, t.Color.RED);
  var blkKingSq = findKing(board, t.Color.BLACK);
  if (redKingSq < 0 || blkKingSq < 0) return false;
  var redRC = to9x10(redKingSq), blkRC = to9x10(blkKingSq);
  if (redRC[1] !== blkRC[1]) return false;
  var r1 = Math.floor(redKingSq / t.COLS);
  var r2 = Math.floor(blkKingSq / t.COLS);
  var rowMin = Math.min(r1, r2), rowMax = Math.max(r1, r2);
  for (var r = rowMin + 1; r < rowMax; r++) {
    if (board[r * t.COLS + (redKingSq % t.COLS)] !== t.Sq.EMPTY) return false;
  }
  return true;
}

function isInCheck(board, color) {
  if (flyingGeneral(board)) return true;
  var kingSq = findKing(board, color);
  if (kingSq < 0) return true;
  var oppMoves = genMoves(board, t.oppositeColor(color));
  for (var i = 0; i < oppMoves.length; i++) if (oppMoves[i].to === kingSq) return true;
  return false;
}

function isCheckmate(board, color) {
  if (!isInCheck(board, color)) return false;
  return !hasLegalMoves(board, color);
}

function isStalemate(board, color) {
  if (isInCheck(board, color)) return false;
  return !hasLegalMoves(board, color);
}

function serializeFEN(board, turn) {
  var rows = [];
  for (var r9 = 0; r9 <= 9; r9++) {
    var row = [];
    var emptyCount = 0;
    for (var c9 = 0; c9 <= 8; c9++) {
      var sq = from9x10(r9, c9);
      var piece = board[sq];
      if (piece <= t.Sq.EMPTY) { emptyCount++; }
      else {
        if (emptyCount > 0) { row.push(String(emptyCount)); emptyCount = 0; }
        row.push(t.PIECE_TO_FEN[piece]);
      }
    }
    if (emptyCount > 0) row.push(String(emptyCount));
    rows.push(row.join(''));
  }
  return rows.join('/') + ' ' + (turn === t.Color.RED ? 'w' : 'b') + ' - - 0 1';
}

function deserializeFEN(fen) {
  var parts = String(fen).split(' ');
  var boardStr = parts[0];
  var turnStr = parts[1];
  var board = new Int8Array(t.BOARD_SIZE);
  for (var r = 0; r < t.ROWS; r++) for (var c = 0; c < t.COLS; c++) board[r * t.COLS + c] = t.Sq.SENTINEL;
  for (var r2 = t.ROW_OFFSET; r2 < t.ROW_OFFSET + 10; r2++) {
    for (var c2 = t.COL_OFFSET; c2 < t.COL_OFFSET + 9; c2++) board[r2 * t.COLS + c2] = t.Sq.EMPTY;
  }
  var fenRows = boardStr.split('/');
  for (var r9 = 0; r9 < fenRows.length && r9 <= 9; r9++) {
    var rowStr = fenRows[r9];
    var c9 = 0;
    for (var i = 0; i < rowStr.length; i++) {
      var ch = rowStr[i];
      if (ch >= '1' && ch <= '9') { c9 += parseInt(ch, 10); }
      else if (t.FEN_TO_PIECE[ch] !== undefined) { board[from9x10(r9, c9)] = t.FEN_TO_PIECE[ch]; c9++; }
    }
  }
  return { board: board, turn: turnStr === 'w' ? t.Color.RED : t.Color.BLACK };
}

function printBoard(board) {
  var out = ['   a  b  c  d  e  f  g  h  i'];
  for (var r9 = 0; r9 <= 9; r9++) {
    var cells = [];
    for (var c9 = 0; c9 <= 8; c9++) {
      var piece = board[from9x10(r9, c9)];
      cells.push(piece === t.Sq.EMPTY ? ' .' : ' ' + t.PIECE_TO_FEN[piece]);
    }
    out.push(r9 + ' ' + cells.join(''));
  }
  return out.join('\n');
}

function selfTest() {
  var board = initBoard();
  var fen = serializeFEN(board, t.Color.RED);
  return fen === 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
}

module.exports = {
  initBoard, to9x10, from9x10,
  genMoves, getLegalMoves, hasLegalMoves,
  makeMove, applyMove, undoMove,
  findKing, forEachPiece,
  isInCheck, flyingGeneral, isCheckmate, isStalemate,
  serializeFEN, deserializeFEN, printBoard, selfTest,
};
