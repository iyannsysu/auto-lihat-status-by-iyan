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
 * helper/config.js — baca + tulis config dari disk.
 * Dipakai semua plugin. Dibaca tiap dipakai, jadi bisa on/off tanpa restart.
 *
 * config.json:
 * {
 *   "autoread": true,            // auto-lihat status
 *   "swgrup": true,              // SW grup (status yang diposting ke grup) ikut diproses
 *   "autoreact": true,           // auto-react status
 *   "react_mode": "emoji",       // "emoji" | "teks"
 *   "emoji_pool": ["❤️","😍","🔥","👍","😮","🥰","💯","👏","😎","🎉"],
 *   "react_random": true,        // true = emoji acak, false = urut
 *   "react_text": ""             // kalau diisi -> mode teks. Pisah pakai | untuk banyak teks.
 * }
 */
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'config.json');

const DEFAULTS = {
	autoread: true,
	swgrup: true,
	autoreact: true,
	react_mode: 'emoji',
	emoji_pool: ['❤️', '😍', '🔥', '👍', '😮', '🥰', '💯', '👏', '😎', '🎉'],
	react_random: true,
	react_text: '',
};

export function readConfig() {
	try {
		const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8') || '{}');
		return normalize({ ...DEFAULTS, ...cfg });
	} catch {
		return { ...DEFAULTS };
	}
}

export function writeConfig(patch) {
	const next = normalize({ ...readConfig(), ...patch });
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2) + '\n');
	return next;
}

function normalize(cfg) {
	if (typeof cfg.autoread !== 'boolean') cfg.autoread = true;
	if (typeof cfg.swgrup !== 'boolean') cfg.swgrup = true;
	if (typeof cfg.autoreact !== 'boolean') cfg.autoreact = true;
	if (cfg.react_mode !== 'teks' && cfg.react_mode !== 'emoji') cfg.react_mode = 'emoji';
	if (!Array.isArray(cfg.emoji_pool) || !cfg.emoji_pool.length) cfg.emoji_pool = [...DEFAULTS.emoji_pool];
	if (typeof cfg.react_random !== 'boolean') cfg.react_random = true;
	if (typeof cfg.react_text !== 'string') cfg.react_text = '';
	// Kalau react_text diisi, otomatis mode teks (biar .react teks langsung jalan).
	if (cfg.react_text.trim()) cfg.react_mode = 'teks';
	return cfg;
}

/**
 * Ambil semua emoji dari teks. Contoh: "❤️ 🔥 halo" -> ["❤️","🔥"]
 * Pakai Intl.Segmenter (grapheme) biar ❤️ tidak kepotong jadi ❤
 * (regex \p{Extended_Pictographic} doang menghilangkan VS16 U+FE0F).
 */
export function extractEmojis(text) {
	const src = text || '';
	try {
		const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
		const out = [];
		for (const { segment } of seg.segment(src)) {
			if (/\p{Extended_Pictographic}/u.test(segment) && !out.includes(segment)) out.push(segment);
		}
		return out;
	} catch {
		const found = src.match(/\p{Extended_Pictographic}/gu) || [];
		return [...new Set(found)];
	}
}

/**
 * SW grup: status yang diposting ke grup datang dari JID grup (@g.us),
 * BUKAN status@broadcast, dan isinya dibungkus groupStatusMessage /
 * groupStatusMessageV2. Fungsi ini mengembalikan pesan di dalam bungkusnya
 * (atau null kalau bukan SW grup) — pola sama seperti readsw
 * (helper/inject.js: isGroupStatus dideteksi dari pesan mentah).
 */
export function getGroupStatusInner(msg) {
	const m = msg?.message || {};
	const wrapped = m.groupStatusMessageV2 || m.groupStatusMessage;
	return wrapped?.message || null;
}

/** True kalau pesan ini adalah status yang diposting ke grup (SW grup). */
export function isGroupStatus(msg) {
	return String(msg?.key?.remoteJid || '').endsWith('@g.us') && !!getGroupStatusInner(msg);
}

/** Ambil teks pesan (chat / caption / command). */
export function getMessageText(msg) {
	const m = msg.message || {};
	return (
		m.conversation ||
		m.extendedTextMessage?.text ||
		m.imageMessage?.caption ||
		m.videoMessage?.caption ||
		m.documentMessage?.caption ||
		''
	).trim();
}

/**
 * Normalisasi JID: buang :device, tapi PERTAHANKAN server (@lid / @s.whatsapp.net).
 * JANGAN paksa jadi @s.whatsapp.net — status dari akun LID harus tetap @lid,
 * kalau dipaksa pindah server, react terkirim tanpa error tapi TIDAK MUNCUL.
 * Sama seperti jidNormalizedUser bawaan Baileys.
 */
export function normalizeJid(jid = '') {
	const [userPart, serverPart] = String(jid).split('@');
	const user = (userPart || '').split(':')[0];
	const server = serverPart || 's.whatsapp.net';
	return user ? `${user}@${server}` : jid;
}
