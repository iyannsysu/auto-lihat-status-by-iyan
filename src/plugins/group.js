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
 * plugins/group.js — GROUP admin & manajemen grup.
 *
 * Syarat pakai: pengirim harus OWNER bot (fromMe) atau ADMIN grup itu,
 * dan akun bot harus jadi admin grup agar aksinya berhasil (WhatsApp
 * yang menentukan; error diteruskan apa adanya).
 *
 * Command:
 *   .tagall [teks]        mention semua anggota (terlihat)
 *   .hidetag [teks]       mention semua anggota (tersembunyi)
 *   .open / .close        buka / tutup grup (hanya admin yang bisa chat)
 *   .promote / .demote    jadikan / turunkan admin (@tag atau reply)
 *   .kick / .remove       keluarkan anggota (@tag atau reply)
 *   .add <nomor>          tambahkan anggota
 *   .linkgc               link undangan grup
 *   .revoke               reset link undangan grup
 *   .groupinfo            info grup (nama, anggota, admin, dll)
 *   .groupid              ID grup ini
 *   .listadmin            daftar admin grup
 *   .botadmin             cek apakah bot admin di grup ini
 *   .setsubject <teks>    ganti nama grup
 *   .setdesc <teks>       ganti deskripsi grup
 *   .delete / .del        hapus pesan yang di-reply
 *   .antilink on/off      hapus otomatis pesan berisi link grup WA
 *   .warn (@tag/reply)    beri peringatan (3x = dikeluarkan)
 *   .warnings             daftar peringatan di grup ini
 *   .resetwarn            reset semua peringatan grup ini
 *
 * Pengaturan per grup (antilink + warn) disimpan di grup.json
 * (atomik, aman dari restart).
 */
import fs from 'fs';
import path from 'path';
import { jidNormalizedUser } from 'baileys';
import { readConfig, getMessageText } from '../helper/config.js';

const GRUP_FILE = path.join(process.cwd(), 'grup.json');
let groupData = loadGrup();

