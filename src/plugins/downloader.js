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
 * plugins/downloader.js — DOWNLOADER (sumber sudah DITES dari server ini).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .tiktok <link>     unduh video TikTok TANPA watermark (sumber: tikwm)
 *   .tiktokmp3 <link>  unduh audio/mp3 dari video TikTok
 *   .facebook <link>   unduh video Facebook (sumber: siputzx)
 *   .gdrive <link>     unduh file Google Drive publik (sumber: siputzx)
 *   .capcut <link>     unduh video template CapCut (sumber: siputzx)
 *
 * Yang TIDAK dipasang (sudah dites 2026-10-21, tidak ada sumber yang
 * berfungsi dari server ini): Instagram (semua API publik mati/butuh
 * kunci), Twitter/X (upstream siputzx gagal total), MediaFire (belum
 * ada file contoh untuk membuktikan parser scrape-nya).
 */
import { readConfig, getMessageText } from '../helper/config.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchJson(url, opts = {}) {
	const res = await fetch(url, { headers: { 'User-Agent': UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(30_000), ...opts });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

/** Cari URL .mp4 pertama di dalam objek JSON (untuk bentuk respons tak tentu). */
function findMp4(obj, depth = 0) {
	if (!obj || depth > 5) return '';
	if (typeof obj === 'string') return /^https?:\/\/\S+\.mp4(\?\S*)?$/i.test(obj) ? obj : '';
	if (Array.isArray(obj)) { for (const v of obj) { const r = findMp4(v, depth + 1); if (r) return r; } return ''; }
	for (const v of Object.values(obj)) { const r = findMp4(v, depth + 1); if (r) return r; }
	return '';
}

export default {
	name: 'downloader',
	desc: 'Downloader: tiktok (tanpa watermark), tiktokmp3, facebook, gdrive, capcut.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe && readConfig().mode !== 'public') return;
		const raw = getMessageText(msg);
		if (!raw) return;
		const m = raw.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		const link = (m[2] || '').trim().split(/\s+/)[0];
		const chatJid = msg.key.remoteJid;
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });
		const COMMANDS = ['tiktok', 'tt', 'tiktokmp3', 'ttmp3', 'facebook', 'fb', 'gdrive', 'gd', 'capcut'];
		if (!COMMANDS.includes(cmd)) return;
		if (!/^https?:\/\//i.test(link)) return reply(`Pakai: \`.${cmd} <link>\``);

		try {
			await reply('⏳ Sebentar, lagi diproses...');
			if (cmd === 'tiktok' || cmd === 'tt' || cmd === 'tiktokmp3' || cmd === 'ttmp3') {
				const body = new URLSearchParams({ url: link, hd: '1' });
				const json = await fetchJson('https://www.tikwm.com/api/', { method: 'POST', body });
				const d = json?.data;
				if (json?.code !== 0 || !d) throw new Error(json?.msg || 'respons TikTok kosong');
				if (cmd === 'tiktokmp3' || cmd === 'ttmp3') {
					if (!d.music) throw new Error('audio tidak ditemukan');
					return sock.sendMessage(chatJid, { audio: { url: d.music }, mimetype: 'audio/mpeg' }, { quoted: msg });
				}
				const video = d.hdplay || d.play;
				if (!video) throw new Error('video tidak ditemukan');
				return sock.sendMessage(chatJid, {
					video: { url: video },
					caption: `🎵 *TikTok*\n${d.title || ''}\n👤 ${d.author?.nickname || ''} (@${d.author?.unique_id || ''})\n\n_Diunduh via auto lihat status by iyan_`,
				}, { quoted: msg });
			}
			if (cmd === 'facebook' || cmd === 'fb') {
				const json = await fetchJson(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(link)}`);
				const downloads = json?.data?.downloads || [];
				const videos = downloads.filter(x => x.type === 'video' && x.url);
				if (!json?.status || !videos.length) throw new Error('video Facebook tidak ditemukan');
				videos.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
				return sock.sendMessage(chatJid, {
					video: { url: videos[0].url },
					caption: `📘 *Facebook Video*\nKualitas: ${videos[0].quality || '-'}\n\n_Diunduh via auto lihat status by iyan_`,
				}, { quoted: msg });
			}
			if (cmd === 'gdrive' || cmd === 'gd') {
				const json = await fetchJson(`https://api.siputzx.my.id/api/d/gdrive?url=${encodeURIComponent(link)}`);
				const d = json?.data;
				if (!json?.status || !d?.download) throw new Error('file Drive tidak ditemukan / tidak publik');
				return sock.sendMessage(chatJid, {
					document: { url: d.download },
					fileName: d.name || 'file-gdrive',
					caption: `📁 *Google Drive*\n${d.name || ''}\n\n_Diunduh via auto lihat status by iyan_`,
				}, { quoted: msg });
			}
			if (cmd === 'capcut') {
				const json = await fetchJson(`https://api.siputzx.my.id/api/d/capcut?url=${encodeURIComponent(link)}`);
				const video = findMp4(json?.data);
				if (!json?.status || !video) throw new Error('video CapCut tidak ditemukan');
				return sock.sendMessage(chatJid, {
					video: { url: video },
					caption: `🎬 *CapCut*\n${json.data?.title || json.data?.description || ''}\n\n_Diunduh via auto lihat status by iyan_`,
				}, { quoted: msg });
			}
		} catch (err) {
			return reply(`❌ Gagal mengunduh: ${err?.message || err}\nCek lagi link-nya (harus publik), atau sumber unduhannya lagi gangguan.`);
		}
	},
};
