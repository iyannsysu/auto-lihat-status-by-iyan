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
 * plugins/ai.js — AI chat & gambar (sumber: Pollinations, DITES live).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .ai <pertanyaan>     chat AI (ingat konteks obrolan di chat ini)
 *   .imagine <deskripsi> buat gambar AI dari teks (alias .img)
 *   .resetai             hapus ingatan obrolan AI di chat ini
 */
import { readConfig, getMessageText } from '../helper/config.js';

const SYSTEM = 'Kamu adalah asisten AI di bot WhatsApp "auto lihat status by iyan" buatan Iyan. Jawab dalam Bahasa Indonesia yang ramah, jelas, dan ringkas, kecuali pengguna meminta bahasa lain.';
const histories = new Map(); // chatJid -> [{role, content}] (maks 8 pesan terakhir)

export default {
	name: 'ai',
	desc: 'AI: .ai (chat Pollinations), .imagine (gambar AI), .resetai.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		if (!msg.key.fromMe && readConfig().mode !== 'public') return;
		const raw = getMessageText(msg);
		if (!raw) return;
		const m = raw.match(/^[./!]([a-z0-9]+)\b([\s\S]*)$/i);
		if (!m) return;
		const cmd = m[1].toLowerCase();
		const args = (m[2] || '').trim();
		const chatJid = msg.key.remoteJid;
		const reply = async text => sock.sendMessage(chatJid, { text }, { quoted: msg });
		if (!['ai', 'gpt', 'imagine', 'img', 'resetai'].includes(cmd)) return;

		if (cmd === 'resetai') {
			histories.delete(chatJid);
			return reply('🧹 Ingatan obrolan AI di chat ini sudah dihapus.');
		}
		if (!args) return reply(cmd === 'imagine' || cmd === 'img' ? 'Pakai: `.imagine kucing astronot lucu`' : 'Pakai: `.ai pertanyaanmu`');

		try {
			if (cmd === 'imagine' || cmd === 'img') {
				await reply('🎨 Sebentar, gambarnya lagi dibuat...');
				const seed = Math.floor(Math.random() * 1_000_000);
				const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(args)}?width=1024&height=1024&seed=${seed}&nologo=true`;
				return sock.sendMessage(chatJid, { image: { url }, caption: `🎨 *Imagine AI*\n"${args}"\n\n_Sumber: Pollinations_` }, { quoted: msg });
			}
			// .ai / .gpt — chat dengan ingatan konteks per chat
			const history = histories.get(chatJid) || [];
			const messages = [
				{ role: 'system', content: SYSTEM },
				...history,
				{ role: 'user', content: args },
			];
			const res = await fetch('https://text.pollinations.ai/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages }),
				signal: AbortSignal.timeout(60_000),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const answer = (await res.text()).trim();
			if (!answer) throw new Error('jawaban AI kosong');
			history.push({ role: 'user', content: args }, { role: 'assistant', content: answer.slice(0, 2000) });
			histories.set(chatJid, history.slice(-8));
			return reply(answer.length > 4000 ? answer.slice(0, 4000) + '\n\n_(dipotong)_' : answer);
		} catch (err) {
			return reply(`❌ AI lagi gangguan: ${err?.message || err}\nCoba lagi sebentar ya.`);
		}
	},
};
