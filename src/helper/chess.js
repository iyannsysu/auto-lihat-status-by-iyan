/// ============================================================
///  AUTO LIHAT STATUS BY IYAN
///  Copyright (c) 2026 Iyan. Seluruh hak cipta dilindungi.
///  Copyright (c) 2026 Iyan. All rights reserved.
/// ------------------------------------------------------------
///  [ID] Script ini dibuat oleh Iyan. Dilarang keras memperjual-
///  belikan, mengklaim ulang, atau mendistribusikan ulang script
///  ini — baik sebagian maupun seluruhnya — tanpa izin tertulis
///  dari pembuat. Pelanggaran akan ditindak sesuai hukum yang
///  berlaku. Jika menemukan pihak yang memperjualbelikan script
///  ini, segera hubungi pembuat melalui WhatsApp di bawah ini.
///  [EN] This script was created by Iyan. Reselling, rebranding,
///  or redistributing this script — in whole or in part — without
///  written permission from the creator is strictly prohibited.
///  Violations will be subject to applicable legal action. If you
///  find anyone reselling this script, please contact the creator
///  immediately via WhatsApp below.
/// ------------------------------------------------------------
///  WhatsApp: +6282161429908
/// ============================================================
///
'use strict';
/**
 * helper/chess.js — engine catur mini + AI + render papan PNG.
 *
 * Aturan lengkap: langkah legal semua bidak, rokade, en passant,
 * promosi, skak / skakmat / stalemate. AI: evaluasi material +
 * tangkapan + bonus tengah (1 lapis, ada acak di antara yang terbaik)
 * — level santai buat main seru-seruan di chat.
 * Papan digambar jadi PNG via ffmpeg (drawbox + glyph DejaVu Sans);
 * bila ffmpeg/font gagal, pemanggil bisa jatuh ke papan teks.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FFMPEG = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg'].find(p => p === 'ffmpeg' || fs.existsSync(p));

const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const GLYPH = {
	w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
	b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};
const FILES = 'abcdefgh';
const idx = (f, r) => r * 8 + f;
const fileOf = i => i % 8;
const rankOf = i => Math.floor(i / 8);
const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const colorOf = p => (p ? (p === p.toUpperCase() ? 'w' : 'b') : null);
const opp = c => (c === 'w' ? 'b' : 'w');
export function sqName(i) { return FILES[fileOf(i)] + (rankOf(i) + 1); }
export function parseSq(s) {
	const f = FILES.indexOf(s[0]);
	const r = Number(s[1]) - 1;
	return onBoard(f, r) ? idx(f, r) : -1;
}

export function newGame() {
	const b = Array(64).fill(null);
	const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
	for (let f = 0; f < 8; f++) {
		b[idx(f, 0)] = back[f];
		b[idx(f, 1)] = 'P';
		b[idx(f, 6)] = 'p';
		b[idx(f, 7)] = back[f].toLowerCase();
	}
	return { b, turn: 'w', cast: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1, hist: [], capW: [], capB: [], last: null };
}

function isAttacked(st, target, by) {
	const tf = fileOf(target), tr = rankOf(target);
	// pion
	const pawnDir = by === 'w' ? 1 : -1;
	for (const df of [-1, 1]) {
		const f = tf + df, r = tr - pawnDir;
		if (onBoard(f, r)) {
			const p = st.b[idx(f, r)];
			if (p && colorOf(p) === by && p.toUpperCase() === 'P') return true;
		}
	}
	// kuda
	for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
		const f = tf + df, r = tr + dr;
		if (onBoard(f, r)) {
			const p = st.b[idx(f, r)];
			if (p && colorOf(p) === by && p.toUpperCase() === 'N') return true;
		}
	}
	// raja
	for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
		if (!df && !dr) continue;
		const f = tf + df, r = tr + dr;
		if (onBoard(f, r)) {
			const p = st.b[idx(f, r)];
			if (p && colorOf(p) === by && p.toUpperCase() === 'K') return true;
		}
	}
	// geser: lurus (R/Q) & diagonal (B/Q)
	for (const [dirs, types] of [
		[[[1, 0], [-1, 0], [0, 1], [0, -1]], ['R', 'Q']],
		[[[1, 1], [1, -1], [-1, 1], [-1, -1]], ['B', 'Q']],
	]) {
		for (const [df, dr] of dirs) {
			let f = tf + df, r = tr + dr;
			while (onBoard(f, r)) {
				const p = st.b[idx(f, r)];
				if (p) {
					if (colorOf(p) === by && types.includes(p.toUpperCase())) return true;
					break;
				}
				f += df; r += dr;
			}
		}
	}
	return false;
}

function kingSq(st, color) {
	const k = color === 'w' ? 'K' : 'k';
	return st.b.indexOf(k);
}
export function inCheck(st, color) {
	return isAttacked(st, kingSq(st, color), opp(color));
}

function pseudoMoves(st, color) {
	const moves = [];
	const dir = color === 'w' ? 1 : -1;
	const startRank = color === 'w' ? 1 : 6;
	const lastRank = color === 'w' ? 7 : 0;
	for (let i = 0; i < 64; i++) {
		const p = st.b[i];
		if (!p || colorOf(p) !== color) continue;
		const t = p.toUpperCase();
		const f = fileOf(i), r = rankOf(i);
		const push = (to, extra = {}) => moves.push({ from: i, to, piece: t, ...extra });
		if (t === 'P') {
			const oneF = f, oneR = r + dir;
			if (onBoard(oneF, oneR) && !st.b[idx(oneF, oneR)]) {
				if (oneR === lastRank) for (const pr of ['Q', 'R', 'B', 'N']) push(idx(oneF, oneR), { promo: pr });
				else {
					push(idx(oneF, oneR));
					const twoR = r + 2 * dir;
					if (r === startRank && !st.b[idx(f, twoR)]) push(idx(f, twoR), { dbl: true });
				}
			}
			for (const df of [-1, 1]) {
				const cf = f + df, cr = r + dir;
				if (!onBoard(cf, cr)) continue;
				const to = idx(cf, cr);
				const target = st.b[to];
				if (target && colorOf(target) !== color) {
					if (cr === lastRank) for (const pr of ['Q', 'R', 'B', 'N']) push(to, { promo: pr, capture: true });
					else push(to, { capture: true });
				} else if (!target && to === st.ep) {
					push(to, { capture: true, ep: true });
				}
			}
		} else if (t === 'N' || t === 'K') {
			const deltas = t === 'N'
				? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]
				: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
			for (const [df, dr] of deltas) {
				const nf = f + df, nr = r + dr;
				if (!onBoard(nf, nr)) continue;
				const to = idx(nf, nr);
				const target = st.b[to];
				if (!target) push(to);
				else if (colorOf(target) !== color) push(to, { capture: true });
			}
			if (t === 'K') {
				const home = color === 'w' ? 0 : 7;
				const enemy = opp(color);
				const rights = color === 'w' ? ['K', 'Q'] : ['k', 'q'];
				if (i === idx(4, home) && !inCheck(st, color)) {
					// rokade pendek
					if (st.cast[rights[0]] && !st.b[idx(5, home)] && !st.b[idx(6, home)] && st.b[idx(7, home)]?.toUpperCase() === 'R'
						&& !isAttacked(st, idx(5, home), enemy) && !isAttacked(st, idx(6, home), enemy)) {
						push(idx(6, home), { castle: 'K' });
					}
					// rokade panjang
					if (st.cast[rights[1]] && !st.b[idx(3, home)] && !st.b[idx(2, home)] && !st.b[idx(1, home)] && st.b[idx(0, home)]?.toUpperCase() === 'R'
						&& !isAttacked(st, idx(3, home), enemy) && !isAttacked(st, idx(2, home), enemy)) {
						push(idx(2, home), { castle: 'Q' });
					}
				}
			}
		} else {
			const dirs = t === 'R' ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
				: t === 'B' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
				: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
			for (const [df, dr] of dirs) {
				let nf = f + df, nr = r + dr;
				while (onBoard(nf, nr)) {
					const to = idx(nf, nr);
					const target = st.b[to];
					if (!target) push(to);
					else { if (colorOf(target) !== color) push(to, { capture: true }); break; }
					nf += df; nr += dr;
				}
			}
		}
	}
	return moves;
}

function applyOnBoard(st, mv) {
	const b = [...st.b];
	const piece = b[mv.from];
	b[mv.from] = null;
	if (mv.ep) b[mv.to + (colorOf(piece) === 'w' ? -8 : 8)] = null;
	b[mv.to] = mv.promo ? (colorOf(piece) === 'w' ? mv.promo : mv.promo.toLowerCase()) : piece;
	if (mv.castle) {
		const home = colorOf(piece) === 'w' ? 0 : 7;
		if (mv.castle === 'K') { b[idx(5, home)] = b[idx(7, home)]; b[idx(7, home)] = null; }
		else { b[idx(3, home)] = b[idx(0, home)]; b[idx(0, home)] = null; }
	}
	return b;
}

export function legalMoves(st, color = st.turn) {
	return pseudoMoves(st, color).filter(mv => {
		const nb = applyOnBoard(st, mv);
		const test = { ...st, b: nb };
		return !isAttacked(test, kingSq(test, color), opp(color));
	});
}

export function moveSan(st, mv, legal) {
	let san;
	if (mv.castle) san = mv.castle === 'K' ? 'O-O' : 'O-O-O';
	else if (mv.piece === 'P') {
		san = mv.capture ? FILES[fileOf(mv.from)] + 'x' + sqName(mv.to) : sqName(mv.to);
		if (mv.promo) san += '=' + mv.promo;
	} else {
		const others = legal.filter(x => x.piece === mv.piece && x.to === mv.to && x.from !== mv.from);
		let dis = '';
		if (others.length) {
			const sameFile = others.some(x => fileOf(x.from) === fileOf(mv.from));
			const sameRank = others.some(x => rankOf(x.from) === rankOf(mv.from));
			if (!sameFile) dis = FILES[fileOf(mv.from)];
			else if (!sameRank) dis = String(rankOf(mv.from) + 1);
			else dis = sqName(mv.from);
		}
		san = mv.piece + dis + (mv.capture ? 'x' : '') + sqName(mv.to);
	}
	const after = applyMove(st, mv, { silent: true });
	if (inCheck(after, after.turn)) san += legalMoves(after).length === 0 ? '#' : '+';
	return san;
}

export function applyMove(st, mv, opts = {}) {
	const color = st.turn;
	const legal = legalMoves(st, color);
	const real = legal.find(x => x.from === mv.from && x.to === mv.to && (x.promo || null) === (mv.promo || null));
	if (!real) throw new Error('Langkah tidak sah');
	const san = opts.silent ? '' : moveSan(st, real, legal);
	const captured = real.ep ? st.b[real.to + (color === 'w' ? -8 : 8)] : st.b[real.to];
	const b = applyOnBoard(st, real);
	const cast = { ...st.cast };
	if (real.piece === 'K') { if (color === 'w') { cast.K = false; cast.Q = false; } else { cast.k = false; cast.q = false; } }
	const rookHome = { 0: 'Q', 7: 'K', 56: 'q', 63: 'k' };
	if (rookHome[real.from]) cast[rookHome[real.from]] = false;
	if (rookHome[real.to] && captured) cast[rookHome[real.to]] = false;
	const capW = [...st.capW], capB = [...st.capB];
	if (captured) (color === 'w' ? capW : capB).push(captured.toUpperCase());
	return {
		b,
		turn: opp(color),
		cast,
		ep: real.dbl ? (real.from + real.to) / 2 : -1,
		half: real.piece === 'P' || captured ? 0 : st.half + 1,
		full: color === 'b' ? st.full + 1 : st.full,
		hist: san ? [...st.hist, san] : st.hist,
		capW, capB,
		last: { from: real.from, to: real.to, san },
	};
}

export function gameStatus(st) {
	const legal = legalMoves(st);
	if (legal.length === 0) {
		if (inCheck(st, st.turn)) return { over: true, result: st.turn === 'w' ? '0-1' : '1-0', why: 'skakmat' };
		return { over: true, result: '1/2-1/2', why: 'stalemate (seri)' };
	}
	if (st.half >= 100) return { over: true, result: '1/2-1/2', why: 'aturan 50 langkah' };
	return { over: false, check: inCheck(st, st.turn) };
}

/** Cari langkah dari teks pemain: format koordinat (e2e4/e7e8q) atau SAN (e4, Nf3, exd5, O-O). */
export function findMove(st, input) {
	const raw = String(input || '').trim();
	if (!raw) return null;
	const legal = legalMoves(st);
	const coord = raw.toLowerCase().replace(/[^a-h1-8qrbn]/g, '');
	const cm = coord.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
	if (cm) {
		const from = parseSq(cm[1]), to = parseSq(cm[2]);
		const promo = cm[3] ? cm[3].toUpperCase() : null;
		return legal.find(x => x.from === from && x.to === to && (x.promo || null) === promo)
			|| legal.find(x => x.from === from && x.to === to && x.promo === 'Q')
			|| null;
	}
	const sanIn = raw.replace(/[+#]$/, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
	for (const mv of legal) {
		if (moveSan(st, mv, legal).replace(/[+#]$/, '') === sanIn) return mv;
	}
	return null;
}

/** AI: nilai tangkapan + promosi + skak + posisi tengah; pilih salah satu terbaik. */
export function aiChoose(st) {
	const legal = legalMoves(st);
	if (!legal.length) return null;
	const color = st.turn;
	const scored = legal.map(mv => {
		let s = Math.random() * 8;
		const target = mv.ep ? 'P' : st.b[mv.to]?.toUpperCase();
		if (target) s += VAL[target] * 10 - VAL[mv.piece] / 10;
		if (mv.promo) s += VAL[mv.promo];
		const tf = fileOf(mv.to), tr = rankOf(mv.to);
		if (tf >= 2 && tf <= 5 && tr >= 2 && tr <= 5) s += 12;
		if (mv.piece === 'P') s += color === 'w' ? tr * 2 : (7 - tr) * 2;
		const after = applyMove(st, mv, { silent: true });
		if (inCheck(after, after.turn)) s += 25;
		if (legalMoves(after).length === 0 && inCheck(after, after.turn)) s += 100000;
		return { mv, s };
	});
	scored.sort((a, b) => b.s - a.s);
	const top = scored.slice(0, 3);
	return top[Math.floor(Math.random() * top.length)].mv;
}

export function capturedGlyphs(list, color) {
	return list.map(t => GLYPH[color][t]).join(' ');
}

/** Papan teks (cadangan bila render gambar gagal). */
export function boardText(st) {
	const rows = [];
	for (let r = 7; r >= 0; r--) {
		let row = `${r + 1} `;
		for (let f = 0; f < 8; f++) {
			const p = st.b[idx(f, r)];
			row += (p ? GLYPH[colorOf(p)][p.toUpperCase()] : (f + r) % 2 ? '·' : '▪') + ' ';
		}
		rows.push(row.trimEnd());
	}
	rows.push('  a b c d e f g h');
	return rows.join('\n');
}

/** Render papan jadi PNG (Buffer) via ffmpeg. Lempar error bila gagal. */
export async function renderBoardPng(st) {
	const S = 720, SQ = 90;
	const filters = [`nullsrc=s=${S}x${S}`];
	for (let r = 0; r < 8; r++) {
		for (let f = 0; f < 8; f++) {
			const light = (f + r) % 2 === 1;
			filters.push(`drawbox=x=${f * SQ}:y=${(7 - r) * SQ}:w=${SQ}:h=${SQ}:color=${light ? '0xEED6B0' : '0xB58863'}:t=fill`);
		}
	}
	if (st.last) {
		for (const sq of [st.last.from, st.last.to]) {
			filters.push(`drawbox=x=${fileOf(sq) * SQ}:y=${(7 - rankOf(sq)) * SQ}:w=${SQ}:h=${SQ}:color=yellow@0.35:t=fill`);
		}
	}
	// koordinat kecil di tepi
	for (let f = 0; f < 8; f++) {
		filters.push(`drawtext=fontfile=${FONT}:text='${FILES[f]}':fontsize=20:fontcolor=0x5D3A1A:x=${f * SQ + SQ - 22}:y=${7 * SQ + SQ - 26}`);
	}
	for (let r = 0; r < 8; r++) {
		filters.push(`drawtext=fontfile=${FONT}:text='${r + 1}':fontsize=20:fontcolor=0x5D3A1A:x=6:y=${(7 - r) * SQ + 4}`);
	}
	for (let i = 0; i < 64; i++) {
		const p = st.b[i];
		if (!p) continue;
		const c = colorOf(p);
		const glyph = GLYPH[c][p.toUpperCase()];
		const x = fileOf(i) * SQ, y = (7 - rankOf(i)) * SQ;
		const style = c === 'w' ? 'fontcolor=white:borderw=4:bordercolor=black' : 'fontcolor=0x17120E:borderw=2:bordercolor=0x000000';
		filters.push(`drawtext=fontfile=${FONT}:text='${glyph}':fontsize=62:${style}:x=${x}+(${SQ}-tw)/2:y=${y}+(${SQ}-th)/2`);
	}
	const { stdout } = await execFileAsync(
		FFMPEG,
		['-y', '-v', 'error', '-f', 'lavfi', '-i', filters.join(','), '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'],
		{ maxBuffer: 16 * 1024 * 1024, encoding: 'buffer' }
	);
	if (!stdout?.length) throw new Error('render kosong');
	return stdout;
}
