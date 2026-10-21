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
 * plugins/profile.js — PROFILE user (nama, gender, umur, bio).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .profile / .profil [@user | reply]  lihat profil (dengan foto profil WA bila ada)
 *   .setname <nama>        atur nama profilmu
 *   .setgender <gender>    atur gender (laki-laki / perempuan)
 *   .setage <umur>         atur umur (5-100)
 *   .setbio <teks>         atur bio singkat
 *   .getpp [@user | reply] kirim foto profil WhatsApp seseorang
 *   .level                 lihat level & XP kamu (XP dari ngobrol biasa)
 *
 * Data disimpan di profil.json (atomik, aman dari restart).
 */
import fs from 'fs';
import path from 'path';
import { jidNormalizedUser } from 'baileys';
import { readConfig, getMessageText } from '../helper/config.js';

const PROFIL_FILE = path.join(process.cwd(), 'profil.json');
let profiles = loadProfiles();

function loadProfiles() {
	try { return JSON.parse(fs.readFileSync(PROFIL_FILE, 'utf-8') || '{}'); } catch { return {}; }
}
function saveProfiles() {
	try {
		const tmp = `${PROFIL_FILE}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(profiles, null, 2) + '\n');
		fs.renameSync(tmp, PROFIL_FILE);
	} catch (err) { console.error('[auto-lihat-status] gagal simpan profil.json:', err?.message || err); }
}
function getProfile(jid) { if (!profiles[jid]) profiles[jid] = {}; return profiles[jid]; }

// ---------- Level & XP ----------
// Ngobrol biasa dapat XP (jeda 60 detik per orang, +5 s/d +15 XP).
// Level: level n mulai di 100*(n-1)^2 XP. Data XP tersimpan di profil.json.
const lastXpAt = new Map();
function levelFor(xp) {
	const level = Math.floor(Math.sqrt((xp || 0) / 100)) + 1;
	const base = 100 * (level - 1) ** 2;
	const next = 100 * level ** 2;
	return { level, base, next, progress: Math.min(1, ((xp || 0) - base) / (next - base)) };
}
function awardXp(jid) {
	const now = Date.now();
	if (now - (lastXpAt.get(jid) || 0) < 60_000) return;
	lastXpAt.set(jid, now);
	const p = getProfile(jid);
	p.xp = (p.xp || 0) + 5 + Math.floor(Math.random() * 11);
	saveProfiles();
}

function senderJid(sock, msg) {
	if (msg.key.fromMe) return jidNormalizedUser(sock.user?.id || '');
	const raw = msg.key.participant || msg.participant || msg.key.remoteJid || '';
	return raw ? jidNormalizedUser(raw) : '';
}

/** Target: @mention pertama, atau pengirim pesan yang di-reply, atau diri sendiri. */
function targetJid(sock, msg) {
	const c = msg.message?.extendedTextMessage?.contextInfo;
	if (c?.mentionedJid?.length) return jidNormalizedUser(c.mentionedJid[0]);
	if (c?.participant) return jidNormalizedUser(c.participant);
	return senderJid(sock, msg);
}

function profileCard(jid, data, fallbackName) {
	const belum = '_(belum diatur)_';
	const lvl = levelFor(data.xp || 0);
	return (
		`👤 *PROFIL USER*\n\n` +
		`📛 Nama : *${data.name || fallbackName || jid.split('@')[0]}*\n` +
		`📱 Nomor : +${jid.split('@')[0]}\n` +
		`🚻 Gender : ${data.gender || belum}\n` +
		`🎂 Umur : ${data.age ? `${data.age} tahun` : belum}\n` +
		`📝 Bio : ${data.bio || belum}\n` +
		`🏅 Level : ${lvl.level} (${data.xp || 0} XP)\n\n` +
		`_Atur profilmu: \`.setname\` \`.setgender\` \`.setage\` \`.setbio\`_`
	);
}

const GENDERS = {
	'laki-laki': 'Laki-laki', laki: 'Laki-laki', pria: 'Laki-laki', cowok: 'Laki-laki', cowo: 'Laki-laki', l: 'Laki-laki',
	perempuan: 'Perempuan', wanita: 'Perempuan', cewek: 'Perempuan', cewe: 'Perempuan', p: 'Perempuan',
};

