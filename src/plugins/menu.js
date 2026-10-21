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
	const botMode = cfg.mode === 'public' ? 'PUBLIC 🌐 (menu untuk semua)' : 'SELF 🔒 (khusus owner)';
	return (
		`╭━━━〔 👁️ *AUTO LIHAT STATUS* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ ⚡ Bot WhatsApp super-ringan\n` +
		`┃ 👑 *Creator :* Iyan\n` +
		`┃ 🤖 *Mode :* ${botMode}\n` +
		`┃ ⌨️ *Total Cmd :* 165\n` +
		`┃ 📡 *Status :* Online\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 👥 *MENU GRUP* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.welcome on\` / \`.welcome off\`\n` +
		`┃   ↳ Sambutan Grup : *${onOff(cfg.welcome)}*\n` +
		`┃     (foto anime: datang 👋 / pergi 🍂)\n` +
		`┃ • \`.simulatewelcome\` \`.simulategoodbye\`\n` +
		`┃   ↳ preview sambutan (owner/admin grup)\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 💤 *MENU AFK* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.afk <alasan>\` — aktifkan AFK\n` +
		`┃   ↳ nama + alasan + waktu tercatat\n` +
		`┃ • \`.afk off\` — matikan AFK\n` +
		`┃ • \`.afk cek\` — daftar yang sedang AFK\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🛡️ *MENU GRUP ADMIN* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.tagall\` \`.hidetag\` \`.groupinfo\`\n` +
		`┃ • \`.open\` \`.close\` \`.linkgc\` \`.revoke\`\n` +
		`┃ • \`.promote\` \`.demote\` \`.kick\` \`.add\`\n` +
		`┃ • \`.setsubject\` \`.setdesc\` \`.delete\`\n` +
		`┃ • \`.antilink on/off\` \`.warn\` \`.listadmin\`\n` +
		`┃ • \`.antispam on/off\` — spam chat\n` +
		`┃ • \`.antispamsticker on/off\` — spam stiker\n` +
		`┃ • \`.antispamfoto on/off\` — spam foto\n` +
		`┃   ↳ _khusus admin grup / owner_\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🤖 *MENU AI* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.ai <tanya>\` — chat AI (ingat konteks)\n` +
		`┃ • \`.imagine <deskripsi>\` — buat gambar AI\n` +
		`┃ • \`.resetai\` — hapus ingatan AI\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🎌 *MENU ANIMANGA* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.anime <judul>\` \`.animedetail <slug>\`\n` +
		`┃ • \`.samehadaku\` \`.kuramanime\` — cari anime\n` +
		`┃ • \`.jadwalanime\` \`.ongoing\`\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🔎 *MENU SEARCH & INFO* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.jadwalsholat <kota>\` \`.gempa\`\n` +
		`┃ • \`.cuaca <kota>\` \`.pinterest <kata>\`\n` +
		`┃ • \`.lirik <artis> - <judul>\` \`.search <kata>\`\n` +
		`┃ • \`.ytsearch <kata>\` — cari video YouTube\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 ⬇️ *MENU DOWNLOADER* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.play <judul lagu>\` — YouTube, pilih MP3/MP4\n` +
		`┃ • \`.tiktok <link>\` — video TT tanpa watermark\n` +
		`┃ • \`.tiktokmp3 <link>\` — audio dari TikTok\n` +
		`┃ • \`.facebook <link>\` \`.gdrive <link>\`\n` +
		`┃ • \`.capcut <link>\`\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 👤 *MENU PROFIL* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.profile\` — lihat profil (nama/gender/umur/bio)\n` +
		`┃ • \`.setname\` \`.setgender\` \`.setage\` \`.setbio\`\n` +
		`┃ • \`.getpp\` — foto profil WA seseorang\n` +
		`┃ • \`.level\` — level & XP kamu\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🎨 *MENU MEDIA* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.sticker\` — foto/video jadi sticker\n` +
		`┃ • \`.toimg\` \`.tomp3\` \`.tomp4\` — konversi media\n` +
		`┃ • \`.blur\` \`.pixelate\` \`.rotate\` \`.flip\`\n` +
		`┃   ↳ _reply media-nya dengan command_\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🎮 *MENU GAME* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.math\` \`.tebakangka\` \`.tictactoe\`\n` +
		`┃ • \`.tebakkata\` \`.susunkata\`\n` +
		`┃ • \`.asahotak\` \`.caklontong\` \`.stopgame\`\n` +
		`┃ • \`.chess\` — catur vs AI (gambar papan)\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🧰 *MENU TOOLS* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.b64\` \`.b32\` \`.hex\` \`.binary\`\n` +
		`┃ • \`.octal\` \`.ascii85\` (encode/decode)\n` +
		`┃ • \`.morse\` \`.rot13\` \`.atbash\`\n` +
		`┃ • \`.reverse\` \`.upper\` \`.lower\`\n` +
		`┃ • \`.calculator\` \`.roman\` \`.lorem\` \`.readmore\`\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🎉 *MENU FUN* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.dadu\` \`.koin\` \`.suit\` \`.cek\`\n` +
		`┃ • \`.kapan\` \`.seberapa\` — ramalan bot\n` +
		`┃ • \`.fact\` \`.roast\` \`.ship\` \`.jodoh\`\n` +
		`┃ • \`.cantik\` \`.ganteng\` \`.jodohku\` — acak di grup\n` +
		`┃ • \`.rating\` — penilaian anggota grup\n` +
		`┃ • \`.khodam\` \`.siapakah\` \`.undian\`\n` +
		`┃ • \`.truth\` \`.dare\` \`.bisakah\` \`.hoki\`\n` +
		`┃ • \`.pantun\` \`.artinama\`\n` +
		`┃ • \`.reaction\` — react pesan orang (reply)\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 🛰️ *MENU BOT* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.botinfo\` — info & statistik bot\n` +
		`┃ • \`.listgroup\` \`.upsw\` \`.setpp\` _(owner)_\n` +
		`┃ • \`.join <link>\` \`.leave\` _(owner)_\n` +
		`┃ \n` +
		`╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
		`╭━━━〔 📋 *MENU GENERAL* 〕━━━⬣\n` +
		`┃ \n` +
		`┃ • \`.ping\` \`.runtime\` \`.owner\`\n` +
		`┃ • \`.about\` \`.sc\`\n` +
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
