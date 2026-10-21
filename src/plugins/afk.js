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
 * plugins/afk.js — FITUR AFK (Away From Keyboard).
 *
 * Isi data AFK yang ditampilkan: NAMA orangnya, ALASAN afk, dan
 * WAKTU afk (jam mulai + sudah berapa lama).
 *
 * Cara kerja:
 *  - `.afk <alasan>` -> pengirim jadi AFK. Mode public: siapa pun bisa
 *    afk untuk dirinya sendiri. Mode self: hanya owner.
 *  - Orang yang AFK mengirim pesan lagi (di chat mana pun) -> AFK-nya
 *    selesai, bot umumkan: "[nama] kembali dari AFK setelah [durasi].
 *    Alasan: [alasan]".
 *  - Orang AFK di-MENTION (@) atau pesan-nya di-REPLY di grup -> bot
 *    kabari di grup itu: "[nama] sedang AFK sejak [jam] (sudah
 *    [durasi]). Alasan: [alasan]" (dijeda 60 dtk per orang per chat,
 *    anti-spam).
 *  - OWNER sedang AFK lalu ada yang chat pribadi -> bot balas di chat
 *    itu dengan kabar AFK owner (jeda yang sama).
 *  - `.afk off` -> batalkan AFK sendiri tanpa pengumuman kembali.
 *  - `.afk cek` -> daftar semua yang sedang AFK.
 *
 * Data disimpan di afk.json (di folder proyek) supaya tidak hilang
 * saat bot restart. Pesan kiriman bot sendiri (ID diawali 3EB0,
 * pola yang sama seperti readsw) tidak dihitung sebagai "kembali" —
 * biar balasan bot tidak membatalkan AFK owner secara tidak sengaja.
 */
import fs from 'fs';
import path from 'path';
import { jidNormalizedUser } from 'baileys';
import { readConfig, getMessageText } from '../helper/config.js';

const AFK_FILE = path.join(process.cwd(), 'afk.json');
const NOTIFY_COOLDOWN_MS = 60 * 1000;

// Map<jidNormal, { name, reason, since }> — since = Date.now() saat mulai AFK.
let afkMap = loadAfk();
// Map<"jid|chatJid", timestamp> — jeda notif anti-spam.
const lastNotify = new Map();

function loadAfk() {
	try {
		const raw = JSON.parse(fs.readFileSync(AFK_FILE, 'utf-8') || '{}');
		return new Map(Object.entries(raw));
	} catch {
		return new Map();
	}
}

function saveAfk() {
	try {
		fs.writeFileSync(AFK_FILE, JSON.stringify(Object.fromEntries(afkMap), null, 2) + '\n');
	} catch (err) {
		console.error('[auto-lihat-status] gagal simpan afk.json:', err?.message || err);
	}
}

function formatJam(timestamp) {
	try {
		return (
			new Intl.DateTimeFormat('id-ID', {
				timeZone: 'Asia/Jakarta',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
			}).format(new Date(timestamp)) + ' WIB'
		);
	} catch {
		return new Date(timestamp).toLocaleTimeString('id-ID');
	}
}

function formatDurasi(ms) {
	const detik = Math.max(0, Math.floor(ms / 1000));
	const jam = Math.floor(detik / 3600);
	const menit = Math.floor((detik % 3600) / 60);
	const sisaDetik = detik % 60;
	const parts = [];
	if (jam) parts.push(`${jam} jam`);
	if (menit) parts.push(`${menit} menit`);
	if (!jam && !menit) parts.push(`${sisaDetik} detik`);
	return parts.join(' ') || '0 detik';
}

function afkInfoText(entry) {
	return (
		`💤 *${entry.name}* sedang *AFK*\n` +
		`📝 Alasan : ${entry.reason}\n` +
		`🕐 Sejak : ${formatJam(entry.since)} (sudah ${formatDurasi(Date.now() - entry.since)})`
	);
}

/** JID pengirim pesan ini (owner kalau fromMe, selain itu participant/remoteJid). */
function senderJid(sock, msg) {
	if (msg.key.fromMe) return jidNormalizedUser(sock.user?.id || '');
	const raw = msg.key.participant || msg.participant || msg.key.remoteJid || '';
	return raw ? jidNormalizedUser(raw) : '';
}

function senderName(sock, msg, jid) {
	if (msg.key.fromMe) return sock.user?.name || msg.pushName || jid.split('@')[0];
	return msg.pushName || jid.split('@')[0];
}

/** Semua JID yang di-mention / di-reply dalam pesan ini. */
function mentionedJids(msg) {
	const m = msg.message || {};
	const contexts = [
		m.extendedTextMessage?.contextInfo,
		m.imageMessage?.contextInfo,
		m.videoMessage?.contextInfo,
		m.documentMessage?.contextInfo,
	];
	const out = new Set();
	for (const c of contexts) {
		if (!c) continue;
		for (const j of c.mentionedJid || []) out.add(jidNormalizedUser(j));
		if (c.participant) out.add(jidNormalizedUser(c.participant));
	}
	return [...out];
}

