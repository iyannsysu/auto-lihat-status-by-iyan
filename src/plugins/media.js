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
 * plugins/media.js — MEDIA tools berbasis ffmpeg (lokal, tanpa internet).
 *
 * Cara pakai: reply (quote) sebuah foto/video/sticker dengan command,
 * atau kirim media-nya langsung dengan caption command-nya.
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .sticker        foto/video (maks 10 dtk) -> sticker WA
 *   .toimg          sticker -> gambar PNG
 *   .tomp3          video -> audio MP3
 *   .tomp4          sticker animasi -> video MP4
 *   .blur           efek blur pada foto
 *   .pixelate       efek pixel pada foto
 *   .rotate 90|180|270  putar foto
 *   .flip h|v       balik foto (horizontal / vertikal)
 */
import { execFile } from 'node:child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { downloadMediaMessage } from 'baileys';
import { readConfig, getMessageText } from '../helper/config.js';

function runFfmpeg(args, timeoutMs = 90_000) {
	return new Promise((resolve, reject) => {
		execFile('ffmpeg', ['-y', '-loglevel', 'error', ...args], { timeout: timeoutMs }, (err, stdout, stderr) => {
			if (err) reject(new Error((stderr || err.message || 'ffmpeg gagal').toString().slice(0, 300)));
			else resolve();
		});
	});
}

let tmpSeq = 0;
async function convert(buffer, inExt, outExt, args) {
	const id = `${process.pid}-${Date.now()}-${++tmpSeq}`;
	const inFile = path.join(os.tmpdir(), `als-in-${id}.${inExt}`);
	const outFile = path.join(os.tmpdir(), `als-out-${id}.${outExt}`);
	fs.writeFileSync(inFile, buffer);
	try {
		await runFfmpeg(['-i', inFile, ...args, outFile]);
		return fs.readFileSync(outFile);
	} finally {
		try { fs.unlinkSync(inFile); } catch { /* abaikan */ }
		try { fs.unlinkSync(outFile); } catch { /* abaikan */ }
	}
}

const STICKER_VF = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba';

