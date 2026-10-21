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
 * plugins/game.js — GAME (semua lokal, sesi per chat).
 *
 * Command (mode public: semua orang di chat itu; mode self: hanya owner):
 *   .math [easy|medium|hard]  soal hitung cepat, jawab dengan angkanya
 *   .tebakkata                 tebak kata dari petunjuknya
 *   .susunkata                 susun huruf acak jadi kata
 *   .tebakangka                tebak angka 1-100 (ada petunjuk naik/turun)
 *   .asahotak                  teka-teki asah otak
 *   .caklontong                teka-teki lucu Cak Lontong
 *   .tictactoe @lawan          main XO berdua (giliran ketik angka 1-9)
 *   .stopgame / .nyerah        akhiri game yang jalan di chat ini
 *
 * Satu game per jenis per chat. Sesi kedaluwarsa 3 menit. Jawaban cukup
 * diketik biasa di chat yang sama.
 */
import { jidNormalizedUser } from 'baileys';
import { readConfig, getMessageText } from '../helper/config.js';

const SESSION_TTL = 3 * 60 * 1000;
const sessions = new Map(); // `${chat}|${type}` -> state

export const BANKS = {
	tebakkata: [
		{ clue: 'Hewan berkaki delapan yang membuat jaring', answer: 'laba-laba' },
		{ clue: 'Alat untuk melihat benda yang sangat kecil', answer: 'mikroskop' },
		{ clue: 'Planet terdekat dari matahari', answer: 'merkurius' },
		{ clue: 'Ibu kota provinsi Jawa Barat', answer: 'bandung' },
		{ clue: 'Buah berwarna kuning, monyet sangat menyukainya', answer: 'pisang' },
		{ clue: 'Kendaraan yang berjalan di atas rel', answer: 'kereta' },
		{ clue: 'Benda di langit yang muncul setelah hujan dan berwarna-warni', answer: 'pelangi' },
		{ clue: 'Alat musik yang dimainkan dengan cara dipetik, punya 6 senar', answer: 'gitar' },
		{ clue: 'Hewan tercepat di darat', answer: 'cheetah' },
		{ clue: 'Negara dengan penduduk terbanyak di Asia Tenggara', answer: 'indonesia' },
	],
	susunkata: ['komputer', 'sekolah', 'sepeda', 'jendela', 'matahari', 'kupu-kupu', 'restoran', 'handphone', 'perpustakaan', 'pesawat', 'cokelat', 'pelangi'],
	asahotak: [
		{ q: 'Aku punya kota tapi tak punya rumah, punya hutan tapi tak punya pohon, punya sungai tapi tak punya air. Siapakah aku?', a: 'peta' },
		{ q: 'Semakin banyak diambil, semakin besar aku. Siapakah aku?', a: 'lubang' },
		{ q: 'Apa yang selalu datang tapi tidak pernah tiba?', a: 'besok' },
		{ q: 'Aku ringan seperti bulu, tapi orang terkuat pun tidak bisa menahanku lama. Siapakah aku?', a: 'napas' },
		{ q: 'Apa yang punya leher tapi tidak punya kepala?', a: 'botol' },
		{ q: 'Semakin kering, semakin basah aku. Siapakah aku?', a: 'handuk' },
		{ q: 'Apa yang bisa berlari tapi tidak pernah berjalan, punya mulut tapi tidak bicara?', a: 'sungai' },
		{ q: 'Aku dimiliki semua orang, tapi orang lain lebih sering memakai namaku daripada aku sendiri. Apa itu?', a: 'nama' },
	],
	caklontong: [
		{ q: 'Kenapa ayam kalau berkokok matanya merem?', a: 'karena sudah hafal teksnya' },
		{ q: 'Kenapa orang botak selalu bahagia?', a: 'karena tidak pernah pusing memikirkan rambut' },
		{ q: 'Hewan apa yang paling tidak sopan?', a: 'kutu', hint: 'suka naik ke kepala' },
		{ q: 'Apa bedanya matahari dengan bulan?', a: 'matahari terbit pagi bulan terbit malam' },
		{ q: 'Kenapa ikan tidak bisa main internet?', a: 'karena takut kena jaring' },
	],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function scramble(word) {
	const chars = [...word.replace(/-/g, '')];
	for (let i = chars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [chars[i], chars[j]] = [chars[j], chars[i]]; }
	return chars.join(' ').toUpperCase();
}
function normalize(s) { return String(s || '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' '); }
function senderJid(sock, msg) {
	if (msg.key.fromMe) return jidNormalizedUser(sock.user?.id || '');
	const raw = msg.key.participant || msg.participant || msg.key.remoteJid || '';
	return raw ? jidNormalizedUser(raw) : '';
}
function getSession(chat, type) {
	const s = sessions.get(`${chat}|${type}`);
	if (s && Date.now() - s.startedAt > SESSION_TTL) { sessions.delete(`${chat}|${type}`); return null; }
	return s || null;
}
function setSession(chat, type, state) { sessions.set(`${chat}|${type}`, { ...state, startedAt: Date.now() }); }
function clearSession(chat, type) { sessions.delete(`${chat}|${type}`); }

function genMath(level) {
	const ranges = { easy: [1, 20], medium: [10, 99], hard: [50, 300] };
	const [lo, hi] = ranges[level] || ranges.easy;
	const ops = ['+', '-', '×'];
	const op = pick(ops);
	let a = lo + Math.floor(Math.random() * (hi - lo));
	let b = lo + Math.floor(Math.random() * (hi - lo));
	if (op === '-' && b > a) [a, b] = [b, a];
	const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
	return { text: `${a} ${op} ${b}`, answer };
}

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function tttWinner(board) {
	for (const [a, b, c] of WIN_LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
	if (board.every(Boolean)) return 'draw';
	return null;
}
function tttBoard(board) {
	const cell = v => (v === 'X' ? '❌' : v === 'O' ? '⭕' : '⬜');
	return [0, 1, 2].map(r => [0, 1, 2].map(c => cell(board[r * 3 + c])).join(' ')).join('\n');
}

const STARTERS = ['math', 'tebakkata', 'susunkata', 'tebakangka', 'asahotak', 'caklontong', 'tictactoe'];
const ANSWER_GAMES = ['math', 'tebakkata', 'susunkata', 'tebakangka', 'asahotak', 'caklontong'];

export default {
	name: 'game',
	desc: 'Game: math, tebakkata, susunkata, tebakangka, asahotak, caklontong, tictactoe.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		const cfg = readConfig();
		if (!msg.key.fromMe && cfg.mode !== 'public') return;
		const chatJid = msg.key?.remoteJid || '';
		if (chatJid === 'status@broadcast') return;
		const text = getMessageText(msg);
		if (!text || msg.message?.reactionMessage) return;
		const sender = senderJid(sock, msg);
		const name = msg.pushName || sender.split('@')[0];
		const reply = async t => sock.sendMessage(chatJid, { text: t }, { quoted: msg });

		const m = text.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		const cmd = m ? m[1].toLowerCase() : '';
		const args = m ? (m[2] || '').trim() : '';

		// ---- Akhiri game ----
		if (cmd === 'stopgame' || cmd === 'nyerah') {
			let found = false;
			for (const t of [...STARTERS]) if (getSession(chatJid, t)) { clearSession(chatJid, t); found = true; }
			return reply(found ? '🛑 Game di chat ini sudah diakhiri.' : 'Tidak ada game yang sedang jalan di chat ini.');
		}

		// ---- Mulai game ----
		if (STARTERS.includes(cmd)) {
			if (getSession(chatJid, cmd)) return reply(`⚠️ Game *${cmd}* lagi jalan di chat ini. Jawab dulu, atau ketik \`.stopgame\` buat akhiri.`);
			if (cmd === 'math') {
				const level = ['easy', 'medium', 'hard'].includes(args.toLowerCase()) ? args.toLowerCase() : 'easy';
				const soal = genMath(level);
				setSession(chatJid, 'math', { answer: soal.answer, by: sender });
				return reply(`🧮 *GAME MATH* (${level})\n\nBerapakah: *${soal.text} = ?*\n\nKetik jawabannya langsung di chat ini. ⏱️ 3 menit!`);
			}
			if (cmd === 'tebakkata') {
				const item = pick(BANKS.tebakkata);
				setSession(chatJid, 'tebakkata', { answer: item.answer, by: sender });
				return reply(`🔤 *TEBAK KATA*\n\nPetunjuk: _${item.clue}_\n\nKetik kata jawabannya di chat ini. ⏱️ 3 menit!`);
			}
			if (cmd === 'susunkata') {
				const word = pick(BANKS.susunkata);
				setSession(chatJid, 'susunkata', { answer: word.replace(/-/g, ''), by: sender });
				return reply(`🔀 *SUSUN KATA*\n\nSusun huruf ini jadi kata yang benar:\n\n*${scramble(word)}*\n\nKetik jawabannya di chat ini. ⏱️ 3 menit!`);
			}
			if (cmd === 'tebakangka') {
				const target = 1 + Math.floor(Math.random() * 100);
				setSession(chatJid, 'tebakangka', { answer: target, tries: 0, by: sender });
				return reply(`🔢 *TEBAK ANGKA*\n\nAku simpan angka *1 - 100*. Tebak dengan mengetik angkanya — nanti aku kasih petunjuk naik/turun. ⏱️ 3 menit!`);
			}
			if (cmd === 'asahotak' || cmd === 'caklontong') {
				const item = pick(BANKS[cmd]);
				setSession(chatJid, cmd, { answer: item.a, by: sender });
				return reply(`${cmd === 'asahotak' ? '🧠 *ASAH OTAK*' : '🤣 *CAK LONTONG*'}\n\n${item.q}\n\nKetik jawabanmu di chat ini. ⏱️ 3 menit!`);
			}
			if (cmd === 'tictactoe') {
				const c = msg.message?.extendedTextMessage?.contextInfo;
				const foe = c?.mentionedJid?.[0] ? jidNormalizedUser(c.mentionedJid[0]) : c?.participant ? jidNormalizedUser(c.participant) : '';
				if (!foe) return reply('Pakai: tag lawanmu — `.tictactoe @teman` (atau reply pesannya)');
				if (foe === sender) return reply('Masa main lawan diri sendiri 😅 tag temanmu ya.');
				setSession(chatJid, 'tictactoe', { board: Array(9).fill(''), players: { X: sender, O: foe }, turn: 'X', by: sender });
				return sock.sendMessage(chatJid, {
					text: `🎮 *TIC TAC TOE*\n\n❌ @${sender.split('@')[0]} vs ⭕ @${foe.split('@')[0]}\n\n${tttBoard(Array(9).fill(''))}\n\nGiliran ❌: ketik angka *1-9* (posisi dari kiri-atas).`,
					mentions: [sender, foe],
				});
			}
		}

		// ---- Giliran tictactoe ----
		const ttt = getSession(chatJid, 'tictactoe');
		if (ttt && /^[1-9]$/.test(text.trim())) {
			const turnJid = ttt.players[ttt.turn];
			if (sender !== turnJid) return; // bukan giliranmu — diam
			const idx = Number(text.trim()) - 1;
			if (ttt.board[idx]) return reply('⚠️ Kotak itu sudah terisi, pilih angka lain.');
			ttt.board[idx] = ttt.turn;
			const win = tttWinner(ttt.board);
			if (win) {
				clearSession(chatJid, 'tictactoe');
				if (win === 'draw') return reply(`🎮 *TIC TAC TOE*\n\n${tttBoard(ttt.board)}\n\n🤝 *SERI!* Tidak ada pemenang.`);
				const winnerJid = ttt.players[win];
				return sock.sendMessage(chatJid, { text: `🎮 *TIC TAC TOE*\n\n${tttBoard(ttt.board)}\n\n🏆 @${winnerJid.split('@')[0]} MENANG! (${win === 'X' ? '❌' : '⭕'})`, mentions: [winnerJid] });
			}
			ttt.turn = ttt.turn === 'X' ? 'O' : 'X';
			ttt.startedAt = Date.now();
			const nextJid = ttt.players[ttt.turn];
			return sock.sendMessage(chatJid, { text: `${tttBoard(ttt.board)}\n\nGiliran ${ttt.turn === 'X' ? '❌' : '⭕'} @${nextJid.split('@')[0]} — ketik angka 1-9.`, mentions: [nextJid] });
		}

		// ---- Jawaban game teks/angka ----
		for (const type of ANSWER_GAMES) {
			const s = getSession(chatJid, type);
			if (!s) continue;
			if (type === 'math' || type === 'tebakangka') {
				if (!/^-?\d+$/.test(text.trim())) continue;
				const guess = Number(text.trim());
				if (guess === s.answer) {
					clearSession(chatJid, type);
					return sock.sendMessage(chatJid, { text: `🎉 *BENAR!* @${sender.split('@')[0]} menjawab *${s.answer}* dengan tepat. Selamat, ${name}! 🏆`, mentions: [sender] });
				}
				if (type === 'tebakangka') {
					s.tries = (s.tries || 0) + 1;
					s.startedAt = Date.now();
					return reply(guess < s.answer ? `🔼 Lebih besar dari *${guess}* — coba naik!` : `🔽 Lebih kecil dari *${guess}* — turunin!`);
				}
				return; // math salah: diam saja biar tidak spam
			}
			// game kata
			if (normalize(text) === normalize(s.answer)) {
				clearSession(chatJid, type);
				return reply(`🎉 *BENAR!* Jawabannya *${s.answer}* — selamat, ${name}! 🏆`);
			}
		}
	},
};
