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
 * plugins/play.js — PLAY: cari lagu/video YouTube, pilih MP3/MP4.
 * Diadaptasi dari fitur play bot utama (readsw):
 *   .play <judul>  -> kartu thumbnail + info, lalu balas:
 *   1 = audio MP3 (Neoxr, cadangan yt-dlp)  •  2 = video MP4 maks 360p (yt-dlp)
 * Pilihan berlaku 5 menit, per pengirim. MP4 maksimal 5 menit.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readConfig, getMessageText } from '../helper/config.js';
import { neoxrPlay, downloadYouTubeAudio, downloadYouTubeVideo } from '../helper/youtube.js';

// pengirim (digit nomor) -> { videoId, title, duration, query, ts }
const playChoices = new Map();
const CHOICE_TTL = 5 * 60 * 1000;
const MAX_VIDEO_SEC = 300;

function numOf(jid) {
	if (!jid) return '';
	const s = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
	return s.startsWith('0') ? '62' + s.slice(1) : s;
}
function fmtDuration(sec) {
	if (!sec || sec <= 0) return '?';
	return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}
function safeName(title) {
	return (title || 'audio').replace(/[\\/:*?"<>|]/g, '').slice(0, 80) || 'audio';
}

export default {
	name: 'play',
	desc: 'Play: cari YouTube (.play judul) lalu balas 1=MP3 / 2=MP4.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		const chatJid = msg.key.remoteJid;
		if (!chatJid || chatJid === 'status@broadcast') return;
		const cfg = readConfig();
		const senderRaw = msg.key.participant || chatJid;
		const sender = numOf(senderRaw);
		if (!sender) return;
		const isOwner = !!msg.key.fromMe;
		const allowed = isOwner || cfg.mode === 'public';
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });
		const raw = getMessageText(msg) || '';

		// --- Balasan pilihan 1 / 2 (teks polos) untuk sesi play pengirim ini ---
		const choice = raw.trim();
		if ((choice === '1' || choice === '2') && playChoices.has(sender)) {
			const entry = playChoices.get(sender);
			if (Date.now() - entry.ts > CHOICE_TTL) {
				playChoices.delete(sender);
			} else if (allowed) {
				if (choice === '2' && entry.duration > MAX_VIDEO_SEC) {
					return reply(`❌ Durasi kepanjangan (${fmtDuration(entry.duration)}).\nMaksimal 5 menit untuk MP4.\n\nBalas *1* aja buat versi MP3-nya 🎧`);
				}
				playChoices.delete(sender); // klaim — cegah double
				if (choice === '1') {
					await reply(`⏳ Mengunduh MP3 *${entry.title}* ...`);
					try {
						const res = await downloadYouTubeAudio(entry.query, { id: entry.videoId, title: entry.title, duration: entry.duration });
						const data = fs.readFileSync(res.file);
						const fileName = `${safeName(res.title)}.mp3`;
						if (data.length > 100 * 1024 * 1024) {
							await sock.sendMessage(chatJid, { document: data, fileName, mimetype: 'audio/mpeg' }, { quoted: msg });
						} else {
							await sock.sendMessage(chatJid, { audio: data, mimetype: 'audio/mpeg', fileName, ptt: false }, { quoted: msg });
						}
						if (!res.cached && res.file.startsWith(os.tmpdir())) {
							try { fs.rmSync(path.dirname(res.file), { recursive: true, force: true }); } catch { /* abaikan */ }
						}
					} catch (err) {
						await reply(`❌ ${err?.message || 'Gagal mengunduh audio.'}`);
					}
				} else {
					await reply(`⏳ Mengunduh MP4 *${entry.title}* ...`);
					const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'play-'));
					try {
						const file = await downloadYouTubeVideo(entry.videoId, tmpDir);
						const data = fs.readFileSync(file);
						const fileName = `${safeName(entry.title)}.mp4`;
						if (data.length > 100 * 1024 * 1024) {
							await sock.sendMessage(chatJid, { document: data, fileName, mimetype: 'video/mp4', caption: `🎬 *${entry.title}*` }, { quoted: msg });
						} else {
							await sock.sendMessage(chatJid, { video: data, mimetype: 'video/mp4', caption: `🎬 *${entry.title}*` }, { quoted: msg });
						}
					} catch (err) {
						await reply(`❌ ${err?.message || 'Gagal mengunduh video.'}`);
					} finally {
						try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* abaikan */ }
					}
				}
				return;
			}
		}

		// --- Command .play ---
		const m = raw.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		if (cmd !== 'play' && cmd !== 'playvid') return;
		if (!allowed) return;
		const query = (m[2] || '').trim();
		if (!query) return reply('Kasih judul lagunya. Contoh: `.play dj indo terbaru`');

		try {
			const v = await neoxrPlay(query);
			playChoices.set(sender, {
				videoId: v.id,
				title: v.title || query,
				duration: v.duration_seconds || 0,
				query,
				ts: Date.now(),
			});
			const caption =
				`🎵 *${v.title || query}*\n` +
				`👤 ${v.channel || '-'}\n` +
				`⏱️ Durasi: ${v.duration || fmtDuration(v.duration_seconds || 0)}${v.views ? ` • 👁️ ${v.views}` : ''}\n\n` +
				`Balas pesan ini:\n*1* — Audio MP3 🎧\n*2* — Video MP4 🎬\n\n_(pilihan berlaku 5 menit)_`;
			if (v.thumbnail) {
				try {
					return await sock.sendMessage(chatJid, { image: { url: v.thumbnail }, caption }, { quoted: msg });
				} catch { /* kirim teks saja */ }
			}
			return reply(caption);
		} catch (err) {
			return reply(`❌ ${err?.message || 'Gagal mencari.'}`);
		}
	},
};
