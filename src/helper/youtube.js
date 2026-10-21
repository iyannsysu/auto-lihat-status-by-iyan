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
 * helper/youtube.js — mesin YouTube untuk fitur play.
 * Diadaptasi dari bot utama (readsw) yang sudah terbukti jalan:
 *   1. Neoxr API untuk audio MP3 (server pihak ketiga, anti-block YouTube)
 *   2. yt-dlp multi-client (android -> ios -> web -> tv) untuk MP4 & cadangan MP3
 *   3. Cache lokal hasil unduhan per kata kunci (maks 50 file)
 *
 * Catatan server: yt-dlp (certifi) gagal verifikasi sertifikat lewat
 * proxy egress sandbox (CA proxy tidak dikenal certifi). Karena itu
 * setiap panggilan yang gagal dengan error CERTIFICATE dicoba ulang
 * sekali dengan --no-check-certificate (unduhan media saja).
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const MAX_DURATION = 20 * 60; // maks 20 menit untuk MP3

// Binary yt-dlp: env -> venv bot tiktok (lokasi lama readsw) -> PATH.
function resolveYtDlp() {
	if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
	const legacy = '/home/hatch/workspace/tiktokbot/venv/bin/yt-dlp';
	try { if (fs.existsSync(legacy)) return legacy; } catch { /* abaikan */ }
	return 'yt-dlp';
}
const YTDLP = resolveYtDlp();

// Neoxr API — key publik bawaan konfigurasi bot utama; ganti via env NEOXR_APIKEY.
const NEOXR_APIKEY = process.env.NEOXR_APIKEY || 'Fahridev12Z';
const NEOXR_BASE = 'https://api.neoxr.eu/api';

// Cache lagu per kata kunci (sama seperti readsw).
const CACHE_DIR = path.join(process.cwd(), 'downloads', 'ytcache');
const CACHE_MAX = 50;

function cacheKey(query) {
	return query.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
}
function getCached(query) {
	try {
		if (!fs.existsSync(CACHE_DIR)) return null;
		const key = cacheKey(query);
		const files = fs.readdirSync(CACHE_DIR).filter(f => f.startsWith(key + '__'));
		if (!files.length) return null;
		const file = path.join(CACHE_DIR, files[0]);
		if (fs.statSync(file).size < 20 * 1024) return null;
		const now = new Date();
		fs.utimesSync(file, now, now);
		const title = files[0].slice(key.length + 2, -4).replace(/_/g, ' ');
		return { file, title };
	} catch { return null; }
}
function putCache(query, srcFile, title) {
	try {
		if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
		const key = cacheKey(query);
		const safeTitle = (title || 'audio').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_').slice(0, 50) || 'audio';
		fs.copyFileSync(srcFile, path.join(CACHE_DIR, `${key}__${safeTitle}.mp3`));
		const files = fs.readdirSync(CACHE_DIR)
			.map(f => ({ f, t: fs.statSync(path.join(CACHE_DIR, f)).mtimeMs }))
			.sort((a, b) => a.t - b.t);
		while (files.length > CACHE_MAX) {
			const old = files.shift();
			try { fs.unlinkSync(path.join(CACHE_DIR, old.f)); } catch { /* abaikan */ }
		}
	} catch { /* abaikan */ }
}

const CLIENTS = ['android', 'ios', 'web', 'tv'];

/** Jalankan yt-dlp; bila gagal soal sertifikat, ulang sekali dengan flag-nya. */
async function runYtDlp(args, timeout) {
	try {
		return await execFileAsync(YTDLP, args, { timeout });
	} catch (e) {
		const msg = `${e?.message || ''} ${e?.stderr || ''}`;
		if (/CERTIFICATE/i.test(msg) && !args.includes('--no-check-certificate')) {
			return execFileAsync(YTDLP, ['--no-check-certificate', ...args], { timeout });
		}
		throw e;
	}
}

/** Panggil Neoxr /play — metadata + URL audio sekaligus. */
export async function neoxrPlay(query) {
	const res = await fetch(`${NEOXR_BASE}/play?q=${encodeURIComponent(query)}&apikey=${NEOXR_APIKEY}`, {
		headers: { 'User-Agent': UA },
		signal: AbortSignal.timeout(30000),
	});
	if (!res.ok) throw new Error(`Neoxr HTTP ${res.status}`);
	const data = await res.json();
	if (!data?.status || !data?.id) throw new Error('Neoxr: hasil tidak ditemukan');
	return data;
}

