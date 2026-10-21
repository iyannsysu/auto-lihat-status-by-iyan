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
 * plugins/bot.js — BOT / utilitas akun (sebagian khusus owner).
 *
 * Command:
 *   .botinfo / .stats    info bot: mode, runtime, plugin, memori (semua orang di mode public)
 *   .listgroup           daftar grup yang diikuti akun bot (OWNER)
 *   .upsw <teks>         posting status WA teks (OWNER) — atau reply foto/video untuk posting media
 *   .setpp               ganti foto profil akun dari foto yang di-reply (OWNER)
 *   .join <link grup>    gabung grup lewat link undangan (OWNER)
 *   .leave               keluar dari grup ini (OWNER)
 */
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage, jidNormalizedUser } from 'baileys';
import { readConfig, getMessageText } from '../helper/config.js';

function formatUptime(ms) {
	const d = Math.floor(ms / 86400000);
	const h = Math.floor((ms % 86400000) / 3600000);
	const mnt = Math.floor((ms % 3600000) / 60000);
	const parts = [];
	if (d) parts.push(`${d} hari`);
	if (h) parts.push(`${h} jam`);
	parts.push(`${mnt} menit`);
	return parts.join(' ');
}

function pluginCount() {
	try {
		return fs.readdirSync(path.join(process.cwd(), 'src', 'plugins')).filter(f => f.endsWith('.js') && !f.startsWith('_')).length;
	} catch { return '?'; }
}

export default {
	name: 'bot',
	desc: 'Bot/misc: botinfo, listgroup, upsw, setpp, join, leave (sebagian owner-only).',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		const raw = getMessageText(msg);
		if (!raw) return;
		const m = raw.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		const args = (m[2] || '').trim();
		const chatJid = msg.key.remoteJid;
		const cfg = readConfig();
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });
		const COMMANDS = ['botinfo', 'stats', 'listgroup', 'listgrup', 'upsw', 'setpp', 'join', 'leave', 'leavegroup'];
		if (!COMMANDS.includes(cmd)) return;

		// botinfo boleh untuk semua di mode public; sisanya owner-only.
		if (cmd !== 'botinfo' && cmd !== 'stats') {
			if (!msg.key.fromMe) return;
		} else if (!msg.key.fromMe && cfg.mode !== 'public') return;

		try {
			if (cmd === 'botinfo' || cmd === 'stats') {
				const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
				return reply(
					`🤖 *BOT INFO*\n\n` +
						`Nama bot : auto lihat status by iyan\n` +
						`Akun : +${jidNormalizedUser(sock.user?.id || '').split('@')[0]}\n` +
						`Mode : ${cfg.mode === 'public' ? 'PUBLIC 🌐' : 'SELF 🔒'}\n` +
						`Runtime : ${formatUptime(process.uptime() * 1000)}\n` +
						`Plugin aktif : ${pluginCount()}\n` +
						`Memori : ${mem} MB\n` +
						`Platform : ${process.platform} • Node ${process.version}`
				);
			}
			if (cmd === 'listgroup' || cmd === 'listgrup') {
				const groups = await sock.groupFetchAllParticipating();
				const list = Object.values(groups || {});
				if (!list.length) return reply('Akun bot belum ikut grup mana pun.');
				const lines = list
					.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0))
					.map((g, i) => `${i + 1}. *${g.subject || '(tanpa nama)'}*\n   ${g.participants?.length || 0} anggota • ${g.id}`);
				return reply(`👥 *GRUP YANG DIIKUTI (${list.length})*\n\n${lines.join('\n')}`);
			}
			if (cmd === 'upsw') {
				// Reply foto/video -> posting media; ada teks -> posting status teks.
				const q = msg.message?.extendedTextMessage?.contextInfo;
				const quoted = q?.quotedMessage;
				if (quoted && (quoted.imageMessage || quoted.videoMessage)) {
					const target = { key: { remoteJid: chatJid, id: q.stanzaId, participant: q.participant, fromMe: false }, message: quoted };
					const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
					if (quoted.imageMessage) await sock.sendMessage('status@broadcast', { image: buffer, caption: args || undefined });
					else await sock.sendMessage('status@broadcast', { video: buffer, caption: args || undefined });
					return reply('✅ Status (media) sudah diposting ke SW kamu.');
				}
				if (!args) return reply('Pakai: `.upsw teks statusmu` — atau reply foto/video dengan `.upsw`');
				await sock.sendMessage('status@broadcast', { text: args, backgroundArgb: 0xff075e54, font: 0 });
				return reply('✅ Status teks sudah diposting ke SW kamu.');
			}
			if (cmd === 'setpp') {
				const q = msg.message?.extendedTextMessage?.contextInfo;
				const quoted = q?.quotedMessage;
				const own = msg.message?.imageMessage;
				if (!quoted?.imageMessage && !own) return reply('Reply sebuah foto dengan `.setpp`, atau kirim foto dengan caption `.setpp`');
				const target = quoted?.imageMessage
					? { key: { remoteJid: chatJid, id: q.stanzaId, participant: q.participant, fromMe: false }, message: quoted }
					: msg;
				const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
				await sock.updateProfilePicture(jidNormalizedUser(sock.user?.id || ''), buffer);
				return reply('✅ Foto profil akun sudah diganti.');
			}
			if (cmd === 'join') {
				const code = (args.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/) || [])[1] || args.split('/').pop();
				if (!code) return reply('Pakai: `.join <link undangan grup>`');
				const gid = await sock.groupAcceptInvite(code);
				return reply(`✅ Sudah gabung grup: ${gid}`);
			}
			if (cmd === 'leave' || cmd === 'leavegroup') {
				if (!chatJid.endsWith('@g.us')) return reply('Command ini dipakai di dalam grup yang mau ditinggalkan.');
				await sock.sendMessage(chatJid, { text: '👋 Bot pamit keluar grup. Terima kasih semuanya!' });
				await sock.groupLeave(chatJid);
				return;
			}
		} catch (err) {
			return reply(`❌ Gagal: ${err?.message || err}`);
		}
	},
};
