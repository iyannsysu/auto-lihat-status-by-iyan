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
 * plugins/antispam.js — ANTI SPAM grup: chat, stiker, dan foto.
 *
 * Diatur per grup (owner / admin grup), tersimpan di antispam.json:
 *   .antispam on/off         spam chat   (>= 6 pesan / 10 detik)
 *   .antispamsticker on/off  spam stiker (>= 4 stiker / 10 detik)
 *   .antispamfoto on/off     spam foto   (>= 4 foto / 10 detik)
 *   .antispam cek            lihat status ketiganya di grup ini
 *
 * Sanksi bertahap: pelanggaran ke-1 = peringatan + pesan spam dihapus
 * (bila bot admin). Ke-2 dalam 10 menit = dikeluarkan dari grup
 * (bila bot admin). Owner & admin grup kebal. Default: semua OFF.
 */
import fs from 'fs';
import path from 'path';
import { jidNormalizedUser } from 'baileys';
import { readConfig, getMessageText } from '../helper/config.js';

const DATA_FILE = path.join(process.cwd(), 'antispam.json');
let settings = loadSettings();
function loadSettings() {
	try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8') || '{}'); } catch { return {}; }
}
function saveSettings() {
	try {
		const tmp = `${DATA_FILE}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
		fs.renameSync(tmp, DATA_FILE);
	} catch (err) { console.error('[auto-lihat-status] gagal simpan antispam.json:', err?.message || err); }
}
function groupCfg(chatJid) {
	if (!settings[chatJid]) settings[chatJid] = { chat: false, sticker: false, foto: false };
	return settings[chatJid];
}

const WINDOW_MS = 10_000;
const LIMITS = { chat: 6, sticker: 4, foto: 4 };
const STRIKE_TTL = 10 * 60 * 1000;
// chatJid|sender -> { chat: [ts...], sticker: [ts...], foto: [ts...], keys: {chat: [key...], ...} }
const hits = new Map();
// chatJid|sender -> { count, ts }
const strikes = new Map();

function prune(arr, now) {
	return arr.filter(ts => now - ts < WINDOW_MS);
}

export default {
	name: 'antispam',
	desc: 'Anti spam grup: .antispam / .antispamsticker / .antispamfoto on/off/cek.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		const chatJid = msg.key.remoteJid;
		if (!chatJid?.endsWith('@g.us')) return;
		const raw = getMessageText(msg) || '';
		const cfg = groupCfg(chatJid);

		// ---------- Command pengaturan (owner / admin grup) ----------
		const m = raw.match(/^[./!](antispam|antispamsticker|antispamstiker|antispamfoto)\b([\s\S]*)$/i);
		if (m) {
			const kind = m[1].toLowerCase().replace('antispam', '') || 'chat'; // '' -> chat
			const kindKey = kind === '' ? 'chat' : kind === 'stiker' ? 'sticker' : kind;
			const arg = (m[2] || '').trim().toLowerCase();
			const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });
			// Cek admin: owner selalu boleh; selain itu harus admin grup ini.
			let allowed = !!msg.key.fromMe;
			if (!allowed) {
				try {
					const meta = await sock.groupMetadata(chatJid);
					const sender = jidNormalizedUser(msg.key.participant || '');
					const p = (meta.participants || []).find(x => jidNormalizedUser(x.phoneNumber || x.id) === sender || jidNormalizedUser(x.id) === sender);
					allowed = !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
				} catch { /* tidak boleh */ }
			}
			if (!allowed) return reply('⚠️ Hanya owner / admin grup yang bisa mengatur anti spam.');
			if (arg === 'cek' || arg === 'status' || arg === '') {
				if (arg === '') return reply(`Pakai: \`.${m[1].toLowerCase()} on\` / \`off\` / \`cek\``);
				return reply(`🛡️ *ANTI SPAM — grup ini*\n\n💬 Spam chat : ${cfg.chat ? 'ON ✅' : 'OFF ❌'} (≥${LIMITS.chat} pesan/10 dtk)\n🌟 Spam stiker : ${cfg.sticker ? 'ON ✅' : 'OFF ❌'} (≥${LIMITS.sticker} stiker/10 dtk)\n🖼️ Spam foto : ${cfg.foto ? 'ON ✅' : 'OFF ❌'} (≥${LIMITS.foto} foto/10 dtk)`);
			}
			if (arg !== 'on' && arg !== 'off') return reply(`Pakai: \`.${m[1].toLowerCase()} on\` / \`off\` / \`cek\``);
			cfg[kindKey] = arg === 'on';
			saveSettings();
			const label = kindKey === 'chat' ? 'spam chat' : kindKey === 'sticker' ? 'spam stiker' : 'spam foto';
			return reply(`🛡️ Anti ${label} di grup ini sekarang: *${arg.toUpperCase()}*`);
		}

		// ---------- Deteksi spam ----------
		if (msg.key.fromMe) return;
		if (!cfg.chat && !cfg.sticker && !cfg.foto) return;
		const senderRaw = msg.key.participant || '';
		if (!senderRaw) return;
		const sender = jidNormalizedUser(senderRaw);
		const message = msg.message || {};
		const kind = message.stickerMessage ? 'sticker' : message.imageMessage ? 'foto' : 'chat';
		if (!cfg[kind]) return;

		// Admin grup kebal.
		try {
			const meta = await sock.groupMetadata(chatJid);
			const p = (meta.participants || []).find(x => jidNormalizedUser(x.id) === sender || jidNormalizedUser(x.phoneNumber || '') === sender);
			if (p && (p.admin === 'admin' || p.admin === 'superadmin')) return;
		} catch { /* lanjut */ }

		const now = Date.now();
		if (hits.size > 500) {
			for (const [k, v] of hits) {
				if (prune([...v.chat, ...v.sticker, ...v.foto], now).length === 0) hits.delete(k);
			}
		}
		const hkey = `${chatJid}|${sender}`;
		if (!hits.has(hkey)) hits.set(hkey, { chat: [], sticker: [], foto: [], keys: { chat: [], sticker: [], foto: [] } });
		const h = hits.get(hkey);
		h[kind] = prune(h[kind], now);
		h.keys[kind] = h.keys[kind].slice(-LIMITS[kind]);
		h[kind].push(now);
		h.keys[kind].push(msg.key);
		if (h[kind].length < LIMITS[kind]) return;

		// Ambang terlampaui — reset hitungan, catat pelanggaran.
		const spamKeys = [...h.keys[kind]];
		h[kind] = [];
		h.keys[kind] = [];
		const skey = hkey;
		const prev = strikes.get(skey);
		const strike = prev && now - prev.ts < STRIKE_TTL ? prev.count + 1 : 1;
		strikes.set(skey, { count: strike, ts: now });

		// Hapus pesan-pesan spamnya (best effort, perlu bot admin).
		for (const key of spamKeys) {
			try { await sock.sendMessage(chatJid, { delete: key }); } catch { /* bukan admin / gagal */ }
		}
		const label = kind === 'chat' ? 'chat' : kind === 'sticker' ? 'stiker' : 'foto';
		if (strike >= 2) {
			try {
				await sock.groupParticipantsUpdate(chatJid, [sender], 'remove');
				return sock.sendMessage(chatJid, { text: `🚫 @${sender.split('@')[0]} dikeluarkan dari grup — spam ${label} berulang (pelanggaran ke-${strike}).`, mentions: [sender] });
			} catch {
				return sock.sendMessage(chatJid, { text: `⚠️ @${sender.split('@')[0]} spam ${label} lagi (pelanggaran ke-${strike}) — bot bukan admin, jadi belum bisa mengeluarkan. Jadikan bot admin ya.`, mentions: [sender] });
			}
		}
		return sock.sendMessage(chatJid, { text: `⚠️ @${sender.split('@')[0]} terdeteksi *spam ${label}* — pesan-pesannya sudah dihapus.\nSekali lagi dalam 10 menit = dikeluarkan dari grup.`, mentions: [sender] });
	},
};