function loadGrup() {
	try { return JSON.parse(fs.readFileSync(GRUP_FILE, 'utf-8') || '{}'); } catch { return {}; }
}
function saveGrup() {
	try {
		const tmp = `${GRUP_FILE}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(groupData, null, 2) + '\n');
		fs.renameSync(tmp, GRUP_FILE);
	} catch (err) { console.error('[auto-lihat-status] gagal simpan grup.json:', err?.message || err); }
}
function gdata(jid) { if (!groupData[jid]) groupData[jid] = { antilink: false, warns: {} }; return groupData[jid]; }

function senderJid(sock, msg) {
	if (msg.key.fromMe) return jidNormalizedUser(sock.user?.id || '');
	const raw = msg.key.participant || msg.participant || msg.key.remoteJid || '';
	return raw ? jidNormalizedUser(raw) : '';
}

/** Target dari @mention pertama atau pesan yang di-reply. */
function targetJid(msg) {
	const c = msg.message?.extendedTextMessage?.contextInfo;
	if (c?.mentionedJid?.length) return jidNormalizedUser(c.mentionedJid[0]);
	if (c?.participant) return jidNormalizedUser(c.participant);
	return '';
}

export default {
	name: 'group',
	desc: 'Group admin: tagall, hidetag, open/close, promote/demote/kick/add, linkgc, antilink, warn, dll.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		const chatJid = msg.key?.remoteJid || '';
		if (!chatJid.endsWith('@g.us')) return; // khusus grup
		const cfg = readConfig();
		const sender = senderJid(sock, msg);
		const text = getMessageText(msg);

		// Ambil metadata sekali (dipakai cek admin + beberapa command).
		let meta = null;
		try { meta = await sock.groupMetadata(chatJid); } catch { /* grup tidak bisa dibaca */ }
		const participants = meta?.participants || [];
		const isAdmin = p => ['admin', 'superadmin'].includes(p?.admin || '');
		const senderIsAdmin = msg.key.fromMe || participants.some(p => jidNormalizedUser(p.id) === sender && isAdmin(p));
		const botJid = jidNormalizedUser(sock.user?.id || '');
		const botIsAdmin = participants.some(p => jidNormalizedUser(p.id) === botJid && isAdmin(p));

		const reply = async (t, extra = {}) => sock.sendMessage(chatJid, { text: t, ...extra }, { quoted: msg });

		// ---- ANTILINK (berlaku untuk semua pesan non-admin) ----
		const gd = gdata(chatJid);
		if (gd.antilink && !msg.key.fromMe && !senderIsAdmin && text && /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/i.test(text)) {
			try {
				await sock.sendMessage(chatJid, { delete: msg.key });
				await sock.sendMessage(chatJid, {
					text: `🚫 @${sender.split('@')[0]} link grup lain *dilarang* di sini (antilink aktif). Pesannya sudah dihapus.`,
					mentions: [sender],
				});
				console.log(`[auto-lihat-status] antilink: hapus pesan ${sender} di ${chatJid.split('@')[0]}`);
			} catch (err) {
				console.error('[auto-lihat-status] antilink gagal (bot admin?):', err?.message || err);
			}
			return;
		}

		// ---- COMMAND ----
		const m = text && text.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		const args = (m[2] || '').trim();
		const COMMANDS = ['tagall', 'hidetag', 'open', 'close', 'promote', 'demote', 'kick', 'remove', 'add', 'linkgc', 'revoke', 'groupinfo', 'gcinfo', 'groupid', 'listadmin', 'botadmin', 'setsubject', 'setdesc', 'delete', 'del', 'antilink', 'warn', 'warnings', 'resetwarn'];
		if (!COMMANDS.includes(cmd)) return;
		// Semua command grup: owner atau admin grup (mode self: hanya owner).
		if (!msg.key.fromMe && (cfg.mode !== 'public' || !senderIsAdmin)) {
			if (cfg.mode === 'public') await reply('⛔ Command ini khusus *admin grup* ya.');
			return;
		}
		if (!meta) return reply('❌ Info grup tidak bisa dibaca saat ini.');

		try {
			switch (cmd) {
				case 'tagall': {
					// Nomor asli peserta (phoneNumber) didahulukan — di grup LID, id = @lid.
					const mentions = participants.map(p => p.phoneNumber || p.id);
					const list = participants.map((p, i) => `${i + 1}. @${(p.phoneNumber || p.id).split('@')[0]}`).join('\n');
					return reply(`📣 *TAG ALL*${args ? `\n${args}` : ''}\n\n${list}`, { mentions });
				}
				case 'hidetag': {
					const mentions = participants.map(p => p.phoneNumber || p.id);
					return sock.sendMessage(chatJid, { text: args || '📣 Ada pengumuman dari admin.', mentions });
				}
				case 'open':
					await sock.groupSettingUpdate(chatJid, 'not_announcement');
					return reply('🔓 Grup *dibuka* — semua anggota bisa kirim pesan.');
				case 'close':
					await sock.groupSettingUpdate(chatJid, 'announcement');
					return reply('🔒 Grup *ditutup* — hanya admin yang bisa kirim pesan.');
				case 'promote':
				case 'demote':
				case 'kick':
				case 'remove': {
					const target = targetJid(msg);
					if (!target) return reply(`Pakai: reply pesan orangnya atau tag dia — contoh: \`.${cmd} @orang\``);
					const action = cmd === 'promote' ? 'promote' : cmd === 'demote' ? 'demote' : 'remove';
					await sock.groupParticipantsUpdate(chatJid, [target], action);
					const label = { promote: 'dijadikan *admin* 👑', demote: 'diturunkan dari admin', remove: 'dikeluarkan dari grup 👋' }[action];
					return sock.sendMessage(chatJid, { text: `@${target.split('@')[0]} ${label}`, mentions: [target] });
				}
				case 'add': {
					const num = args.replace(/[^0-9]/g, '');
					if (!num) return reply('Pakai: `.add 628xxxx`');
					await sock.groupParticipantsUpdate(chatJid, [`${num}@s.whatsapp.net`], 'add');
					return reply(`✅ ${num} ditambahkan ke grup.`);
				}
				case 'linkgc': {
					const code = await sock.groupInviteCode(chatJid);
					return reply(`🔗 *Link grup ${meta.subject}*\nhttps://chat.whatsapp.com/${code}`);
				}
				case 'revoke': {
					await sock.groupRevokeInvite(chatJid);
					return reply('♻️ Link undangan grup sudah di-*reset*. Link lama tidak berlaku lagi.');
				}
				case 'groupinfo':
				case 'gcinfo': {
					const admins = participants.filter(isAdmin);
					return reply(
						`👥 *INFO GRUP*\n\n` +
							`Nama : ${meta.subject}\n` +
							`ID : ${chatJid}\n` +
							`Anggota : ${participants.length}\n` +
							`Admin : ${admins.length}\n` +
							`Bot admin : ${botIsAdmin ? 'Ya ✅' : 'Tidak ❌'}\n` +
							`Antilink : ${gd.antilink ? 'ON' : 'OFF'}\n` +
							(meta.desc ? `\nDeskripsi :\n${meta.desc}` : '')
					);
				}
				case 'groupid':
					return reply(`🆔 ID grup ini:\n\`${chatJid}\``);
				case 'listadmin': {
					const admins = participants.filter(isAdmin);
					if (!admins.length) return reply('Belum ada admin terbaca di grup ini.');
					return reply('👑 *ADMIN GRUP*\n\n' + admins.map((p, i) => `${i + 1}. @${(p.phoneNumber || p.id).split('@')[0]}${p.admin === 'superadmin' ? ' (pemilik grup)' : ''}`).join('\n'), { mentions: admins.map(p => p.phoneNumber || p.id) });
				}
				case 'botadmin':
					return reply(botIsAdmin ? '✅ Bot *admin* di grup ini — semua fitur admin bisa jalan.' : '❌ Bot *bukan admin* di grup ini. Jadikan bot admin dulu agar fitur admin (kick, antilink, dll) berfungsi.');
				case 'setsubject':
					if (!args) return reply('Pakai: `.setsubject Nama Grup Baru`');
					await sock.groupUpdateSubject(chatJid, args);
					return reply(`✅ Nama grup diganti jadi: *${args}*`);
				case 'setdesc':
					if (!args) return reply('Pakai: `.setdesc Deskripsi baru`');
					await sock.groupUpdateDescription(chatJid, args);
					return reply('✅ Deskripsi grup diganti.');
				case 'delete':
				case 'del': {
					const c = msg.message?.extendedTextMessage?.contextInfo;
					if (!c?.stanzaId) return reply('Reply dulu pesan yang mau dihapus, lalu ketik `.delete`');
					await sock.sendMessage(chatJid, { delete: { remoteJid: chatJid, fromMe: false, id: c.stanzaId, participant: c.participant } });
					return;
				}
				case 'antilink': {
					const on = args.toLowerCase();
					if (on === 'on') { gd.antilink = true; saveGrup(); return reply('🛡️ Antilink *ON* — pesan berisi link grup WA dari non-admin akan dihapus otomatis.'); }
					if (on === 'off') { gd.antilink = false; saveGrup(); return reply('🛡️ Antilink *OFF*.'); }
					return reply(`🛡️ Antilink saat ini: *${gd.antilink ? 'ON' : 'OFF'}*\nPakai: \`.antilink on\` / \`.antilink off\``);
				}
				case 'warn': {
					const target = targetJid(msg);
					if (!target) return reply('Pakai: reply pesan orangnya atau tag dia — contoh: `.warn @orang`');
					gd.warns[target] = (gd.warns[target] || 0) + 1;
					const count = gd.warns[target];
					if (count >= 3) {
						delete gd.warns[target]; saveGrup();
						await sock.groupParticipantsUpdate(chatJid, [target], 'remove');
						return sock.sendMessage(chatJid, { text: `⚠️ @${target.split('@')[0]} sudah kena *3x peringatan* dan dikeluarkan dari grup.`, mentions: [target] });
					}
					saveGrup();
					return sock.sendMessage(chatJid, { text: `⚠️ @${target.split('@')[0]} kena peringatan *${count}/3*. Sekali lagi sampai 3x akan dikeluarkan.`, mentions: [target] });
				}
				case 'warnings': {
					const entries = Object.entries(gd.warns);
					if (!entries.length) return reply('Tidak ada peringatan aktif di grup ini. 👍');
					return reply('⚠️ *DAFTAR PERINGATAN*\n\n' + entries.map(([j, c]) => `@${j.split('@')[0]} — ${c}/3`).join('\n'), { mentions: entries.map(([j]) => j) });
				}
				case 'resetwarn':
					gd.warns = {}; saveGrup();
					return reply('♻️ Semua peringatan di grup ini sudah di-reset.');
			}
		} catch (err) {
			return reply(`❌ Gagal: ${err?.message || err}\n(Pastikan bot jadi admin grup untuk aksi admin.)`);
		}
	},
};