/** Unduh audio MP3 lewat Neoxr ke folder tmp. */
async function downloadViaNeoxr(query, tmpDir) {
	const data = await neoxrPlay(query);
	const duration = data.duration_seconds || 0;
	if (duration > MAX_DURATION) throw new Error(`Kepanjangan (${Math.round(duration / 60)} mnt), maksimal 20 menit.`);
	if (!data?.data?.url) throw new Error('Neoxr: tidak ada URL audio');
	const mediaRes = await fetch(data.data.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
	if (!mediaRes.ok) throw new Error(`Neoxr download HTTP ${mediaRes.status}`);
	const buffer = Buffer.from(await mediaRes.arrayBuffer());
	if (buffer.length < 20 * 1024) throw new Error('Neoxr: file terlalu kecil');
	const safeTitle = (data.title || 'audio').replace(/[\\/:*?"<>|]/g, '').slice(0, 80) || 'audio';
	const file = path.join(tmpDir, `${safeTitle}.mp3`);
	fs.writeFileSync(file, buffer);
	return { file, title: data.title || query, duration };
}

/** Unduh audio MP3 dari videoId via yt-dlp, coba tiap client. */
export async function downloadYouTubeAudioById(videoId, tmpDir) {
	const url = `https://www.youtube.com/watch?v=${videoId}`;
	const errors = [];
	for (const client of CLIENTS) {
		try {
			await runYtDlp([
				'--no-playlist', '--no-warnings',
				'--extractor-args', `youtube:player_client=${client}`,
				'--retries', '2', '--socket-timeout', '30',
				'--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
				'-o', path.join(tmpDir, '%(id)s.%(ext)s'),
				url,
			], 600000);
			const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3'));
			if (!files.length) throw new Error('mp3 tidak terbuat');
			const file = path.join(tmpDir, files[0]);
			if (fs.statSync(file).size < 20 * 1024) throw new Error('file terlalu kecil');
			return file;
		} catch (e) {
			errors.push(`${client}: ${(e.message || '').split('\n')[0]}`);
		}
	}
	throw new Error('Semua client gagal: ' + errors.join(' | ').slice(0, 200));
}

/**
 * Unduh MP3 dari kata kunci: cache -> Neoxr -> yt-dlp by ID.
 * @returns {Promise<{file: string, title: string, duration: number, cached?: boolean}>}
 */
export async function downloadYouTubeAudio(query, known) {
	const cached = getCached(query);
	if (cached) return { file: cached.file, title: cached.title, duration: 0, cached: true };
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
	const errors = [];
	try {
		const result = await downloadViaNeoxr(query, tmpDir);
		putCache(query, result.file, result.title);
		return result;
	} catch (e) {
		errors.push(`neoxr: ${(e.message || '').slice(0, 80)}`);
		if (/^Kepanjangan/.test(e.message)) throw e;
	}
	try {
		const videoId = known?.id || (await neoxrPlay(query)).id;
		const file = await downloadYouTubeAudioById(videoId, tmpDir);
		return { file, title: known?.title || query, duration: known?.duration || 0 };
	} catch (e) {
		fs.rmSync(tmpDir, { recursive: true, force: true });
		errors.push(`ytdlp: ${(e.message || '').slice(0, 80)}`);
		throw new Error('Gagal mengunduh audio (' + errors.join(' | ').slice(0, 150) + '). Coba lagi atau ganti kata kunci.');
	}
}

/** Unduh video MP4 (maks 360p) dari videoId via yt-dlp multi-client. */
export async function downloadYouTubeVideo(videoId, tmpDir) {
	const url = `https://www.youtube.com/watch?v=${videoId}`;
	const errors = [];
	for (const client of CLIENTS) {
		try {
			await runYtDlp([
				'--no-playlist', '--no-warnings',
				'--extractor-args', `youtube:player_client=${client}`,
				'--retries', '2', '--socket-timeout', '30',
				'-f', 'bestvideo[height<=360]+bestaudio/best[height<=360]/best',
				'--merge-output-format', 'mp4',
				'--postprocessor-args', 'ffmpeg:-c:v libx264 -c:a aac -movflags +faststart -preset veryfast -crf 28',
				'-o', path.join(tmpDir, '%(id)s.%(ext)s'),
				url,
			], 600000);
			const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp4'));
			if (!files.length) throw new Error('mp4 tidak terbuat');
			const file = path.join(tmpDir, files[0]);
			if (fs.statSync(file).size < 50 * 1024) throw new Error('file terlalu kecil');
			return file;
		} catch (e) {
			errors.push(`${client}: ${(e.message || '').split('\n')[0]}`);
		}
	}
	throw new Error('Semua client gagal: ' + errors.join(' | ').slice(0, 200));
}
