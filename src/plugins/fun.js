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
import { jidNormalizedUser } from 'baileys';
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

// Anggota grup versi NOMOR ASLI: di grup beralamat LID, id peserta adalah
// @lid (ID samaran, bukan nomor HP). Nomor asli diambil dari phoneNumber
// peserta, atau dipetakan lewat lidMapping Baileys bila belum ada.
async function memberJids(sock, meta) {
	const seen = new Set();
	const out = [];
	for (const p of meta?.participants || []) {
		let jid = p.phoneNumber || p.id || '';
		if (jid.endsWith('@lid')) {
			try {
				const pn = await sock?.signalRepository?.lidMapping?.getPNForLID?.(jid);
				if (pn) jid = pn;
			} catch { /* abaikan */ }
		}
		if (!jid) continue;
		const norm = jidNormalizedUser(jid);
		const key = norm.split('@')[0];
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(norm);
	}
	return out;
}

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const JODOH_PREDIKSI = [
	'Bakal sering ngambek bareng, tapi baikan sebelum tidur.',
	'Satu hobi kecil bakal jadi alasan ketemu terus.',
	'Chat jam 2 pagi adalah awal dari segalanya.',
	'Bakal ada yang diam-diam cemburu tapi gengsi ngaku.',
	'Rebutan makanan terakhir justru jadi momen paling romantis.',
	'Salah satu bakal hafal pesanan kopi favorit yang lain.',
	'Perjalanan jauh pertama bareng akan menentukan arah hubungan.',
	'Lagu yang sama bakal nggak sengaja jadi "lagu kalian".',
];

/** Kartu cek jodoh: hasil stabil per pasangan (urutan bebas). */
function jodohCard(a, b, judul = 'CEK JODOH', keyA = a, keyB = b) {
	const key = [keyA, keyB].map(s => String(s).toLowerCase()).sort().join('|');
	const pct = stablePercent('jodoh|' + key);
	const filled = Math.round(pct / 10);
	const bar = '❤️'.repeat(filled) + '🖤'.repeat(10 - filled);
	const verdict = pct >= 90 ? '💍 *JODOH SEJATI!*' : pct >= 75 ? '💘 *Serasi banget!*' : pct >= 55 ? '💕 *Cocok, harapan besar.*' : pct >= 35 ? '💛 *Bisa, tapi butuh usaha & komunikasi.*' : pct >= 20 ? '💔 *Berat... lebih cocok jadi teman cerita.*' : '🧊 *Mending temenan aja dulu.*';
	const prediksi = JODOH_PREDIKSI[stablePercent('pred|' + key, JODOH_PREDIKSI.length - 1)];
	return `💘 *${judul}*\n\n${a} ❤️ ${b}\n${bar}\nKecocokan: *${pct}%*\n${verdict}\n\n🔮 ${prediksi}`;
}

