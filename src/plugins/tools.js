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
 * plugins/tools.js — TOOLS teks & hitung (semua lokal, tanpa internet).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .b64 / .base64 <teks> | .b64 decode <teks>     base64 encode/decode
 *   .b32 / .base32 <teks> | .b32 decode <teks>     base32 encode/decode
 *   .hex <teks> | .hex decode <teks>               hex encode/decode
 *   .binary <teks> | .binary decode <...>          biner encode/decode
 *   .octal <teks> | .octal decode <...>            oktal encode/decode
 *   .ascii85 <teks> | .ascii85 decode <teks>       ascii85 encode/decode
 *   .morse <teks>                                  otomatis encode/decode
 *   .rot13 <teks>                                  rot13 (encode=decode)
 *   .atbash <teks>                                 atbash (encode=decode)
 *   .reverse <teks>                                balik teks
 *   .upper <teks> / .lower <teks>                  huruf besar / kecil
 *   .calculator <ekspresi> (alias .hitung)         kalkulator aman (tanpa eval)
 *   .roman <angka|romawi>                          konversi angka romawi 2 arah
 *   .lorem [jumlah kata]                           teks lorem ipsum
 *   .readmore <teks1>|<teks2>                      sisipkan readmore WA
 *
 * Teks bisa dari argumen, atau dari pesan yang di-reply (quote).
 */

