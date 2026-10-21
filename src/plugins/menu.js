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
 * plugins/menu.js — MENU UTAMA bergaya bot MD (foto + caption) + MODE bot.
 *
 * Command:
 *   .menu / .help / .bantuan -> foto banner + daftar perintah profesional.
 *                               Mode PUBLIC: bisa dipakai SEMUA orang.
 *                               Mode SELF: hanya owner (fromMe).
 *   .mode public / .mode self -> ganti mode bot (HANYA owner).
 *   .mode cek                  -> lihat mode saat ini (HANYA owner).
 *
 * Command PENGATURAN (.read, .swgrup, .react, .welcome, .mode) selalu
 * khusus owner di mode apa pun — mode public hanya membuka .menu.
 *
 * Foto diambil dari assets/menu.jpg. Kalau file-nya tidak ada / gagal
 * dibaca, menu tetap terkirim sebagai teks saja (tidak error).
 * Status ON/OFF di menu dibaca LIVE dari config.json.
 */
import fs from 'fs';
import path from 'path';
import { readConfig, writeConfig, getMessageText } from '../helper/config.js';

const MENU_IMAGE = path.join(process.cwd(), 'assets', 'menu.jpg');

const onOff = v => (v ? 'ON 🟢' : 'OFF 🔴');

function menuText(cfg) {
	const mode = cfg.react_mode === 'teks' ? 'TEKS 📝' : 'EMOJI 😍';
	const botMode = cfg.mode === 'public' ? 'PUBLIC 🌐 (menu untuk semua)' : 'SELF 🔒 (khusus owner)';
	return (
		`╭━━━〔 👁️ *AUTO LIHAT STATUS* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ ⚡ Bot WhatsApp super-ringan\n` +
		`┃ 👑 *Creator :* Iyan\n` +
		`┃ 🤖 *Mode :* ${botMode}\n` +
		`┃ 📡 *Status :* Online\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 👁️ *MENU LIHAT STATUS* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.read on\` / \`.read off\`\n` +
		`┃   ↳ Auto-Lihat Status : *${onOff(cfg.autoread)}*\n` +
		`┃ • \`.swgrup on\` / \`.swgrup off\`\n` +
		`┃   ↳ SW Grup : *${onOff(cfg.swgrup)}*\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 😍 *MENU AUTO REACT* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.react on\` / \`.react off\`\n` +
		`┃   ↳ Auto React : *${onOff(cfg.autoreact)}* (mode ${mode})\n` +
		`┃ • \`.react emoji ❤️ 🔥\` — pakai emoji + set daftar\n` +
		`┃ • \`.react teks SEMANGAT!\` — pakai teks + set teks\n` +
		`┃ • \`.react teks off\` — balik ke mode emoji\n` +
		`┃ • \`.react acak on/off\` — emoji acak / urut\n` +
		`┃ • \`.react cek\` — lihat setting react\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 👥 *MENU GRUP* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.welcome on\` / \`.welcome off\`\n` +
		`┃   ↳ Sambutan Grup : *${onOff(cfg.welcome)}*\n` +
		`┃     (foto anime: datang 👋 / pergi 🍂)\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 ⚙️ *PENGATURAN* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.mode public\` / \`.mode self\` — ganti mode bot\n` +
		`┃ • \`.mode cek\` — lihat mode saat ini\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`_© 2026 Iyan — script ini *dilarang diperjualbelikan*._\n` +
		`_Ada yang menjualnya? Lapor ke WA : +6282161429908_`
	);
}

export default {
	name: 'menu',
	desc: 'Menu utama bergaya bot MD: foto banner + daftar perintah. Command: .menu / .help (public: semua orang), .mode (owner).',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		const text = getMessageText(msg);
		if (!text) return;
		const cfg = readConfig();
		const jid = msg.key.remoteJid;

		// .mode — HANYA owner, di mode apa pun.
		const modeMatch = text.match(/^[./!](mode)\b(.*)$/is);
		if (modeMatch) {
			if (!msg.key.fromMe) return;
			const arg = (modeMatch[2] || '').trim().toLowerCase();
			if (arg === 'public' || arg === 'publik') {
				writeConfig({ mode: 'public' });
				await sock.sendMessage(jid, { text: 'Mode bot sekarang *PUBLIC 🌐*\nSemua orang bisa pakai `.menu`. Command pengaturan tetap khusus owner.' }, { quoted: msg });
			} else if (arg === 'self' || arg === 'sendiri') {
				writeConfig({ mode: 'self' });
				await sock.sendMessage(jid, { text: 'Mode bot sekarang *SELF 🔒*\nSemua command hanya untuk owner.' }, { quoted: msg });
			} else {
				await sock.sendMessage(jid, { text: `Mode saat ini: *${cfg.mode === 'public' ? 'PUBLIC 🌐' : 'SELF 🔒'}*\n\nGanti: \`.mode public\` / \`.mode self\`` }, { quoted: msg });
			}
			return;
		}

		// .menu / .help / .bantuan — owner selalu bisa; orang lain hanya di mode public.
		if (!/^[./!](menu|help|bantuan)\b/i.test(text)) return;
		if (!msg.key.fromMe && cfg.mode !== 'public') return;

		const caption = menuText(cfg);
		try {
			const image = fs.readFileSync(MENU_IMAGE);
			await sock.sendMessage(jid, { image, caption }, { quoted: msg });
		} catch {
			// Foto tidak ada / gagal dibaca -> kirim teks saja.
			await sock.sendMessage(jid, { text: caption }, { quoted: msg });
		}
	},
};