export default {
	name: 'fun',
	desc: 'Fun: dadu, koin, suit, cek, seberapa, kapan, fact, roast, ship, jodoh, jodohku, khodam, siapakah, truth/dare, bisakah, hoki, pantun, artinama, undian, rating, cantik/ganteng acak grup, reaction.',

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
		if (cmd === 'jodoh') {
			const cInfo = msg.message?.extendedTextMessage?.contextInfo;
			const parts = args.replace(/@\d+/g, '').split(/[&+]/).map(s => s.trim()).filter(Boolean);
			let a = '', b = '';
			if (parts.length >= 2) {
				[a, b] = [parts[0], parts[1]];
			} else {
				const targetJid = cInfo?.mentionedJid?.[0] || cInfo?.participant;
				if (targetJid) { a = parts[0] || msg.pushName || 'Kamu'; b = targetJid.split('@')[0]; }
				else if (parts.length === 1) { a = msg.pushName || 'Kamu'; b = parts[0]; }
				else return reply('Pakai: `.jodoh Budi & Ani` — atau mention/reply orangnya: `.jodoh @dia`');
			}
			return reply(jodohCard(a, b) + '\n\n_(hiburan ya — jodoh beneran tetap di tangan Tuhan 😇)_');
		}
		if (cmd === 'seberapa') {
			const q = args.toLowerCase().replace(/\?+$/, '').replace(/\s+/g, ' ').trim();
			if (!q) return reply('Pakai: `.seberapa ganteng aku` / `.seberapa sayang dia sama aku` / `.seberapa hoki aku hari ini`');
			const pct = stablePercent(senderNum + '|seberapa|' + q);
			const filled = Math.round(pct / 10);
			const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
			const komentar = pct >= 90 ? 'Parah sih ini, level dewa! 🔥'
				: pct >= 75 ? 'Tinggi banget! 😍'
				: pct >= 55 ? 'Di atas rata-rata lah 😎'
				: pct >= 40 ? 'Standar-standar aja 😐'
				: pct >= 20 ? 'Agak kurang ya... 😅'
				: 'Duh, nyaris nggak ada 🥲';
			return reply(`📏 *SEBERAPA ${q.toUpperCase()}*\n\n${bar}\nHasilnya: *${pct}%*\n${komentar}\n\n_(hasil tetap buat pertanyaan yang sama — jangan ngarep berubah 😆)_`);
		}
		if (cmd === 'kapan') {
			const HARI = HARI_ID;
			const BULAN = BULAN_ID;
			const PENUTUP = [
				'Catat tanggalnya, jangan sampai lupa 😌',
				'Bintang-bintang sudah sepakat soal ini ✨',
				'Bola kristal bot nggak pernah bohong (katanya) 🔮',
				'Sabar ya, semua indah pada waktunya 🌸',
				'Mulai nabung dari sekarang, buat jaga-jaga 💸',
				'Rahasia ya, jangan bilang siapa-siapa 🤫',
			];
			const qNorm = args.toLowerCase().replace(/\?+$/, '').replace(/^kah\s+/, '').replace(/\s+/g, ' ').trim();
			if (!qNorm) return reply('Pakai: `.kapan kah aku nikah` / `.kapan aku punya anak` / `.kapan aku kaya` 🔮');
			const key = senderNum + '|kapan|' + qNorm;
			const offset = stablePercent(key, 3649) + 1; // 1 hari s/d ~10 tahun lagi
			const target = new Date(Date.now() + offset * 86400000);
			const tanggal = `${HARI[target.getDay()]}, ${target.getDate()} ${BULAN[target.getMonth()]} ${target.getFullYear()}`;
			const relatif = offset < 30 ? `${offset} hari lagi`
				: offset < 365 ? `${Math.round(offset / 30)} bulan lagi`
				: `${(offset / 365).toFixed(1).replace('.', ',').replace(/,0$/, '')} tahun lagi`;
			const penutup = PENUTUP[stablePercent(key + '|x', PENUTUP.length - 1)];
			return reply(`🔮 *RAMALAN KAPAN*\n\n❓ "Kapan ${qNorm}?"\n\nMenurut terawangan bot:\n📅 *${tanggal}*\n⏳ Sekitar *${relatif}* dari sekarang.\n\n${penutup}\n\n_(hiburan ya — masa depan tetap kamu yang menentukan 😇)_`);
		}
		if (cmd === 'jodohku') {
			if (!chatJid.endsWith('@g.us')) return reply('Command `.jodohku` cuma bisa di grup — bot milih jodohmu acak dari anggota grup 🏹');
			let meta;
			try { meta = await sock.groupMetadata(chatJid); } catch { /* di bawah */ }
			const digits = j => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
			const meRaw = msg.key.participant || chatJid;
			let meJid = msg.key.participantAlt || meRaw;
			if (String(meJid).endsWith('@lid')) {
				try {
					const pn = await sock?.signalRepository?.lidMapping?.getPNForLID?.(meJid);
					if (pn) meJid = pn;
				} catch { /* abaikan */ }
			}
			const exclude = new Set([digits(meRaw), digits(meJid), digits(sock.user?.id)]);
			const candidates = (await memberJids(sock, meta)).filter(id => !exclude.has(digits(id)));
			if (!candidates.length) return reply('Anggota grupnya kurang buat dicariin jodoh 😅');
			const pick = candidates[Math.floor(Math.random() * candidates.length)];
			const a = msg.pushName || 'Kamu';
			const card = jodohCard(a, `@${digits(pick)}`, 'JODOHKU', digits(meJid), digits(pick));
			return sock.sendMessage(chatJid, { text: card + '\n\n_(dipilih acak oleh Cupid Bot 🏹 — kurang cocok? panggil lagi aja)_', mentions: [pick] }, { quoted: msg });
		}
		if (cmd === 'khodam') {
			const KHODAM = [
				{ n: 'Macan Kumbang', e: '🐆', s: 'pendiam tapi sekali bergerak semua minggir' },
				{ n: 'Naga Emas', e: '🐉', s: 'bawaan rezeki, auranya mahal' },
				{ n: 'Harimau Putih', e: '🐅', s: 'disegani tanpa perlu banyak bicara' },
				{ n: 'Garuda Api', e: '🦅', s: 'ambisinya membara, susah dikendalikan' },
				{ n: 'Kucing Oren', e: '🐈', s: 'bar-bar tapi ngangenin, sumber keramaian' },
				{ n: 'Elang Jawa', e: '🦅', s: 'penglihatannya tajam soal peluang' },
				{ n: 'Buaya Darat', e: '🐊', s: 'rayuannya maut, hati-hati yang dekat' },
				{ n: 'Kancil Sakti', e: '🦌', s: 'kecil-kecil otaknya encer, selalu lolos' },
				{ n: 'Ular Sanca Emas', e: '🐍', s: 'sabar menunggu momen yang tepat' },
				{ n: 'Ayam Cemani', e: '🐓', s: 'langka dan penuh misteri' },
				{ n: 'Banteng Merah', e: '🐂', s: 'keras kepala, pantang mundur' },
				{ n: 'Kelelawar Malam', e: '🦇', s: 'anak malam, otaknya nyala pas begadang' },
				{ n: 'Kura-kura Bijak', e: '🐢', s: 'lambat di luar, menang di akhir' },
				{ n: 'Katak Pembawa Hujan', e: '🐸', s: 'datang selalu bawa kabar tak terduga' },
				{ n: 'Singa Padang Pasir', e: '🦁', s: 'jiwa pemimpin, tidur pun tetap berwibawa' },
				{ n: 'Rusa Emas', e: '🦌', s: 'anggun, tapi larinya nggak terkejar' },
				{ n: 'Tupai Lincah', e: '🐿️', s: 'nggak bisa diam, idenya lompat-lompat' },
				{ n: 'Kerbau Bule', e: '🐃', s: 'pekerja keras, setia kawan' },
				{ n: 'Kecoa Terbang', e: '🪳', s: 'muncul selalu di saat paling nggak terduga' },
				{ n: 'Sendal Jepit Sakti', e: '🩴', s: 'sederhana, tapi hilang satu dunia heboh' },
			];
			const k = KHODAM[stablePercent('khodam|' + senderNum, KHODAM.length - 1)];
			const power = 40 + stablePercent('khodampw|' + senderNum, 60);
			return reply(`👁️ *CEK KHODAM*\n\nKhodam pendamping *${msg.pushName || 'kamu'}*:\n\n${k.e} *${k.n}*\n💪 Kekuatan: *${power}%*\n✨ Sifat: ${k.s}\n\n_(khodam ini tetap — sudah terikat sejak lahir 😌)_`);
		}
		if (cmd === 'siapakah') {
			if (!chatJid.endsWith('@g.us')) return reply('Command `.siapakah` cuma bisa di grup 😄');
			const q = args.replace(/\?+$/, '').trim();
			if (!q) return reply('Pakai: `.siapakah yang paling jomblo` / `.siapakah yang bakal kaya duluan`');
			let meta;
			try { meta = await sock.groupMetadata(chatJid); } catch { /* di bawah */ }
			const botDigits = String(sock.user?.id || '').split('@')[0].split(':')[0];
			const members = (await memberJids(sock, meta)).filter(j => j.split('@')[0] !== botDigits);
			if (!members.length) return reply('Gagal membaca anggota grup, coba lagi ya.');
			const pick = members[Math.floor(Math.random() * members.length)];
			return sock.sendMessage(chatJid, { text: `🤔 *SIAPAKAH ${q.toUpperCase()}?*\n\nSetelah bot menerawang satu grup penuh...\n\nJawabannya: @${pick.split('@')[0]} 🎯\n\n_(dipilih acak — yang kepilih jangan baper 😆)_`, mentions: [pick] }, { quoted: msg });
		}
		if (cmd === 'truth' || cmd === 'dare') {
			const TRUTH = [
				'Siapa orang terakhir yang kamu stalking di media sosial? Ngaku!',
				'Pesan apa yang pernah kamu hapus sebelum terkirim, dan buat siapa?',
				'Kapan terakhir kali kamu nangis, dan karena apa?',
				'Siapa di grup ini yang diam-diam kamu kagumi? Sebut nama!',
				'Kebohongan terakhir yang kamu ucapkan itu apa?',
				'Foto paling aib di galerimu itu foto apa? Ceritakan!',
				'Siapa kontak yang paling sering kamu chat diam-diam?',
				'Hal paling memalukan yang pernah kamu lakukan di depan umum?',
				'Kalau bisa menghapus satu chat selamanya, chat dengan siapa?',
				'Siapa mantan yang masih sesekali kamu kepoin?',
				'Rahasia kecil apa yang belum pernah kamu ceritakan ke siapa pun di grup ini?',
				'Kapan terakhir kali kamu pura-pura sibuk biar nggak diajak keluar?',
				'Apa kebiasaan anehmu yang orang lain belum tahu?',
				'Siapa guru/dosen yang paling kamu sebelin dulu, kenapa?',
			];
			const DARE = [
				'Kirim voice note nyanyi lagu anak-anak sekarang juga!',
				'Chat kontak terakhirmu: "aku kangen" — tanpa konteks apa pun.',
				'Ganti foto profilmu jadi foto paling aib selama 10 menit!',
				'Ketik pesan berikutnya TANPA huruf vokal selama 5 menit.',
				'Puji admin grup dengan pantun buatan sendiri, sekarang!',
				'Kirim stiker/emoji yang sama ke 5 chat teratasmu.',
				'Bilang "aku sayang kalian" pakai voice note di grup ini.',
				'Tulis status WA: "hari ini aku merasa sangat tampan/cantik" — biarkan 30 menit.',
				'Tirukan suara hewan yang dipilih orang setelahmu.',
				'Jangan pakai emoji sama sekali selama 15 menit ke depan.',
				'Ceritakan mimpi terakhirmu semalam, sedetail mungkin.',
				'Kirim foto makanan terakhir yang kamu makan. Sekarang.',
				'Reply semua pesan di grup ini pakai kata "siap bos" selama 10 menit.',
				'Buat puisi 4 baris tentang orang yang duduk (di daftar anggota) di atasmu.',
			];
			const pool = cmd === 'truth' ? TRUTH : DARE;
			const pick = pool[Math.floor(Math.random() * pool.length)];
			return reply(cmd === 'truth' ? `🤫 *TRUTH*\n\n${pick}` : `🔥 *DARE*\n\n${pick}\n\n_(nggak boleh nolak ya 😏)_`);
		}
		if (cmd === 'bisakah') {
			const JAWAB = ['Bisa banget! Gas! 💪', 'Pasti bisa. Percaya sama bot 😎', 'Kemungkinan besar: IYA ✨', 'Iya, tapi nggak sekarang. Sabar ya', 'Hmm... 50:50, tergantung usahamu 🤔', 'Kayaknya nggak deh 😅', 'Jangan terlalu berharap dulu ya', 'Bisa, asal kamu berani mulai', 'Menurut terawangan bot: BISA! 🔮', 'Nggak. Tapi plot twist selalu ada', 'Bisa banget — bahkan lebih cepat dari dugaanmu', 'Tanya lagi besok, bola kristalnya lagi ngantuk 😴'];
			const q = args.toLowerCase().replace(/\?+$/, '').replace(/\s+/g, ' ').trim();
			if (!q) return reply('Pakai: `.bisakah aku kaya tahun ini?` / `.bisakah dia balas chatku?`');
			const ans = JAWAB[stablePercent(senderNum + '|bisakah|' + q, JAWAB.length - 1)];
			return reply(`🎱 *BOLA RAMAL*\n\n❓ "Bisakah ${q}?"\n\n💬 ${ans}\n\n_(jawaban tetap buat pertanyaan yang sama 😌)_`);
		}
		if (cmd === 'hoki') {
			const WARNA = ['Merah', 'Emas', 'Hijau Toska', 'Biru Langit', 'Ungu', 'Oranye', 'Pink', 'Hitam Elegan', 'Putih', 'Kuning Cerah'];
			const SARAN = ['Hari yang bagus buat mulai hal yang tertunda.', 'Jauhi drama, dekatkan kopi.', 'Ada kabar baik dari arah yang nggak terduga.', 'Jangan pinjamkan uang hari ini. Serius.', 'Rezeki bisa datang dari chat yang belum dibalas.', 'Waktu yang tepat buat minta maaf duluan.', 'Fokus ke satu hal, jangan serakah hari ini.', 'Keberuntunganmu naik setelah makan enak.'];
			const now = new Date(Date.now() + 7 * 3600 * 1000); // tanggal WIB
			const tglKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
			const key = senderNum + '|hoki|' + tglKey;
			const pct = stablePercent(key);
			const bar = '▰'.repeat(Math.round(pct / 10)) + '▱'.repeat(10 - Math.round(pct / 10));
			const warna = WARNA[stablePercent(key + '|w', WARNA.length - 1)];
			const angka = 1 + stablePercent(key + '|a', 98);
			const saran = SARAN[stablePercent(key + '|s', SARAN.length - 1)];
			const label = pct >= 80 ? 'HOKI BESAR! 🍀🍀🍀' : pct >= 55 ? 'Lumayan hoki 🍀🍀' : pct >= 30 ? 'Biasa aja 🍀' : 'Lagi seret... hati-hati ya 🫠';
			return reply(`🍀 *HOKI HARI INI*\n\n${bar}\nKeberuntungan: *${pct}%* — ${label}\n🎨 Warna hoki: *${warna}*\n🔢 Angka hoki: *${angka}*\n💡 ${saran}\n\n_(berlaku hari ini aja — besok cek lagi ya)_`);
		}
		if (cmd === 'pantun') {
			const PANTUN = [
				'Jalan-jalan ke Pasar Baru\nJangan lupa beli sepatu\nKalau kamu lagi rindu\nIngat aku selalu menunggu',
				'Buah mangga buah pepaya\nDimakan enak di siang hari\nSenyummu manis sekali ya\nBikin hati berdebar tiap hari',
				'Ke warteg beli nasi rendang\nNasinya habis tinggal kuah\nLihat kamu kok hati berdebar-debar\nTernyata dompetku yang hilang, ya Allah',
				'Ikan hiu makan tomat\nTomatnya dibeli di toko Pak Haji\nAku janji nggak akan telat\nTelatnya cuma pas tanggal muda gaji',
				'Burung perkutut burung kutilang\nKamu kentut aku yang hilang\nEh maaf salah pantun sayang\nMaksudku: kamu cantik, aku sayang',
				'Naik delman ke kota tua\nDuduk di depan pak kusirnya\nKatanya cinta itu buta\nMakanya aku merem aja',
				'Beli bakso pakai kuah\nKuahnya tumpah kena baju\nKalau hidup terasa susah\nIngat, tetangga lebih susah darimu',
				'Pagi-pagi minum jamu\nJamunya pahit sekali\nDaripada mikirin masa lalu\nMending mikirin makan siang ini',
				'Jalan-jalan ke Surabaya\nNaik kereta berdesak-desakan\nKamu itu jangan tanya\nKenapa aku sayang — nggak ada alasan!',
				'Buah duku buah rambutan\nEnak dimakan sambil santai\nChat dibaca tapi nggak dibalas-balasan\nItu namanya di-ghosting, santai...',
				'Ke pasar beli terasi\nTerasi dibungkus daun pisang\nGaji masuk tanggal satu pagi\nTanggal dua sudah tinggal kenangan',
				'Anak ayam turun sepuluh\nMati satu tinggal sembilan\nHidup ini memang penuh keluh\nTapi tetap jalan, yang penting makan',
			];
			const p = PANTUN[Math.floor(Math.random() * PANTUN.length)];
			return reply(`🎭 *PANTUN BUAT KAMU*\n\n${p.split('\n').join('\n')}\n\nCakeppp! 👏`);
		}
		if (cmd === 'artinama') {
			const SIFAT = {
				a: ['Ambisius', 'Asyik', 'Anggun'], b: ['Berani', 'Bijaksana', 'Bersahaja'], c: ['Cerdas', 'Ceria', 'Cekatan'],
				d: ['Dermawan', 'Disiplin', 'Dinamis'], e: ['Energik', 'Elegan', 'Empati tinggi'], f: ['Fokus', 'Fleksibel', 'Fenomenal'],
				g: ['Gigih', 'Gaul', 'Gemilang'], h: ['Humoris', 'Hangat', 'Hebat'], i: ['Imajinatif', 'Ikhlas', 'Inspiratif'],
				j: ['Jujur', 'Jagoan', 'Jeli'], k: ['Kreatif', 'Kharismatik', 'Kuat'], l: ['Lucu', 'Lembut', 'Lincah'],
				m: ['Mandiri', 'Menawan', 'Murah hati'], n: ['Nyaman diajak ngobrol', 'Nggak neko-neko', 'Nyeleneh positif'],
				o: ['Optimis', 'Original', 'Objektif'], p: ['Percaya diri', 'Penyayang', 'Pintar'], q: ['Qonaah (mudah bersyukur)', 'Quality time lover'],
				r: ['Rajin', 'Ramah', 'Romantis'], s: ['Setia', 'Sabar', 'Supel'], t: ['Tegas', 'Teliti', 'Tenang'],
				u: ['Unik', 'Ulet', 'Utama'], v: ['Visioner', 'Vokal'], w: ['Wibawa', 'Welcoming', 'Waspada positif'],
				x: ['Xtra berani', 'Xtra spesial'], y: ['Yakin', 'Yahud'], z: ['Zelos (bersemangat)', 'Zigzag kalau dikejar deadline'],
			};
			const nama = (args || msg.pushName || 'Kamu').trim().slice(0, 14);
			const huruf = nama.toUpperCase().replace(/[^A-Z]/g, '');
			if (!huruf) return reply('Pakai: `.artinama Budi` — atau `.artinama` buat namamu sendiri');
			const lines = [...huruf].map(ch => {
				const pool = SIFAT[ch.toLowerCase()] || ['Istimewa'];
				const sifat = pool[stablePercent('artinama|' + nama.toLowerCase() + '|' + ch, pool.length - 1)];
				return `*${ch}* = ${sifat}`;
			});
			return reply(`🔤 *ARTI NAMA: ${nama.toUpperCase()}*\n\n${lines.join('\n')}\n\n_(versi bot — positif semua, yang jelek-jeleknya disensor 😇)_`);
		}
		if (cmd === 'undian') {
			if (!chatJid.endsWith('@g.us')) return reply('Command `.undian` cuma bisa di grup 🎲');
			let meta;
			try { meta = await sock.groupMetadata(chatJid); } catch { /* di bawah */ }
			const botDigits = String(sock.user?.id || '').split('@')[0].split(':')[0];
			const members = (await memberJids(sock, meta)).filter(j => j.split('@')[0] !== botDigits);
			if (!members.length) return reply('Gagal membaca anggota grup, coba lagi ya.');
			const pick = members[Math.floor(Math.random() * members.length)];
			await sock.sendMessage(chatJid, { text: `🎲 *UNDIAN ${args ? args.toUpperCase() : 'GRUP'}*\n\nMengocok ${members.length} nama...\n🎰🎰🎰` }, { quoted: msg });
			await new Promise(r => setTimeout(r, 1200));
			return sock.sendMessage(chatJid, { text: `🎉 *PEMENANG UNDIAN${args ? ' ' + args.toUpperCase() : ''}*\n\nSelamat kepada:\n🏆 @${pick.split('@')[0]} 🏆\n\nSah ya, hasil kocokan bot nggak bisa diganggu gugat 😄`, mentions: [pick] }, { quoted: msg });
		}
		if (cmd === 'rating' || cmd === 'penilaian') {
			if (!chatJid.endsWith('@g.us')) return reply('Command `.rating` cuma bisa di grup — bot menilai semua anggota grupnya ⭐');
			let meta;
			try { meta = await sock.groupMetadata(chatJid); } catch { /* di bawah */ }
			const members = await memberJids(sock, meta);
			if (!members.length) return reply('Gagal membaca anggota grup, coba lagi ya.');
			const digits = j => String(j || '').split('@')[0].split(':')[0];
			// Rating stabil per anggota per grup (6-10) — hasil tidak berubah tiap dipanggil.
			const rows = members
				.map(jid => ({ jid, rating: 6 + stablePercent(`rating|${chatJid}|${digits(jid)}`, 4) }))
				.sort((a, b) => b.rating - a.rating || digits(a.jid).localeCompare(digits(b.jid)));
			const shown = rows.slice(0, 10);
			const now = new Date();
			const tanggal = `${HARI_ID[now.getDay()]}, ${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`;
			const list = shown.map((r, i) => `${i + 1}. @${digits(r.jid)}\n   Rating Keaktifan: *${r.rating}/10*\n   Total Suara: 1`).join('\n');
			const sisa = rows.length - shown.length;
			return sock.sendMessage(
				chatJid,
				{ text: `⭐ *PENILAIAN ANGGOTA GRUP*\n\n📋 ${meta.subject || 'Grup'}\n🗓️ ${tanggal}\n👥 Total Anggota: ${members.length}\n\n${list}${sisa > 0 ? `\n\n...dan ${sisa} anggota lainnya` : ''}\n\n_Penilaian versi bot — buat seru-seruan aja 😆_`, mentions: shown.map(r => r.jid) },
				{ quoted: msg }
			);
		}
		if (cmd === 'cantik' || cmd === 'ganteng') {
			if (!chatJid.endsWith('@g.us')) return reply(`Command \`.${cmd}\` cuma bisa di grup — bot milih orangnya acak dari anggota grup 😄`);
			let meta;
			try { meta = await sock.groupMetadata(chatJid); } catch { /* di bawah */ }
			const members = await memberJids(sock, meta);
			if (!members.length) return reply('Gagal membaca anggota grup, coba lagi ya.');
			const pick = members[Math.floor(Math.random() * members.length)];
			const pct = 60 + Math.floor(Math.random() * 41); // 60-100, namanya juga pemenang
			const crown = cmd === 'cantik' ? '👑' : '🤴';
			const gelar = cmd === 'cantik' ? 'TERCANTIK' : 'TERGANTENG';
			const komen = cmd === 'cantik'
				? ['Cantiknya nggak ada obat 😍', 'Auto jadi pusat perhatian grup ✨', 'Yang lain minggir dulu yaa 💅'][Math.floor(Math.random() * 3)]
				: ['Gantengnya bikin salah fokus 😎', 'Auto jadi idaman grup 🔥', 'Yang lain minggir dulu yaa ✌️'][Math.floor(Math.random() * 3)];
			return sock.sendMessage(
				chatJid,
				{ text: `${crown} *PEMILIHAN ${gelar} GRUP* ${crown}\n\nDan pemenangnya adalah...\n\n🎉 @${pick.split('@')[0]} 🎉\nKadar ${cmd}: *${pct}%*\n${komen}\n\n_(dipilih acak oleh bot — yang belum kepilih jangan iri ya 😆)_`, mentions: [pick] },
				{ quoted: msg }
			);
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
