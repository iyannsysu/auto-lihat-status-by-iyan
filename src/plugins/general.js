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
 * plugins/general.js — GENERAL (info bot & utilitas dasar).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .ping          cek respons bot
 *   .runtime       sudah berapa lama bot menyala (alias .uptime)
 *   .owner         info pembuat bot
 *   .about         tentang bot ini
 *   .sc / .script  link script bot ini (GitHub)
 */
import { readConfig, getMessageText } from '../helper/config.js';

function formatUptime(ms) {
	const d = Math.floor(ms / 86400000);
	const h = Math.floor((ms % 86400000) / 3600000);
	const mnt = Math.floor((ms % 3600000) / 60000);
	const dtk = Math.floor((ms % 60000) / 1000);
	const parts = [];
	if (d) parts.push(`${d} hari`);
	if (h) parts.push(`${h} jam`);
	if (mnt) parts.push(`${mnt} menit`);
	parts.push(`${dtk} detik`);
	return parts.join(' ');
}

export default {
	name: 'general',
	desc: 'General: ping, runtime, owner, about, sc.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe && readConfig().mode !== 'public') return;
		const raw = getMessageText(msg);
		if (!raw) return;
		const m = raw.match(/^[./!]([a-z0-9]+)\b/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		const chatJid = msg.key.remoteJid;
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });

		if (cmd === 'ping') {
			return reply(`🏓 *Pong!*\nBot aktif dan merespons.`);
		}
		if (cmd === 'runtime' || cmd === 'uptime') {
			return reply(`⏱️ *Runtime bot*\nSudah menyala: *${formatUptime(process.uptime() * 1000)}*`);
		}
		if (cmd === 'owner') {
			// Kartu kontak beneran (vCard) — nomor owner bisa langsung disimpan / dichat.
			const OWNER_NUM = '6282161429908';
			const vcard =
				'BEGIN:VCARD\n' +
				'VERSION:3.0\n' +
				'FN:Iyan — Owner Bot\n' +
				`TEL;type=CELL;type=VOICE;waid=${OWNER_NUM}:+62 821-6142-9908\n` +
				'END:VCARD';
			await sock.sendMessage(chatJid, { contacts: { displayName: 'Iyan — Owner Bot', contacts: [{ vcard }] } }, { quoted: msg });
			return reply(
				`👑 *OWNER BOT*\n\n` +
					`Nama : Iyan\n` +
					`WhatsApp : +${OWNER_NUM}\n` +
					`Chat langsung : https://wa.me/${OWNER_NUM}\n\n` +
					`Ada yang memperjualbelikan script ini? Laporkan ke nomor di atas.`
			);
		}
		if (cmd === 'about') {
			const cfg = readConfig();
			return reply(
				`👁️ *AUTO LIHAT STATUS BY IYAN*\n\n` +
					`Bot WhatsApp super-ringan yang dibangun dari nol dengan Baileys + struktur plugin.\n\n` +
					`Fitur utama: auto-lihat status, auto-react status (emoji/teks), SW grup, sambutan grup foto anime, AFK, tools, fun, dan game.\n` +
					`Mode saat ini: *${cfg.mode === 'public' ? 'PUBLIC 🌐' : 'SELF 🔒'}*\n\n` +
					`Ketik \`.menu\` untuk daftar perintah lengkap.`
			);
		}
		if (cmd === 'sc' || cmd === 'script') {
			return reply(`📦 *Script bot ini*\nhttps://github.com/iyannsysu/auto-lihat-status-by-iyan\n\n© 2026 Iyan — dilarang diperjualbelikan.`);
		}
	},
};
