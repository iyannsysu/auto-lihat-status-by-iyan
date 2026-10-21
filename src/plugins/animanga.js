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
 * plugins/animanga.js — ANIMANGA (sumber: AsunaSA API, API anime
 * buatan Iyan sendiri — DITES live 2026-10-21).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .anime / .otakudesu <judul>   cari anime (Otakudesu)
 *   .animedetail <slug>           detail anime + daftar episode
 *   .samehadaku <judul>           cari anime (Samehadaku)
 *   .kuramanime <judul>           cari anime (Kuramanime)
 *   .jadwalanime [hari]           jadwal rilis (default: hari ini)
 *   .ongoing                      anime ongoing terbaru
 *
 * Kuramanime dari IP Vercel kena 403 di sumbernya, jadi jalurnya
 * dicoba ke API lokal server ini dulu (127.0.0.1:20250), baru Vercel.
 */
import { readConfig, getMessageText } from '../helper/config.js';

const BASES = ['https://asunasa-api.vercel.app', 'http://127.0.0.1:20250'];
const KURAMA_BASES = ['http://127.0.0.1:20250', 'https://asunasa-api.vercel.app'];

async function apiGet(path, bases = BASES) {
	let lastErr = null;
	for (const base of bases) {
		try {
			const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30_000) });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			if (json?.status) return json;
			lastErr = new Error(json?.message || 'status false');
		} catch (err) { lastErr = err; }
	}
	throw lastErr || new Error('API tidak merespons');
}

/** Judul Kuramanime kadang kotor ("6.10 SELESAI Loading...") — rapikan dari slug. */
function cleanTitle(item) {
	const t = String(item?.title || '');
	if (/loading/i.test(t) || /^\d+\.\d+\s/.test(t)) {
		return String(item.slug || 'Tanpa judul').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
	}
	return t.replace(/\s*Subtitle Indonesia\s*$/i, '');
}

function renderList(items, limit = 8) {
	return items.slice(0, limit).map((it, i) => {
		const extra = [it.episode, it.release_day, it.release_date].filter(Boolean).join(' • ');
		return `${i + 1}. *${cleanTitle(it)}*${extra ? `\n   ${extra}` : ''}\n   slug: \`${it.slug}\``;
	}).join('\n');
}

const HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export default {
	name: 'animanga',
	desc: 'Animanga via AsunaSA API: anime/otakudesu, animedetail, samehadaku, kuramanime, jadwalanime, ongoing.',

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
		const COMMANDS = ['anime', 'otakudesu', 'animedetail', 'samehadaku', 'kuramanime', 'jadwalanime', 'jadwal', 'ongoing'];
		if (!COMMANDS.includes(cmd)) return;

		try {
			if (cmd === 'anime' || cmd === 'otakudesu' || cmd === 'samehadaku' || cmd === 'kuramanime') {
				if (!args) return reply(`Pakai: \`.${cmd} <judul anime>\``);
				const source = cmd === 'anime' || cmd === 'otakudesu' ? '' : cmd;
				const path = source ? `/${source}/search?q=${encodeURIComponent(args)}` : `/search?q=${encodeURIComponent(args)}`;
				const json = await apiGet(path, source === 'kuramanime' ? KURAMA_BASES : BASES);
				const items = Array.isArray(json.data) ? json.data : json.data?.list || [];
				if (!items.length) throw new Error(`anime "${args}" tidak ditemukan`);
				const label = source ? source[0].toUpperCase() + source.slice(1) : 'Otakudesu';
				const caption = `🔎 *${label} — "${args}"*\n\n${renderList(items)}\n\n_Lihat detail: \`.animedetail <slug>\` (khusus Otakudesu)_`;
				const poster = items[0]?.poster;
				if (poster && !source) {
					try { return sock.sendMessage(chatJid, { image: { url: poster }, caption }, { quoted: msg }); } catch { /* teks saja */ }
				}
				return reply(caption);
			}
			if (cmd === 'animedetail') {
				if (!args) return reply('Pakai: `.animedetail <slug>` — slug ada di hasil `.anime`');
				const json = await apiGet(`/anime/${encodeURIComponent(args.split(/\s+/)[0])}`);
				const d = json.data;
				if (!d) throw new Error('detail tidak ditemukan');
				const info = d.info || {};
				const eps = (d.episodes || []).slice(0, 5).map((e, i) => `${i + 1}. ${e.title}`).join('\n');
				const caption =
					`🎌 *${cleanTitle(d)}*\n\n` +
					`⭐ Skor : ${info.skor || '-'}\n📌 Status : ${info.status || '-'}\n🎞️ Tipe : ${info.tipe || '-'} • ${info.total_episode || '?'} episode • ${info.durasi || '-'}\n🏢 Studio : ${info.studio || '-'}\n📅 Rilis : ${info.tanggal_rilis || '-'}\n🎭 Genre : ${(d.genres || []).map(g => g.name).join(', ') || info.genre || '-'}\n` +
					(d.synopsis ? `\n📖 Sinopsis :\n${String(d.synopsis).slice(0, 600)}\n` : '') +
					(eps ? `\n📺 Episode terbaru:\n${eps}` : '');
				if (d.poster) {
					try { return sock.sendMessage(chatJid, { image: { url: d.poster }, caption }, { quoted: msg }); } catch { /* teks saja */ }
				}
				return reply(caption);
			}
			if (cmd === 'jadwalanime' || cmd === 'jadwal') {
				const json = await apiGet('/schedule');
				const data = json.data || {};
				let day = args.toLowerCase();
				if (!HARI.includes(day)) {
					const jakartaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
					day = HARI[jakartaDate.getDay()];
				}
				const items = data[day] || [];
				if (!items.length) return reply(`Tidak ada jadwal rilis untuk hari *${day}* di data Otakudesu.`);
				return reply(`📅 *JADWAL ANIME — ${day.toUpperCase()}*\n\n${items.slice(0, 15).map((it, i) => `${i + 1}. ${cleanTitle(it)}`).join('\n')}\n\n_Sumber: Otakudesu via AsunaSA API_`);
			}
			if (cmd === 'ongoing') {
				const json = await apiGet('/ongoing');
				const items = json.data?.list || [];
				if (!items.length) throw new Error('daftar ongoing kosong');
				return reply(`🔥 *ANIME ONGOING TERBARU*\n\n${renderList(items, 10)}\n\n_Sumber: Otakudesu via AsunaSA API_`);
			}
		} catch (err) {
			return reply(`❌ Gagal: ${err?.message || err}`);
		}
	},
};
