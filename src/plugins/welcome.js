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
 * plugins/welcome.js — SAMBUTAN GRUP (welcome / goodbye) pakai FOTO ANIME.
 *
 * Cara kerja:
 *  - Bot mendengar event group-participants.update dari index.js
 *    (hook plugin onGroupParticipants).
 *  - Ada yang MASUK grup (action 'add')    -> foto assets/welcome.jpg
 *    + caption "SELAMAT DATANG" + mention orangnya.
 *  - Ada yang KELUAR grup (action 'remove') -> foto assets/goodbye.jpg
 *    + caption "SELAMAT TINGGAL" + mention orangnya.
 *  - Foto tidak ada / gagal dibaca -> kirim teks saja (tidak error).
 *  - Action lain (promote / demote) diabaikan.
 *
 * Command (HANYA owner / fromMe, di mode apa pun):
 *   .welcome on / .welcome off -> nyalain / matiin sambutan grup
 *   .welcome cek               -> lihat status sambutan
 */
import fs from 'fs';
import path from 'path';
import { readConfig, writeConfig, getMessageText } from '../helper/config.js';

const WELCOME_IMAGE = path.join(process.cwd(), 'assets', 'welcome.jpg');
const GOODBYE_IMAGE = path.join(process.cwd(), 'assets', 'goodbye.jpg');

function participantJid(p) {
	// Baileys bisa kirim string JID atau objek { id } — terima dua-duanya.
	return typeof p === 'string' ? p : p?.id || p?.jid || '';
}

function welcomeCaption(num, grup) {
	return (
		`👋 *SELAMAT DATANG!*\n\n` +
		`Halo @${num} ✨\n` +
		`Selamat bergabung di grup *${grup}*!\n` +
		`Semoga betah, jangan lupa baca aturan grup ya 😊\n\n` +
		`— *AUTO LIHAT STATUS BY IYAN*`
	);
}

function goodbyeCaption(num, grup) {
	return (
		`🍂 *SELAMAT TINGGAL!*\n\n` +
		`Sampai jumpa @${num} 👋\n` +
		`Terima kasih sudah pernah jadi bagian dari grup *${grup}*.\n` +
		`Semoga sukses selalu di luar sana ✨\n\n` +
		`— *AUTO LIHAT STATUS BY IYAN*`
	);
}

async function sendSambutan(sock, groupJid, jid, imagePath, caption) {
	try {
		const image = fs.readFileSync(imagePath);
		await sock.sendMessage(groupJid, { image, caption, mentions: [jid] });
	} catch {
		await sock.sendMessage(groupJid, { text: caption, mentions: [jid] });
	}
}

export default {
	name: 'welcome',
	desc: 'Sambutan grup foto anime: anggota masuk = selamat datang, keluar = selamat tinggal. Command: .welcome on/off.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe) return;
		const text = getMessageText(msg);
		if (!text) return;
		const m = text.match(/^[./!](welcome|sambutan)\b(.*)$/is);
		if (!m) return;
		const arg = (m[2] || '').trim().toLowerCase();
		const jid = msg.key.remoteJid;
		if (arg === 'on' || arg === '1' || arg === 'ya' || arg === 'nyala') {
			writeConfig({ welcome: true });
			await sock.sendMessage(jid, { text: 'Sambutan grup sekarang *ON ✅*\nAnggota masuk/keluar grup akan disambut pakai foto anime.' }, { quoted: msg });
		} else if (arg === 'off' || arg === '0' || arg === 'tidak' || arg === 'mati') {
			writeConfig({ welcome: false });
			await sock.sendMessage(jid, { text: 'Sambutan grup sekarang *OFF ❌*' }, { quoted: msg });
		} else {
			const cfg = readConfig();
			await sock.sendMessage(jid, { text: `Sambutan grup saat ini: *${cfg.welcome ? 'ON ✅' : 'OFF ❌'}*\n\nPakai: \`.welcome on\` / \`.welcome off\`` }, { quoted: msg });
		}
	},

	async onGroupParticipants(ctx) {
		const { sock, event } = ctx;
		if (!readConfig().welcome) return;
		const action = event?.action;
		if (action !== 'add' && action !== 'remove') return;
		const groupJid = event?.id;
		if (!groupJid) return;

		// Nama grup untuk caption (gagal ambil -> pakai "grup ini").
		let groupName = 'grup ini';
		try {
			const meta = await sock.groupMetadata(groupJid);
			if (meta?.subject) groupName = meta.subject;
		} catch {}

		for (const p of event.participants || []) {
			const jid = participantJid(p);
			if (!jid) continue;
			const num = jid.split('@')[0].split(':')[0];
			try {
				if (action === 'add') {
					await sendSambutan(sock, groupJid, jid, WELCOME_IMAGE, welcomeCaption(num, groupName));
					console.log(`[auto-lihat-status] welcome: ${num} masuk grup ${groupName}`);
				} else {
					await sendSambutan(sock, groupJid, jid, GOODBYE_IMAGE, goodbyeCaption(num, groupName));
					console.log(`[auto-lihat-status] goodbye: ${num} keluar grup ${groupName}`);
				}
			} catch (err) {
				console.error('[auto-lihat-status] gagal kirim sambutan:', err?.message || err);
			}
		}
	},
};
