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
 * plugins/autoread.js — AUTO-LIHAT STATUS + command .read / .swgrup.
 *
 * Logika diambil dari readsw (handler/event.js + swconfig.js):
 *  - status pribadi (remoteJid === 'status@broadcast')
 *  - SW grup: status yang diposting ke grup (remoteJid @g.us, dibungkus
 *    groupStatusMessage/V2) ikut dibaca — bisa dimatikan via .swgrup off
 *  - skip status sendiri (fromMe) & reactionMessage (anti-loop)
 *  - skip protocolMessage (revoke, dll), termasuk yang di dalam bungkus SW grup
 *  - tandai dibaca via sock.readMessages() — di Baileys ini =
 *    fetchPrivacySettings + sendReceipts([key], 'read' | 'read-self')
 *  - dedup: WA bisa kirim status yang sama 2x
 *  - chat grup biasa BUKAN SW grup tetap diabaikan total.
 *
 * Command (simple, hanya dari owner / fromMe):
 *   .read on / .read off    -> nyalain / matiin auto-lihat status
 *   .swgrup on / .swgrup off -> nyalain / matiin proses SW grup
 *   (.menu / .help ditangani plugin menu.js)
 *
 * Interface plugin:
 *  { name, desc, onMessage(ctx) } — ctx = { sock, msg, config }
 */
import { writeConfig, getMessageText, isGroupStatus, getGroupStatusInner } from '../helper/config.js';

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

	// .swgrup on / off — SW grup (status yang diposting ke grup) ikut diproses atau tidak
	m = text.match(/^[./!](swgrup|swgroup|grupsw)\b(.*)$/is);
	if (m) {
		const arg = (m[2] || '').trim().toLowerCase();
		if (arg === 'on' || arg === '1' || arg === 'ya' || arg === 'nyala') {
			writeConfig({ swgrup: true });
			await reply(sock, msg, 'SW grup sekarang *ON ✅* — status yang diposting ke grup ikut dibaca & di-react.');
		} else if (arg === 'off' || arg === '0' || arg === 'tidak' || arg === 'mati') {
			writeConfig({ swgrup: false });
			await reply(sock, msg, 'SW grup sekarang *OFF ❌* — hanya status pribadi yang diproses.');
		} else {
			await reply(sock, msg, `Pakai: \`.swgrup on\` atau \`.swgrup off\``);
		}
		return true;
	}

	return false;
}

export default {
	name: 'autoread',
	desc: 'Tandai status (story) orang sebagai dibaca, otomatis — termasuk SW grup. Command: .read on/off, .swgrup on/off.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;

		// Command dulu (dari owner).
		if (await handleCommand(sock, msg)) return;

		// 1. Hanya status pribadi atau SW grup. Chat biasa (termasuk chat grup) diabaikan.
		const grup = isGroupStatus(msg);
		const pribadi = msg.key?.remoteJid === 'status@broadcast';
		if (!pribadi && !grup) return;
		// 2. SW grup hanya diproses kalau dinyalakan (.swgrup).
		if (grup && !ctx.config?.swgrup) return;
		// 3. Skip status sendiri.
		if (msg.key.fromMe) return;
		// 4. Skip reaction (react balasan bisa balik sebagai "status" -> loop),
		//    termasuk reaction yang dibungkus di dalam SW grup.
		if (msg.message?.reactionMessage) return;
		const inner = grup ? getGroupStatusInner(msg) : null;
		if (inner?.reactionMessage) return;
		// 5. Skip protocol message (revoke, dll), termasuk di dalam bungkus SW grup.
		if (msg.message?.protocolMessage) return;
		if (inner?.protocolMessage) return;
		// 6. Config live dari disk (on/off tanpa restart).
		if (!ctx.config?.autoread) return;
		// 7. Dedup.
		if (seenStatusIds.has(msg.key.id)) return;
		seenStatusIds.add(msg.key.id);
		if (seenStatusIds.size > 1000) {
			for (const id of [...seenStatusIds].slice(0, 500)) seenStatusIds.delete(id);
		}

		// 8. Tandai dibaca (key apa adanya — sama seperti readsw sendReceipts([key])).
		await sock.readMessages([msg.key]);
		const sender = (msg.participant || msg.key.participant || '').split('@')[0] || '?';
		if (grup) {
			const grupId = (msg.key.remoteJid || '').split('@')[0];
			console.log(`[auto-lihat-status] dibaca: SW grup dari ${sender} (grup ${grupId})`);
		} else {
			console.log(`[auto-lihat-status] dibaca: status dari ${sender} (${msg.key.id})`);
		}
	},
};
