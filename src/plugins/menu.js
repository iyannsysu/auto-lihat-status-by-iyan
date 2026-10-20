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
 * plugins/menu.js — MENU UTAMA bergaya bot MD (foto + caption).
 *
 * Command (hanya dari owner / fromMe):
 *   .menu / .help / .bantuan -> foto banner + daftar perintah profesional
 *
 * Foto diambil dari assets/menu.jpg. Kalau file-nya tidak ada / gagal
 * dibaca, menu tetap terkirim sebagai teks saja (tidak error).
 * Status ON/OFF di menu dibaca LIVE dari config.json.
 */
import fs from 'fs';
import path from 'path';
import { readConfig, getMessageText } from '../helper/config.js';

const MENU_IMAGE = path.join(process.cwd(), 'assets', 'menu.jpg');

const onOff = v => (v ? 'ON 🟢' : 'OFF 🔴');

function menuText(cfg) {
	const mode = cfg.react_mode === 'teks' ? 'TEKS 📝' : 'EMOJI 😍';
	return (
		`╭━━━〔 👁️ *AUTO LIHAT STATUS* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ ⚡ Bot WhatsApp super-ringan\n` +
		`┃ 👑 *Creator :* Iyan\n` +
		`┃ 🤖 *Mode :* Self-Bot (khusus owner)\n` +
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
		`_© 2026 Iyan — script ini *dilarang diperjualbelikan*._\n` +
		`_Ada yang menjualnya? Lapor ke WA : +6282161429908_`
	);
}

export default {
	name: 'menu',
	desc: 'Menu utama bergaya bot MD: foto banner + daftar perintah. Command: .menu / .help.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe) return;
		const text = getMessageText(msg);
		if (!text) return;
		if (!/^[./!](menu|help|bantuan)\b/i.test(text)) return;

		const caption = menuText(readConfig());
		const jid = msg.key.remoteJid;
		try {
			const image = fs.readFileSync(MENU_IMAGE);
			await sock.sendMessage(jid, { image, caption }, { quoted: msg });
		} catch {
			// Foto tidak ada / gagal dibaca -> kirim teks saja.
			await sock.sendMessage(jid, { text: caption }, { quoted: msg });
		}
	},
};