async function handleCommand(sock, msg, text) {
	const m = text.match(/^[./!](afk)\b(.*)$/is);
	if (!m) return false;
	const cfg = readConfig();
	// Mode self: hanya owner. Mode public: siapa pun untuk dirinya sendiri.
	if (!msg.key.fromMe && cfg.mode !== 'public') return true; // diam saja
	const arg = (m[2] || '').trim();
	const jid = senderJid(sock, msg);
	const chatJid = msg.key.remoteJid;

	if (arg.toLowerCase() === 'cek' || arg.toLowerCase() === 'check' || arg.toLowerCase() === 'list') {
		if (!afkMap.size) {
			await sock.sendMessage(chatJid, { text: 'Tidak ada yang sedang AFK saat ini. 😊' }, { quoted: msg });
		} else {
			const lines = [...afkMap.values()].map(
				(e, i) => `${i + 1}. *${e.name}*\n   📝 ${e.reason}\n   🕐 Sejak ${formatJam(e.since)} (sudah ${formatDurasi(Date.now() - e.since)})`
			);
			await sock.sendMessage(chatJid, { text: `💤 *Yang sedang AFK (${afkMap.size})*\n\n${lines.join('\n\n')}` }, { quoted: msg });
		}
		return true;
	}

	if (arg.toLowerCase() === 'off' || arg.toLowerCase() === 'batal') {
		if (afkMap.delete(jid)) saveAfk();
		await sock.sendMessage(chatJid, { text: 'AFK kamu sudah *dimatikan* ✅' }, { quoted: msg });
		return true;
	}

	// Set AFK (alasan boleh kosong).
	const name = senderName(sock, msg, jid);
	const reason = arg.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200) || 'Tanpa alasan';
	afkMap.set(jid, { name, reason, since: Date.now() });
	saveAfk();
	await sock.sendMessage(
		chatJid,
		{
			text:
				`💤 *AFK AKTIF*\n\n` +
				`👤 Nama : ${name}\n` +
				`📝 Alasan : ${reason}\n` +
				`🕐 Mulai : ${formatJam(Date.now())}\n\n` +
				`Kirim pesan apa pun untuk kembali, atau \`.afk off\` untuk batal.`,
		},
		{ quoted: msg }
	);
	console.log(`[auto-lihat-status] afk: ${name} mulai AFK (${reason})`);
	return true;
}

export default {
	name: 'afk',
	desc: 'AFK: .afk <alasan> (nama + alasan + waktu tercatat), notif saat di-mention/dichat, umumkan saat kembali.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		const chatJid = msg.key?.remoteJid || '';
		// Hanya chat pribadi & grup — status tidak memicu AFK.
		if (chatJid === 'status@broadcast') return;
		if (msg.message?.reactionMessage || msg.message?.protocolMessage) return;

		const text = getMessageText(msg);

		// Command .afk dulu.
		if (text && (await handleCommand(sock, msg, text))) return;

		const jid = senderJid(sock, msg);
		if (!jid) return;
		const isBotSent = String(msg.key.id || '').startsWith('3EB0');

		// 1) Pengirim sendiri sedang AFK lalu mengirim pesan -> KEMBALI.
		//    Pesan kiriman bot (3EB0) tidak dihitung, biar notif bot tidak
		//    membatalkan AFK owner.
		if (!isBotSent && afkMap.has(jid)) {
			const entry = afkMap.get(jid);
			afkMap.delete(jid);
			saveAfk();
			await sock.sendMessage(chatJid, {
				text:
					`👋 *${entry.name}* sudah *KEMBALI* dari AFK!\n` +
					`📝 Alasan tadi : ${entry.reason}\n` +
					`🕐 AFK selama : ${formatDurasi(Date.now() - entry.since)}`,
			});
			console.log(`[auto-lihat-status] afk: ${entry.name} kembali setelah ${formatDurasi(Date.now() - entry.since)}`);
			return;
		}

		// 2) Notif: ada orang AFK yang di-mention / di-reply di chat ini,
		//    atau owner AFK dan ada yang chat pribadi ke owner.
		const targets = new Set(mentionedJids(msg));
		const ownJid = jidNormalizedUser(sock.user?.id || '');
		const isPrivate = !chatJid.endsWith('@g.us');
		if (isPrivate && !msg.key.fromMe && afkMap.has(ownJid)) targets.add(ownJid);
		targets.delete(jid); // jangan kabari soal diri sendiri

		for (const target of targets) {
			const entry = afkMap.get(target);
			if (!entry) continue;
			const cdKey = `${target}|${chatJid}`;
			if (Date.now() - (lastNotify.get(cdKey) || 0) < NOTIFY_COOLDOWN_MS) continue;
			lastNotify.set(cdKey, Date.now());
			await sock.sendMessage(chatJid, { text: afkInfoText(entry) }, { quoted: msg });
			console.log(`[auto-lihat-status] afk: notif ${entry.name} di ${chatJid.split('@')[0]}`);
		}
	},
};
