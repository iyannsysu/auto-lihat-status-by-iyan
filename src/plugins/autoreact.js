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
 * plugins/autoreact.js — AUTO REACT STATUS (emoji + teks).
 * Sama seperti di readsw, tapi command dibuat SIMPLE:
 *
 *   .react on              -> nyalain auto react
 *   .react off             -> matiin auto react
 *   .react emoji ❤️ 🔥 😍  -> pakai emoji, set daftar emoji
 *   .react teks SEMANGAT!  -> pakai teks, set teks react
 *   .react teks off        -> balik ke mode emoji
 *   .react acak on/off     -> emoji acak / urut
 *   .react cek             -> lihat setting saat ini
 *
 * Cara kerja status:
 *  - hanya status (status@broadcast), skip fromMe + reaction + protocol
 *  - mode emoji: kirim 1 emoji (acak dari pool, atau urut giliran)
 *  - mode teks: kirim tiap teks berurutan (pisah pakai |, max 15, jeda 1 dtk)
 *    persis seperti readsw (countdown + teks semangat).
 *  - react dikirim via status@broadcast + statusJidList, sama seperti readsw.
 *  - dedup: 1 status cuma di-react 1x (1x set teks = 1x dihitung).
 *
 * Command hanya dari owner (pesan fromMe) — biar orang lain tidak bisa
 * ubah setting bot dari chat.
 */
import { jidNormalizedUser } from 'baileys';
import { readConfig, writeConfig, extractEmojis, getMessageText } from '../helper/config.js';

// Dedup react per status.
const reactedIds = new Set();
// Giliran emoji / teks kalau mode urut (react_random = false).
let emojiIndex = 0;
let textIndex = 0;

const delay = ms => new Promise(r => setTimeout(r, ms));

function helpText() {
	return (
		`🤖 *AUTO REACT — perintah simple*\n\n` +
		`• \`.react on\` — nyalain auto react\n` +
		`• \`.react off\` — matiin auto react\n` +
		`• \`.react emoji ❤️ 🔥 😍\` — pakai emoji + set daftarnya\n` +
		`• \`.react teks SEMANGAT YA :)\` — pakai teks + set teksnya\n` +
		`• \`.react teks off\` — balik ke mode emoji\n` +
		`• \`.react acak on\` / \`.react acak off\` — emoji acak / urut\n` +
		`• \`.react cek\` — lihat setting saat ini\n\n` +
		`Contoh cepat:\n` +
		`• \`.react emoji ❤️ 🔥\` → tiap status di-react ❤️ / 🔥\n` +
		`• \`.react teks SEMANGAT YA :)\` → tiap status di-react teks itu`
	);
}

function cekText(cfg) {
	const mode = cfg.react_mode === 'teks' ? 'TEKS 📝' : 'EMOJI 😍';
	const pool = cfg.emoji_pool.join(' ');
	const teks = cfg.react_text ? `"${cfg.react_text}"` : '(belum diisi)';
	return (
		`⚙️ *Setting Auto React*\n\n` +
		`• Auto react: *${cfg.autoreact ? 'ON ✅' : 'OFF ❌'}*\n` +
		`• Mode: *${mode}*\n` +
		`• Emoji: ${pool}\n` +
		`• Emoji acak: *${cfg.react_random ? 'ON (acak)' : 'OFF (urut)'}*\n` +
		`• Teks: ${teks}\n\n` +
		`Ubah: \`.react emoji ❤️\` / \`.react teks ...\` / \`.react on/off\``
	);
}

