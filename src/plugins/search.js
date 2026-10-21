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
 * plugins/search.js — SEARCH & info (semua sumber DITES live 2026-10-21).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .jadwalsholat <kota>    jadwal sholat hari ini (sumber: MyQuran)
 *   .gempa                  gempa terbaru (sumber: BMKG)
 *   .gempaterkini           10 gempa terakhir (sumber: BMKG)
 *   .cuaca <kota>           cuaca sekarang + hari ini (sumber: Open-Meteo)
 *   .pinterest <kata kunci> cari gambar Pinterest (sumber: siputzx)
 *   .lirik <artis> - <judul>  lirik lagu (sumber: lyrics.ovh)
 *   .search <kata kunci>    cari di web (mesin: DuckDuckGo)
 */
import { readConfig, getMessageText } from '../helper/config.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25_000) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}
async function fetchText(url) {
	const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25_000) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.text();
}

function jakartaNow() {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
	const get = t => parts.find(p => p.type === t).value;
	return { y: get('year'), m: get('month'), d: get('day') };
}

const WMO = { 0: 'Cerah ☀️', 1: 'Cerah berawan 🌤️', 2: 'Berawan sebagian ⛅', 3: 'Mendung ☁️', 45: 'Berkabut 🌫️', 48: 'Berkabut 🌫️', 51: 'Gerimis ringan 🌦️', 53: 'Gerimis 🌦️', 55: 'Gerimis lebat 🌦️', 61: 'Hujan ringan 🌧️', 63: 'Hujan sedang 🌧️', 65: 'Hujan lebat 🌧️', 71: 'Salju 🌨️', 73: 'Salju 🌨️', 75: 'Salju lebat 🌨️', 80: 'Hujan lokal 🌦️', 81: 'Hujan lokal 🌧️', 82: 'Hujan deras ⛈️', 95: 'Badai petir ⛈️', 96: 'Badai petir + hujan es ⛈️', 99: 'Badai petir + hujan es ⛈️' };

/** Cari URL gambar pinimg pertama di objek apa pun. */
function findPinimg(obj, depth = 0) {
	if (!obj || depth > 5) return '';
	if (typeof obj === 'string') return obj.includes('i.pinimg.com') ? obj : '';
	if (Array.isArray(obj)) { for (const v of obj) { const r = findPinimg(v, depth + 1); if (r) return r; } return ''; }
	for (const v of Object.values(obj)) { const r = findPinimg(v, depth + 1); if (r) return r; }
	return '';
}

