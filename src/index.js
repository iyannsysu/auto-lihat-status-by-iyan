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
 * auto lihat status by iyan — index.js (entry point, HANYA bootstrap)
 *
 * Tugas file ini CUMA:
 *  1. konek ke WhatsApp (pairing code / QR, auto-reconnect)
 *  2. load semua plugin dari src/plugins/ lewat _loader.js
 *  3. teruskan tiap pesan masuk ke plugin.onMessage(ctx)
 *
 * Semua LOGIKA FITUR tinggal di plugins/ — mau tambah fitur,
 * bikin file baru di plugins/ (atau `node scripts/make-plugin.js <nama>`),
 * jangan ubah file ini.
 *
 * Struktur:
 *  src/index.js              <- file ini (bootstrap)
 *  src/helper/config.js      <- baca config.json
 *  src/plugins/_loader.js    <- pemuat plugin
 *  src/plugins/autoread.js   <- fitur: auto-lihat status + SW grup
 *  src/plugins/autoreact.js  <- fitur: auto-react status (emoji / teks)
 *  src/plugins/menu.js       <- fitur: .menu foto bergaya bot MD
 *  assets/menu.jpg           <- foto banner untuk .menu
 *  scripts/make-plugin.js    <- pembuat plugin baru
 */

import 'dotenv/config';
import path from 'path';
import makeWASocket, {
	delay,
	useMultiFileAuthState,
	DisconnectReason,
	Browsers,
	makeCacheableSignalKeyStore,
	fetchLatestBaileysVersion,
} from 'baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { HttpsProxyAgent } from 'https-proxy-agent';

import { readConfig } from './helper/config.js';
import { loadPlugins } from './plugins/_loader.js';

// Satu error di plugin tidak boleh membunuh bot.
process.on('uncaughtException', err => console.error('[auto-lihat-status] uncaught:', err?.message || err));
process.on('unhandledRejection', err => console.error('[auto-lihat-status] unhandled:', err?.message || err));

const BASE_DIR = process.cwd();
const SESSION_NAME = (process.env.BOT_SESSION_NAME || 'autoread').trim() || 'autoread';
const SESSION_DIR = path.join(BASE_DIR, 'sessions', SESSION_NAME);
const PLUGINS_DIR = path.join(BASE_DIR, 'src', 'plugins');

// Proxy: WebSocket Baileys harus lewat HttpsProxyAgent.
// Fetch bawaan Node sudah pakai proxy env otomatis — jangan pass fetchAgent.
const PROXY_URL = process.env.https_proxy || process.env.HTTPS_PROXY || '';
const wsAgent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;

const logger = pino({ level: process.env.BOT_LOGGER_LEVEL || 'silent' }).child({ class: 'auto-lihat-status-by-iyan' });

let reconnectCount = 0;

async function main() {
	console.log(`[auto-lihat-status] session dir: ${SESSION_DIR}`);
	if (reconnectCount > 0) console.warn(`[auto-lihat-status] reconnecting... attempt ${reconnectCount}`);

	const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
	const { version, isLatest } = await fetchLatestBaileysVersion();
	console.info(`[auto-lihat-status] WA version: ${version.join('.')}${isLatest ? '' : ' (latest recommended)'}`);

	const sock = makeWASocket({
		version,
		logger,
		agent: wsAgent,
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ class: 'Session' })),
		},
		browser: Browsers.appropriate('Chrome'),
		syncFullHistory: false,
		getMessage: async () => '',
	});

	// Pairing code — tunggu handshake noise selesai dulu (fix 401 readsw:
	// pairing max ~20 dtk setelah socket dibuat, kode kedaluwarsa ~2 menit).
	const pairingNumber = (process.env.BOT_NUMBER_PAIR || '').trim();
	if (pairingNumber && !sock.authState.creds?.registered) {
		try {
			const phone = pairingNumber.replace(/[^0-9]/g, '');
			await delay(20000);
			const code = await sock.requestPairingCode(phone);
			console.log(`[auto-lihat-status] pairing code: ${code?.match(/.{1,4}/g)?.join('-') || code}`);
		} catch (err) {
			console.error('[auto-lihat-status] gagal minta pairing code, cek BOT_NUMBER_PAIR:', err?.message || err);
			process.exit(1);
		}
	}

	sock.ev.on('creds.update', saveCreds);

	sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
		if (qr && !pairingNumber) {
			qrcode.generate(qr, { small: true }, code => {
				console.log('[auto-lihat-status] scan QR ini:\n');
				console.log(code);
			});
		}

		if (connection === 'open') {
			console.log(`[auto-lihat-status] connected ✅ ${sock.user?.id || ''} (${sock.user?.name || ''})`);
			console.log(`[auto-lihat-status] autoread: ${readConfig().autoread ? 'ON' : 'OFF'} (ubah di config.json, tanpa restart)`);
		}

		if (connection === 'close') {
			const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode || 0;

			if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.forbidden) {
				console.error('[auto-lihat-status] session logout / expired — hapus sessions/ lalu pairing ulang.');
				process.exit(1);
			}
			if (statusCode === DisconnectReason.restartRequired) {
				console.info('[auto-lihat-status] restart required, reconnect...');
				await main();
				return;
			}
			if (process.env.BOT_MAX_RETRIES && reconnectCount >= Number(process.env.BOT_MAX_RETRIES)) {
				console.error(`[auto-lihat-status] max retries (${process.env.BOT_MAX_RETRIES}) tercapai, exit.`);
				process.exit(1);
			}
			reconnectCount++;
			const waitSec = Math.min(5 * reconnectCount, 30);
			console.error(`[auto-lihat-status] putus (code ${statusCode}), reconnect ${waitSec} dtk...`);
			await delay(waitSec * 1000);
			await main();
		}
	});

	// Load plugin sekali saat boot. (Restart bot kalau tambah plugin baru.)
	const plugins = await loadPlugins(PLUGINS_DIR);
	console.log(`[auto-lihat-status] ${plugins.length} plugin aktif: ${plugins.map(p => p.name).join(', ') || '-'}`);

	sock.ev.on('messages.upsert', async ({ messages }) => {
		for (const msg of messages) {
			// Config dibaca fresh tiap pesan (on/off tanpa restart).
			const config = readConfig();
			for (const plugin of plugins) {
				try {
					await plugin.onMessage({ sock, msg, config });
				} catch (err) {
					// 1 plugin error jangan matikan plugin lain / bot.
					console.error(`[auto-lihat-status] plugin ${plugin.name} error:`, err?.message || err);
				}
			}
		}
	});
}

main().catch(err => {
	console.error('[auto-lihat-status] fatal:', err);
	process.exit(1);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
	process.on(sig, () => {
		console.log(`\n[auto-lihat-status] [${sig}] graceful shutdown...`);
		process.exit(0);
	});
}