export const _media = {
	imageToSticker: buf => convert(buf, 'bin', 'webp', ['-vf', STICKER_VF, '-c:v', 'libwebp', '-q:v', '80', '-preset', 'default', '-an']),
	videoToSticker: buf => convert(buf, 'mp4', 'webp', ['-t', '10', '-vf', `${STICKER_VF},fps=15`, '-c:v', 'libwebp', '-q:v', '70', '-preset', 'default', '-an', '-loop', '0']),
	stickerToImage: buf => convert(buf, 'webp', 'png', ['-frames:v', '1']),
	videoToMp3: buf => convert(buf, 'mp4', 'mp3', ['-vn', '-c:a', 'libmp3lame', '-q:a', '2']),
	stickerToVideo: buf => convert(buf, 'webp', 'mp4', ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2']),
	blurImage: buf => convert(buf, 'bin', 'jpg', ['-vf', 'boxblur=12:2']),
	pixelateImage: buf => convert(buf, 'bin', 'jpg', ['-vf', 'scale=iw/12:ih/12,scale=iw*12:ih*12:flags=neighbor']),
	rotateImage: (buf, deg) => {
		const vf = deg === 90 ? 'transpose=clock' : deg === 270 ? 'transpose=cclock' : 'hflip,vflip';
		return convert(buf, 'bin', 'jpg', ['-vf', vf]);
	},
	flipImage: (buf, dir) => convert(buf, 'bin', 'jpg', ['-vf', dir === 'v' ? 'vflip' : 'hflip']),
};

/** Ambil buffer media dari pesan ini atau pesan yang di-reply. */
async function getMedia(sock, msg) {
	const m = msg.message || {};
	const chatJid = msg.key.remoteJid;
	const kindOf = mm => (mm?.imageMessage ? 'image' : mm?.videoMessage ? 'video' : mm?.stickerMessage ? 'sticker' : mm?.audioMessage ? 'audio' : '');
	let target = msg;
	let kind = kindOf(m);
	if (!kind) {
		const q = m.extendedTextMessage?.contextInfo;
		if (q?.quotedMessage && kindOf(q.quotedMessage)) {
			kind = kindOf(q.quotedMessage);
			target = { key: { remoteJid: chatJid, id: q.stanzaId, participant: q.participant, fromMe: false }, message: q.quotedMessage };
		}
	}
	if (!kind) return null;
	const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
	return { buffer, kind };
}

export default {
	name: 'media',
	desc: 'Media ffmpeg: sticker, toimg, tomp3, tomp4, blur, pixelate, rotate, flip.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe && readConfig().mode !== 'public') return;
		const raw = getMessageText(msg);
		if (!raw) return;
		const m = raw.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		const args = (m[2] || '').trim().toLowerCase();
		const chatJid = msg.key.remoteJid;
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });
		const COMMANDS = ['sticker', 's', 'toimg', 'tomp3', 'tomp4', 'blur', 'pixelate', 'rotate', 'flip'];
		if (!COMMANDS.includes(cmd)) return;

		let media;
		try {
			media = await getMedia(sock, msg);
		} catch (err) {
			return reply(`❌ Media-nya gagal diunduh: ${err?.message || err}\nCoba kirim ulang media-nya ya.`);
		}
		if (!media) return reply('Reply dulu foto/video/sticker-nya dengan command ini, atau kirim media-nya dengan caption command-nya.');

		try {
			await reply('⏳ Lagi diproses...');
			if (cmd === 'sticker' || cmd === 's') {
				if (media.kind === 'image') return sock.sendMessage(chatJid, { sticker: await _media.imageToSticker(media.buffer) }, { quoted: msg });
				if (media.kind === 'video') return sock.sendMessage(chatJid, { sticker: await _media.videoToSticker(media.buffer) }, { quoted: msg });
				return reply('Yang bisa jadi sticker cuma foto atau video ya.');
			}
			if (cmd === 'toimg') {
				if (media.kind !== 'sticker') return reply('.toimg khusus buat sticker — reply sticker-nya ya.');
				return sock.sendMessage(chatJid, { image: await _media.stickerToImage(media.buffer), caption: '🖼️ Sticker jadi gambar.' }, { quoted: msg });
			}
			if (cmd === 'tomp3') {
				if (media.kind !== 'video' && media.kind !== 'audio') return reply('.tomp3 butuh video — reply video-nya ya.');
				return sock.sendMessage(chatJid, { audio: await _media.videoToMp3(media.buffer), mimetype: 'audio/mpeg' }, { quoted: msg });
			}
			if (cmd === 'tomp4') {
				if (media.kind !== 'sticker') return reply('.tomp4 khusus buat sticker — reply sticker-nya ya.');
				return sock.sendMessage(chatJid, { video: await _media.stickerToVideo(media.buffer), caption: '🎬 Sticker jadi video.' }, { quoted: msg });
			}
			if (cmd === 'blur' || cmd === 'pixelate' || cmd === 'rotate' || cmd === 'flip') {
				if (media.kind !== 'image') return reply('Efek ini khusus foto — reply foto-nya ya.');
				if (cmd === 'blur') return sock.sendMessage(chatJid, { image: await _media.blurImage(media.buffer), caption: '🌫️ Efek blur.' }, { quoted: msg });
				if (cmd === 'pixelate') return sock.sendMessage(chatJid, { image: await _media.pixelateImage(media.buffer), caption: '🧩 Efek pixelate.' }, { quoted: msg });
				if (cmd === 'rotate') {
					const deg = [90, 180, 270].includes(Number(args)) ? Number(args) : 90;
					return sock.sendMessage(chatJid, { image: await _media.rotateImage(media.buffer, deg), caption: `🔄 Diputar ${deg}°.` }, { quoted: msg });
				}
				const dir = args === 'v' ? 'v' : 'h';
				return sock.sendMessage(chatJid, { image: await _media.flipImage(media.buffer, dir), caption: `🪞 Dibalik ${dir === 'v' ? 'vertikal' : 'horizontal'}.` }, { quoted: msg });
			}
		} catch (err) {
			return reply(`❌ Gagal memproses media: ${err?.message || err}`);
		}
	},
};
