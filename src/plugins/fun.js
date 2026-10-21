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
 * plugins/fun.js — FUN (hiburan ringan, semua lokal).
 *
 * Command (mode public: semua orang; mode self: hanya owner):
 *   .dadu                    lempar dadu 1-6
 *   .koin                    lempar koin (Angka / Gambar)
 *   .suit <batu|gunting|kertas>   suit lawan bot
 *   .cek <hal>               cek persentase lucu-lucuan (stabil per orang+hal)
 *   .fact                    fakta unik acak
 *   .roast [nama]            roastingan bercanda
 *   .ship <nama1> & <nama2>  ukur kecocokan (stabil per pasangan)
 *   .reaction                react emoji acak ke pesan yang di-reply
 */
import { readConfig, getMessageText } from '../helper/config.js';

const FACTS = [
	'Madu tidak pernah basi — madu berumur 3.000 tahun dari makam Mesir kuno masih bisa dimakan.',
	'Gurita punya 3 jantung dan darah berwarna biru.',
	'Pisang secara botani adalah buah beri, sedangkan stroberi bukan.',
	'Ada lebih banyak kemungkinan susunan kartu remi daripada jumlah atom di Bumi.',
	'Kucing tidur rata-rata 70% dari hidupnya.',
	'Bunyi pertama yang direkam komputer adalah lagu "Daisy Bell" (1961).',
	'Otak manusia menghasilkan listrik cukup untuk menyalakan lampu kecil.',
	'Lebah bisa mengenali wajah manusia.',
	'Gunung Everest bertambah tinggi sekitar 4 mm setiap tahun.',
	'Satu hari di Venus lebih lama daripada satu tahun di Venus.',
	'Manusia dan jerapah punya jumlah tulang leher yang sama: 7.',
	'Suara singa bisa terdengar sampai 8 km.',
	'Air panas bisa membeku lebih cepat dari air dingin (efek Mpemba).',
	'Kata "robot" berasal dari bahasa Ceko "robota" yang artinya kerja paksa.',
	'Buaya tidak bisa menjulurkan lidahnya.',
];

const ROASTS = [
	'otaknya kayak RAM 512MB — buka 2 tab aja langsung nge-lag.',
	'kalau kecepatan mikir diukur, dia masih pakai dial-up.',
	'wajahnya kayak password — susah diingat, gampang dilupakan.',
	'dia bukan pemalas, dia cuma lagi mode hemat energi permanen.',
	'kalau ada lomba tidur siang, dia juara bertahan 5 tahun.',
	'HP-nya aja lebih pintar, soalnya HP-nya tahu kapan harus diam.',
	'cermin di rumahnya pasti sering minta maaf.',
	'kalau jadi karakter game, dia NPC yang cuma ngomong satu baris.',
];

function stablePercent(key, max = 100) {
	let h = 0;
	for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
	return (h % (max + 1));
}

export default {
	name: 'fun',
	desc: 'Fun: dadu, koin, suit, cek, fact, roast, ship, reaction.',

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
		const senderNum = (msg.key.participant || msg.participant || chatJid).split('@')[0];

		if (cmd === 'dadu') {
			const n = 1 + Math.floor(Math.random() * 6);
			const pips = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][n - 1];
			return reply(`🎲 Dadunya: ${pips} *${n}*`);
		}
		if (cmd === 'koin') return reply(`🪙 Koinnya jatuh di: *${Math.random() < 0.5 ? 'ANGKA 🔢' : 'GAMBAR 🖼️'}*`);
		if (cmd === 'suit') {
			const pilihan = { batu: '✊', gunting: '✌️', kertas: '✋' };
			const user = args.toLowerCase();
			if (!pilihan[user]) return reply('Pakai: `.suit batu` / `.suit gunting` / `.suit kertas`');
			const bot = Object.keys(pilihan)[Math.floor(Math.random() * 3)];
			let hasil;
			if (user === bot) hasil = '🤝 SERI!';
			else if ((user === 'batu' && bot === 'gunting') || (user === 'gunting' && bot === 'kertas') || (user === 'kertas' && bot === 'batu')) hasil = '🎉 KAMU MENANG!';
			else hasil = '🤖 Bot menang, coba lagi!';
			return reply(`Kamu: ${pilihan[user]} ${user}\nBot: ${pilihan[bot]} ${bot}\n\n${hasil}`);
		}
		if (cmd === 'cek') {
			if (!args) return reply('Pakai: `.cek ganteng` / `.cek jodoh aku` dll.');
			const pct = stablePercent(senderNum + '|' + args.toLowerCase());
			const komentar = pct >= 80 ? 'Tinggi banget! 🔥' : pct >= 55 ? 'Lumayan lah 😎' : pct >= 30 ? 'Biasa aja 😐' : 'Sabar ya... 🥲';
			return reply(`🔍 *Cek ${args}*\nHasilnya: *${pct}%*\n${komentar}`);
		}
		if (cmd === 'fact') return reply(`💡 *Fakta unik*\n\n${FACTS[Math.floor(Math.random() * FACTS.length)]}`);
		if (cmd === 'roast') {
			const target = args || msg.pushName || 'Kamu';
			return reply(`🔥 *Roast buat ${target}:*\n${target} itu ${ROASTS[Math.floor(Math.random() * ROASTS.length)]}\n\n_(bercanda ya, jangan baper 😆)_`);
		}
		if (cmd === 'ship') {
			const parts = args.split(/[&+]/).map(s => s.trim()).filter(Boolean);
			if (parts.length < 2) return reply('Pakai: `.ship Budi & Ani`');
			const key = parts.map(s => s.toLowerCase()).sort().join('|');
			const pct = stablePercent('ship|' + key);
			const komentar = pct >= 85 ? '💘 Jodoh banget ini!' : pct >= 60 ? '💕 Cocok, gas terus!' : pct >= 40 ? '💛 Bisa dicoba.' : pct >= 20 ? '💔 Agak berat...' : '🧊 Mending temenan aja.';
			return reply(`💘 *Ship ${parts[0]} ❤️ ${parts[1]}*\nKecocokan: *${pct}%*\n${komentar}`);
		}
		if (cmd === 'reaction') {
			const quoted = msg.message?.extendedTextMessage?.contextInfo;
			if (!quoted?.stanzaId) return reply('Reply dulu pesan yang mau di-react, lalu ketik `.reaction`');
			const emojis = ['❤️', '🔥', '😂', '😮', '👏', '💯', '🥰', '👍'];
			const emoji = emojis[Math.floor(Math.random() * emojis.length)];
			const key = { remoteJid: chatJid, id: quoted.stanzaId, participant: quoted.participant || undefined };
			await sock.sendMessage(chatJid, { react: { key, text: emoji } });
			return;
		}
	},
};