// ---------- base32 (RFC 4648) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(buf) {
	let bits = 0, val = 0, out = '';
	for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
	if (bits > 0) out += B32[(val << (5 - bits)) & 31];
	while (out.length % 8) out += '=';
	return out;
}
function b32decode(str) {
	const clean = str.toUpperCase().replace(/=+$/, '');
	let bits = 0, val = 0; const out = [];
	for (const ch of clean) { const idx = B32.indexOf(ch); if (idx < 0) continue; val = (val << 5) | idx; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
	return Buffer.from(out);
}

// ---------- ascii85 ----------
function a85encode(buf) {
	let out = '';
	for (let i = 0; i < buf.length; i += 4) {
		const chunk = buf.subarray(i, i + 4);
		let n = 0; for (let j = 0; j < 4; j++) n = n * 256 + (chunk[j] || 0);
		if (chunk.length === 4 && n === 0) { out += 'z'; continue; }
		let enc = ''; let x = n;
		for (let j = 0; j < 5; j++) { enc = String.fromCharCode(33 + (x % 85)) + enc; x = Math.floor(x / 85); }
		out += enc.slice(0, chunk.length + 1);
	}
	return out;
}
function a85decode(str) {
	const out = [];
	let group = [];
	const flush = (g, count) => { let n = 0; for (let j = 0; j < 5; j++) n = n * 85 + (g[j] ?? 84); const bytes = [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256]; for (let j = 0; j < count; j++) out.push(bytes[j]); };
	for (const ch of str.replace(/\s/g, '')) {
		if (ch === 'z' && group.length === 0) { out.push(0, 0, 0, 0); continue; }
		group.push(ch.charCodeAt(0) - 33);
		if (group.length === 5) { flush(group, 4); group = []; }
	}
	if (group.length) flush(group, group.length - 1);
	return Buffer.from(out);
}

// ---------- morse ----------
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', ' ': '/' };
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

// ---------- kalkulator aman (recursive descent, tanpa eval) ----------
function calc(expr) {
	const tokens = expr.replace(/\s+/g, '').match(/(\d+\.?\d*|\.\d+|[+\-*/%^()])/g);
	if (!tokens || tokens.join('') !== expr.replace(/\s+/g, '')) throw new Error('ekspresi tidak valid');
	let pos = 0;
	const peek = () => tokens[pos];
	const next = () => tokens[pos++];
	function parseExpr() { let v = parseTerm(); while (peek() === '+' || peek() === '-') { const op = next(); const r = parseTerm(); v = op === '+' ? v + r : v - r; } return v; }
	function parseTerm() { let v = parseFactor(); while (peek() === '*' || peek() === '/' || peek() === '%') { const op = next(); const r = parseFactor(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; } return v; }
	function parseFactor() { let v = parseUnary(); while (peek() === '^') { next(); v = Math.pow(v, parseUnary()); } return v; }
	function parseUnary() { if (peek() === '-') { next(); return -parsePrimary(); } if (peek() === '+') { next(); return parsePrimary(); } return parsePrimary(); }
	function parsePrimary() { const t = next(); if (t === '(') { const v = parseExpr(); if (next() !== ')') throw new Error('kurung tidak ditutup'); return v; } const n = Number(t); if (Number.isNaN(n)) throw new Error('bukan angka: ' + t); return n; }
	const result = parseExpr();
	if (pos !== tokens.length) throw new Error('sisa ekspresi tidak terbaca');
	if (!Number.isFinite(result)) throw new Error('hasil tidak hingga (bagi 0?)');
	return Math.round(result * 1e12) / 1e12;
}

// ---------- romawi ----------
function toRoman(num) {
	if (num < 1 || num > 3999) throw new Error('angka harus 1-3999');
	const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
	let out = ''; let n = num;
	for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
	return out;
}
function fromRoman(str) {
	const vals = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
	const s = str.toUpperCase(); let total = 0;
	for (let i = 0; i < s.length; i++) { const cur = vals[s[i]]; if (!cur) throw new Error('huruf romawi tidak valid'); const nxt = vals[s[i + 1]] || 0; total += cur < nxt ? -cur : cur; }
	return total;
}

function quotedText(msg) {
	const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
	if (!q) return '';
	return (q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '').trim();
}

const CODECS = {
	b64: { enc: t => Buffer.from(t, 'utf-8').toString('base64'), dec: t => Buffer.from(t, 'base64').toString('utf-8') },
	base64: null, // alias diisi di bawah
	b32: { enc: t => b32encode(Buffer.from(t, 'utf-8')), dec: t => b32decode(t).toString('utf-8') },
	base32: null,
	hex: { enc: t => Buffer.from(t, 'utf-8').toString('hex'), dec: t => Buffer.from(t.replace(/\s/g, ''), 'hex').toString('utf-8') },
	binary: { enc: t => [...Buffer.from(t, 'utf-8')].map(b => b.toString(2).padStart(8, '0')).join(' '), dec: t => Buffer.from(t.trim().split(/\s+/).map(s => parseInt(s, 2))).toString('utf-8') },
	octal: { enc: t => [...Buffer.from(t, 'utf-8')].map(b => b.toString(8).padStart(3, '0')).join(' '), dec: t => Buffer.from(t.trim().split(/\s+/).map(s => parseInt(s, 8))).toString('utf-8') },
	ascii85: { enc: t => a85encode(Buffer.from(t, 'utf-8')), dec: t => a85decode(t).toString('utf-8') },
};
CODECS.base64 = CODECS.b64; CODECS.base32 = CODECS.b32;

import { readConfig, getMessageText } from '../helper/config.js';

export default {
	name: 'tools',
	desc: 'Tools teks & hitung lokal: encode/decode, morse, kalkulator, romawi, lorem, readmore.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe && readConfig().mode !== 'public') return;
		const raw = getMessageText(msg);
		if (!raw) return;
		const m = raw.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		let args = (m[2] || '').trim();
		const chatJid = msg.key.remoteJid;
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });
		const input = () => args || quotedText(msg);

		try {
			if (CODECS[cmd]) {
				let mode = 'enc';
				if (/^decode\s+/i.test(args)) { mode = 'dec'; args = args.replace(/^decode\s+/i, ''); }
				const teks = input();
				if (!teks) return reply(`Pakai: \`.${cmd} <teks>\` atau \`.${cmd} decode <teks>\` (atau reply sebuah pesan)`);
				const hasil = mode === 'enc' ? CODECS[cmd].enc(teks) : CODECS[cmd].dec(teks);
				return reply(`*${cmd.toUpperCase()} ${mode === 'enc' ? 'ENCODE' : 'DECODE'}*\n\n${hasil}`);
			}
			if (cmd === 'morse') {
				const teks = input(); if (!teks) return reply('Pakai: `.morse <teks>` (otomatis encode / decode)');
				if (/^[.\-/ ]+$/.test(teks)) return reply('*MORSE DECODE*\n\n' + teks.split(' ').map(s => MORSE_REV[s] || '?').join(''));
				return reply('*MORSE ENCODE*\n\n' + [...teks.toUpperCase()].map(c => MORSE[c] || c).join(' '));
			}
			if (cmd === 'rot13') { const teks = input(); if (!teks) return reply('Pakai: `.rot13 <teks>`'); return reply('*ROT13*\n\n' + teks.replace(/[a-zA-Z]/g, c => String.fromCharCode((c.toLowerCase() < 'n' ? c.charCodeAt(0) + 13 : c.charCodeAt(0) - 13)))); }
			if (cmd === 'atbash') { const teks = input(); if (!teks) return reply('Pakai: `.atbash <teks>`'); return reply('*ATBASH*\n\n' + teks.replace(/[a-zA-Z]/g, c => { const base = c <= 'Z' ? 65 : 97; return String.fromCharCode(base + (25 - (c.charCodeAt(0) - base))); })); }
			if (cmd === 'reverse') { const teks = input(); if (!teks) return reply('Pakai: `.reverse <teks>`'); return reply('*REVERSE*\n\n' + [...teks].reverse().join('')); }
			if (cmd === 'upper') { const teks = input(); if (!teks) return reply('Pakai: `.upper <teks>`'); return reply(teks.toUpperCase()); }
			if (cmd === 'lower') { const teks = input(); if (!teks) return reply('Pakai: `.lower <teks>`'); return reply(teks.toLowerCase()); }
			if (cmd === 'calculator' || cmd === 'hitung' || cmd === 'kalkulator') {
				if (!args) return reply('Pakai: `.calculator 12 * (3 + 4)`');
				return reply(`🧮 *${args}* = *${calc(args)}*`);
			}
			if (cmd === 'roman' || cmd === 'romawi') {
				if (!args) return reply('Pakai: `.roman 2026` atau `.roman MMXXVI`');
				if (/^\d+$/.test(args)) return reply(`🏛️ ${args} = *${toRoman(Number(args))}*`);
				return reply(`🏛️ ${args.toUpperCase()} = *${fromRoman(args)}*`);
			}
			if (cmd === 'lorem') {
				const n = Math.min(Math.max(parseInt(args) || 30, 1), 500);
				const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat'.split(' ');
				const out = []; for (let i = 0; i < n; i++) out.push(words[Math.floor(Math.random() * words.length)]);
				out[0] = out[0][0].toUpperCase() + out[0].slice(1);
				return reply(out.join(' ') + '.');
			}
			if (cmd === 'readmore') {
				const [a, b] = (args || '').split('|').map(s => s.trim());
				if (!a) return reply('Pakai: `.readmore teks depan|teks belakang`');
				return reply(a + '‎'.repeat(4000) + (b || ''));
			}
		} catch (err) {
			return reply(`❌ Gagal: ${err?.message || err}`);
		}
	},
};
