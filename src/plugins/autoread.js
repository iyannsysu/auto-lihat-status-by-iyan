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
 * plugins/autoread.js — AUTO-LIHAT STATUS + command .read / .help.
 *
 * Logika diambil dari readsw (handler/event.js + swconfig.js):
 *  - hanya status (remoteJid === 'status@broadcast'), bukan chat / grup
 *  - skip status sendiri (fromMe) & reactionMessage (anti-loop)
 *  - skip protocolMessage (revoke, dll)
 *  - tandai dibaca via sock.readMessages() — di Baileys ini =
 *    fetchPrivacySettings + sendReceipts([key], 'read' | 'read-self')
 *  - dedup: WA bisa kirim status yang sama 2x
 *
 * Command (simple, hanya dari owner / fromMe):
 *   .read on / .read off  -> nyalain / matiin auto-lihat status
 *   .help / .menu         -> daftar semua perintah bot
 *
 * Interface plugin:
 *  { name, desc, onMessage(ctx) } — ctx = { sock, msg, config }
 */
import { writeConfig, getMessageText } from '../helper/config.js';

// Dedup per-plugin: jangan kirim receipt dobel untuk status yang sama.
const seenStatusIds = new Set();

async function reply(sock, msg, text) {
	await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

async function handleCommand(sock, msg) {
	if (!msg.key.fromMe) return false;
	const text = getMessageText(msg);
	if (!text) return false;

	// .read on / off
	let m = text.match(/^[./!](read)\b(.*)$/is);
	if (m) {
		const arg = (m[2] || '').trim().toLowerCase();
		if (arg === 'on' || arg === '1' || arg === 'ya' || arg === 'nyala') {
			writeConfig({ autoread: true });
			await reply(sock, msg, 'Auto-lihat status sekarang *ON ✅*');
		} else if (arg === 'off' || arg === '0' || arg === 'tidak' || arg === 'mati') {
			writeConfig({ autoread: false });
			await reply(sock, msg, 'Auto-lihat status sekarang *OFF ❌*');
		} else {
			await reply(sock, msg, `Pakai: \`.read on\` atau \`.read off\``);
		}
		return true;
	}

	// .help / .menu — daftar perintah (ditaruh di sini biar 1 tempat)
	m = text.match(/^[./!](help|menu|bantuan)\b/i);
	if (m) {
		await reply(
			sock,
			msg,
			`🤖 *AUTO LIHAT STATUS BY IYAN — perintah simple*\n\n` +
				`*LIHAT STATUS*\n` +
				`• \`.read on\` / \`.read off\` — nyalain / matiin auto-lihat\n\n` +
				`*REACT STATUS*\n` +
				`• \`.react on\` / \`.react off\` — nyalain / matiin auto react\n` +
				`• \`.react emoji ❤️ 🔥\` — pakai emoji + set daftarnya\n` +
				`• \`.react teks SEMANGAT!\` — pakai teks + set teksnya\n` +
				`• \`.react teks off\` — balik ke mode emoji\n` +
				`• \`.react acak on/off\` — emoji acak / urut\n` +
				`• \`.react cek\` — lihat setting react\n\n` +
				`Ketik \`.react\` doang untuk bantuan react.`
		);
		return true;
	}

	return false;
}

export default {
	name: 'autoread',
	desc: 'Tandai status (story) orang sebagai dibaca, otomatis. Command: .read on/off, .help.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;

		// Command dulu (dari owner).
		if (await handleCommand(sock, msg)) return;

		// 1. Hanya status, bukan chat / grup.
		if (msg.key?.remoteJid !== 'status@broadcast') return;
		// 2. Skip status sendiri.
		if (msg.key.fromMe) return;
		// 3. Skip reaction (react balasan bisa balik sebagai "status" -> loop).
		if (msg.message?.reactionMessage) return;
		// 4. Skip protocol message (revoke, dll).
		if (msg.message?.protocolMessage) return;
		// 5. Config live dari disk (on/off tanpa restart).
		if (!ctx.config?.autoread) return;
		// 6. Dedup.
		if (seenStatusIds.has(msg.key.id)) return;
		seenStatusIds.add(msg.key.id);
		if (seenStatusIds.size > 1000) {
			for (const id of [...seenStatusIds].slice(0, 500)) seenStatusIds.delete(id);
		}

		// 7. Tandai dibaca.
		await sock.readMessages([msg.key]);
		const sender = (msg.participant || msg.key.participant || '').split('@')[0] || '?';
		console.log(`[auto-lihat-status] dibaca: status dari ${sender} (${msg.key.id})`);
	},
};