export default {
	name: 'profile',
	desc: 'Profile user: .profile (nama/gender/umur/bio), .setname/.setgender/.setage/.setbio, .getpp.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe && readConfig().mode !== 'public') return;
		const raw = getMessageText(msg);
		if (!raw) return;
		// XP untuk obrolan biasa (bukan command).
		if (!/^[./!]/.test(raw.trim())) {
			try { awardXp(senderJid(sock, msg)); } catch { /* abaikan */ }
			return;
		}
		const m = raw.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		const args = (m[2] || '').trim();
		const chatJid = msg.key.remoteJid;
		const me = senderJid(sock, msg);
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });

		if (cmd === 'setname') {
			if (!args) return reply('Pakai: `.setname Nama Kamu`');
			getProfile(me).name = args.slice(0, 50);
			getProfile(me).updatedAt = Date.now(); saveProfiles();
			return reply(`✅ Nama profilmu sekarang: *${getProfile(me).name}*`);
		}
		if (cmd === 'setgender') {
			const g = GENDERS[args.toLowerCase()];
			if (!g) return reply('Pakai: `.setgender laki-laki` atau `.setgender perempuan`');
			getProfile(me).gender = g; getProfile(me).updatedAt = Date.now(); saveProfiles();
			return reply(`✅ Gender profilmu: *${g}*`);
		}
		if (cmd === 'setage') {
			const age = Number(args);
			if (!Number.isInteger(age) || age < 5 || age > 100) return reply('Pakai: `.setage <umur>` — angka 5 sampai 100 ya.');
			getProfile(me).age = age; getProfile(me).updatedAt = Date.now(); saveProfiles();
			return reply(`✅ Umur profilmu: *${age} tahun*`);
		}
		if (cmd === 'setbio') {
			if (!args) return reply('Pakai: `.setbio teks bio singkatmu`');
			getProfile(me).bio = args.slice(0, 150); getProfile(me).updatedAt = Date.now(); saveProfiles();
			return reply('✅ Bio profilmu sudah diperbarui.');
		}
		if (cmd === 'level' || cmd === 'lvl') {
			const data = getProfile(me);
			const lvl = levelFor(data.xp || 0);
			const filled = Math.round(lvl.progress * 10);
			const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
			return reply(
				`🏅 *LEVEL KAMU*\n\n` +
					`👤 ${data.name || msg.pushName || me.split('@')[0]}\n` +
					`⭐ Level : *${lvl.level}*\n` +
					`✨ XP : ${data.xp || 0} / ${lvl.next} (menuju level ${lvl.level + 1})\n` +
					`${bar} ${Math.round(lvl.progress * 100)}%\n\n` +
					`_Ngobrol biasa di chat/grup buat nambah XP (jeda 60 detik)._`
			);
		}
		if (cmd === 'profile' || cmd === 'profil') {
			const target = targetJid(sock, msg);
			const data = getProfile(target);
			const fallback = target === me ? msg.pushName || sock.user?.name : '';
			const card = profileCard(target, data, fallback);
			// Sertakan foto profil WA bila bisa diambil.
			try {
				const pp = await sock.profilePictureUrl(target, 'image');
				if (pp) return sock.sendMessage(chatJid, { image: { url: pp }, caption: card, mentions: [target] }, { quoted: msg });
			} catch { /* foto tidak ada / diprivasi — kirim teks saja */ }
			return sock.sendMessage(chatJid, { text: card, mentions: [target] }, { quoted: msg });
		}
		if (cmd === 'getpp') {
			const target = targetJid(sock, msg);
			try {
				const pp = await sock.profilePictureUrl(target, 'image');
				if (!pp) throw new Error('kosong');
				return sock.sendMessage(chatJid, { image: { url: pp }, caption: `📸 Foto profil @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
			} catch {
				return reply(`📸 @${target.split('@')[0]} tidak memasang foto profil, atau fotonya diprivasi.`);
			}
		}
	},
};