async function reply(sock, msg, text) {
	await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

/** Tangani command .react (hanya dari owner / fromMe). Return true kalau ini command. */
async function handleCommand(sock, msg) {
	if (!msg.key.fromMe) return false;
	const text = getMessageText(msg);
	if (!text) return false;
	// Prefix . / / ! — yang utama .react
	const match = text.match(/^[./!](react)\b(.*)$/is);
	if (!match) return false;
	const args = (match[2] || '').trim();
	const [subRaw = '', ...rest] = args.split(/\s+/);
	const sub = (subRaw || '').toLowerCase();
	const restText = rest.join(' ').trim();

	// .react doang -> tampilkan bantuan
	if (!sub) {
		await reply(sock, msg, helpText());
		return true;
	}

	if (sub === 'on') {
		const cfg = writeConfig({ autoreact: true });
		await reply(sock, msg, `Auto react sekarang *ON ✅* (mode ${cfg.react_mode === 'teks' ? 'TEKS 📝' : 'EMOJI 😍'})`);
		return true;
	}
	if (sub === 'off') {
		writeConfig({ autoreact: false });
		await reply(sock, msg, 'Auto react sekarang *OFF ❌*');
		return true;
	}
	if (sub === 'cek' || sub === 'status' || sub === 'check') {
		await reply(sock, msg, cekText(readConfig()));
		return true;
	}
	if (sub === 'emoji') {
		const emojis = extractEmojis(args.replace(/^emoji\s*/i, ''));
		if (!emojis.length) {
			await reply(sock, msg, `Kirim emoji-nya, contoh:\n\`.react emoji ❤️ 🔥 😍\``);
			return true;
		}
		const cfg = writeConfig({ emoji_pool: emojis, react_mode: 'emoji', react_text: '' });
		emojiIndex = 0;
		await reply(sock, msg, `Mode *EMOJI 😍* aktif.\nDaftar emoji: ${cfg.emoji_pool.join(' ')}\nSetiap status di-react 1 emoji (${cfg.react_random ? 'acak' : 'urut'}).`);
		return true;
	}
	if (sub === 'teks' || sub === 'text') {
		if (restText.toLowerCase() === 'off' || restText.toLowerCase() === 'mati' || !restText) {
			const cfg = writeConfig({ react_mode: 'emoji', react_text: '' });
			await reply(sock, msg, `Mode balik ke *EMOJI 😍*.\nDaftar emoji: ${cfg.emoji_pool.join(' ')}`);
			return true;
		}
		// Sanitasi seperti readsw: WA nolak react multi-baris (error 500).
		const clean = restText.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 500);
		const cfg = writeConfig({ react_mode: 'teks', react_text: clean });
		await reply(sock, msg, `Mode *TEKS 📝* aktif.\nTeks react: "${cfg.react_text}"\n(Pisah pakai | kalau mau banyak teks, contoh: \`.react teks SEMANGAT | KAMU BISA!\`)`);
		return true;
	}
	if (sub === 'acak' || sub === 'random') {
		const v = restText.toLowerCase();
		if (v === 'on' || v === '1' || v === 'ya' || v === 'nyala') {
			writeConfig({ react_random: true });
			await reply(sock, msg, 'Emoji acak *ON ✅* — tiap status dapat emoji acak dari daftar.');
			return true;
		}
		if (v === 'off' || v === '0' || v === 'tidak' || v === 'mati') {
			writeConfig({ react_random: false });
			emojiIndex = 0;
			await reply(sock, msg, 'Emoji acak *OFF ❌* — emoji jalan urut giliran.');
			return true;
		}
		await reply(sock, msg, `Pakai: \`.react acak on\` atau \`.react acak off\``);
		return true;
	}
	if (sub === 'help' || sub === 'bantuan' || sub === 'menu') {
		await reply(sock, msg, helpText());
		return true;
	}

	// Sub-command tidak dikenal -> tampilkan bantuan.
	await reply(sock, msg, `Perintah tidak dikenal: \`.react ${sub}\`\n\n${helpText()}`);
	return true;
}

/** Pilih 1 emoji: acak dari pool, atau urut giliran. */
function pickEmoji(cfg) {
	const pool = cfg.emoji_pool.filter(Boolean);
	if (!pool.length) return '';
	if (cfg.react_random) return pool[Math.floor(Math.random() * pool.length)];
	const emoji = pool[emojiIndex % pool.length];
	emojiIndex = (emojiIndex + 1) % pool.length;
	return emoji;
}

export default {
	name: 'autoreact',
	desc: 'Auto-react status: emoji atau teks, atur via .react (simple).',

	async onMessage(ctx) {
		const { sock, msg } = ctx;

		// Command dulu (dari owner) — berlaku di chat mana pun.
		if (await handleCommand(sock, msg)) return;

		// === AUTO REACT STATUS ===
		if (msg.key?.remoteJid !== 'status@broadcast') return;
		if (msg.key.fromMe) return;
		if (msg.message?.reactionMessage) return;
		if (msg.message?.protocolMessage) return;

		const cfg = readConfig();
		if (!cfg.autoreact) return;
		if (reactedIds.has(msg.key.id)) return;

		// FIX: pakai jidNormalizedUser (bawaan Baileys), JANGAN ubah server jadi
		// @s.whatsapp.net secara paksa. Status dari akun LID (@lid) harus
		// tetap @lid di statusJidList — kalau dipaksa jadi @s.whatsapp.net,
		// WA server nerima tanpa error tapi react TIDAK MUNCUL di status.
		// Ini persis cara readsw kirim react (jidNormalizedUser).
		const sender = jidNormalizedUser(msg.participant || msg.key.participant || '');
		const ownJid = jidNormalizedUser(sock.user?.id || '');

		try {
			if (cfg.react_mode === 'teks' && cfg.react_text.trim()) {
				// Mode teks: kirim tiap teks berurutan (pisah |, max 15, jeda 1 dtk) — sama seperti readsw.
				const parts = cfg.react_text
					.split('|')
					.map(s => s.replace(/[\r\n\t]+/g, ' ').trim())
					.filter(Boolean)
					.slice(0, 15);
				if (!parts.length) return;
				for (let i = 0; i < parts.length; i++) {
					await sock.sendMessage(
						'status@broadcast',
						{ react: { key: msg.key, text: parts[i] } },
						{ statusJidList: [ownJid, sender] }
					);
					if (i < parts.length - 1) await delay(1000);
				}
				console.log(`[auto-lihat-status] react teks: status dari ${sender.split('@')[0]} (${parts.length} teks)`);
			} else {
				// Mode emoji: kirim 1 emoji.
				const emoji = pickEmoji(cfg);
				if (!emoji) return;
				await sock.sendMessage(
					'status@broadcast',
					{ react: { key: msg.key, text: emoji } },
					{ statusJidList: [ownJid, sender] }
				);
				console.log(`[auto-lihat-status] react emoji ${emoji}: status dari ${sender.split('@')[0]}`);
			}
			reactedIds.add(msg.key.id);
			if (reactedIds.size > 1000) {
				for (const id of [...reactedIds].slice(0, 500)) reactedIds.delete(id);
			}
		} catch (err) {
			console.error('[auto-lihat-status] gagal react status:', err?.message || err);
		}
	},
};