export default {
	name: 'search',
	desc: 'Search & info: jadwalsholat, gempa, gempaterkini, cuaca, pinterest, lirik, search.',

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
		const COMMANDS = ['jadwalsholat', 'sholat', 'gempa', 'gempaterkini', 'cuaca', 'pinterest', 'pin', 'lirik', 'lyric', 'search', 'google'];
		if (!COMMANDS.includes(cmd)) return;

		try {
			if (cmd === 'jadwalsholat' || cmd === 'sholat') {
				if (!args) return reply('Pakai: `.jadwalsholat jakarta`');
				const cari = await fetchJson(`https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(args)}`);
				const kota = cari?.data?.[0];
				if (!kota) throw new Error(`kota "${args}" tidak ditemukan`);
				const now = jakartaNow();
				const jadwal = await fetchJson(`https://api.myquran.com/v2/sholat/jadwal/${kota.id}/${now.y}/${now.m}/${now.d}`);
				const j = jadwal?.data?.jadwal;
				if (!j) throw new Error('jadwal tidak tersedia');
				return reply(
					`🕌 *JADWAL SHOLAT*\n📍 ${kota.lokasi}\n📅 ${j.tanggal}\n\n` +
						`Imsak : ${j.imsak}\nSubuh : ${j.subuh}\nTerbit : ${j.terbit}\nDhuha : ${j.dhuha}\nDzuhur : ${j.dzuhur}\nAshar : ${j.ashar}\nMaghrib : ${j.maghrib}\nIsya : ${j.isya}\n\n_Sumber: MyQuran_`
				);
			}
			if (cmd === 'gempa') {
				const json = await fetchJson('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
				const g = json?.Infogempa?.gempa;
				if (!g) throw new Error('data BMKG kosong');
				const text =
					`🌋 *GEMPA TERBARU (BMKG)*\n\n` +
					`📅 ${g.Tanggal} — ${g.Jam}\n📍 ${g.Wilayah}\n💥 Magnitudo : ${g.Magnitude}\n🕳️ Kedalaman : ${g.Kedalaman}\n🧭 Koordinat : ${g.Lintang}, ${g.Bujur}\n⚠️ Potensi : ${g.Potensi}` +
					(g.Dirasakan ? `\n👥 Dirasakan : ${g.Dirasakan}` : '');
				if (g.Shakemap) {
					try { return sock.sendMessage(chatJid, { image: { url: `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` }, caption: text }, { quoted: msg }); } catch { /* kirim teks saja */ }
				}
				return reply(text);
			}
			if (cmd === 'gempaterkini') {
				const json = await fetchJson('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json');
				const list = json?.Infogempa?.gempa || [];
				if (!list.length) throw new Error('data BMKG kosong');
				const lines = list.slice(0, 10).map((g, i) => `${i + 1}. *M${g.Magnitude}* — ${g.Wilayah}\n   ${g.Tanggal} ${g.Jam} • kedalaman ${g.Kedalaman}`);
				return reply(`🌋 *10 GEMPA TERAKHIR (BMKG)*\n\n${lines.join('\n')}`);
			}
			if (cmd === 'cuaca') {
				if (!args) return reply('Pakai: `.cuaca bandung`');
				const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args)}&count=1&language=id`);
				const place = geo?.results?.[0];
				if (!place) throw new Error(`kota "${args}" tidak ditemukan`);
				const fc = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
				const c = fc?.current; const dly = fc?.daily;
				if (!c) throw new Error('data cuaca tidak tersedia');
				return reply(
					`🌦️ *CUACA — ${place.name}${place.admin1 ? `, ${place.admin1}` : ''}*\n\n` +
						`Kondisi : ${WMO[c.weather_code] || 'Tidak diketahui'}\n🌡️ Suhu : ${c.temperature_2m}°C (terasa ${c.apparent_temperature}°C)\n💧 Kelembapan : ${c.relative_humidity_2m}%\n💨 Angin : ${c.wind_speed_10m} km/jam\n` +
						(dly ? `📈 Hari ini : ${dly.temperature_2m_min?.[0]}°C – ${dly.temperature_2m_max?.[0]}°C\n` : '') +
						`\n_Sumber: Open-Meteo_`
				);
			}
			if (cmd === 'pinterest' || cmd === 'pin') {
				if (!args) return reply('Pakai: `.pinterest kucing lucu`');
				const json = await fetchJson(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(args)}`);
				const items = json?.data || [];
				if (!json?.status || !items.length) throw new Error('tidak ada hasil Pinterest');
				const first = items[0];
				const img = findPinimg(first);
				const caption = `📌 *Pinterest — ${args}*\n${first.pin || ''}\n\nHasil lain:\n${items.slice(1, 4).map((it, i) => `${i + 2}. ${it.pin || ''}`).join('\n')}`;
				if (img) return sock.sendMessage(chatJid, { image: { url: img }, caption }, { quoted: msg });
				return reply(caption);
			}
			if (cmd === 'lirik' || cmd === 'lyric') {
				const parts = args.split(/\s+-\s+/);
				if (parts.length < 2) return reply('Pakai: `.lirik <artis> - <judul lagu>`\nContoh: `.lirik Coldplay - Yellow`');
				const [artis, judul] = [parts[0].trim(), parts.slice(1).join(' - ').trim()];
				const json = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artis)}/${encodeURIComponent(judul)}`);
				if (!json?.lyrics) throw new Error('lirik tidak ditemukan');
				const lirik = json.lyrics.length > 3500 ? json.lyrics.slice(0, 3500) + '\n\n_(dipotong — terlalu panjang)_' : json.lyrics;
				return reply(`🎤 *${artis} — ${judul}*\n\n${lirik}`);
			}
			if (cmd === 'search' || cmd === 'google') {
				if (!args) return reply('Pakai: `.search kata kunci`');
				const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(args)}`);
				const results = [];
				const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
				let mm;
				while ((mm = re.exec(html)) && results.length < 5) {
					let url = mm[1];
					const uddg = url.match(/[?&]uddg=([^&]+)/);
					if (uddg) url = decodeURIComponent(uddg[1]);
					const title = mm[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
					if (title && url.startsWith('http')) results.push({ title, url });
				}
				if (!results.length) throw new Error('tidak ada hasil pencarian');
				return reply(`🔎 *Hasil pencarian: ${args}*\n\n${results.map((r, i) => `${i + 1}. *${r.title}*\n${r.url}`).join('\n\n')}\n\n_Mesin: DuckDuckGo_`);
			}
		} catch (err) {
			return reply(`❌ Gagal: ${err?.message || err}`);
		}
	},
};
