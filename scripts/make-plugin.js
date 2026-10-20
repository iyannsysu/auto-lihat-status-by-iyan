#!/usr/bin/env node
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
 * scripts/make-plugin.js — PEMBUAT PLUGIN baru.
 *
 * Pakai:
 *   node scripts/make-plugin.js <nama-plugin>
 *   contoh: node scripts/make-plugin.js autoreact
 *
 * Hasil: bikin file src/plugins/<nama-plugin>.js dari template,
 * lalu plugin otomatis ke-load pas bot restart (lewat _loader.js).
 * Tidak perlu ubah index.js sama sekali.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'src', 'plugins');

const rawName = (process.argv[2] || '').trim().toLowerCase();

if (!rawName) {
	console.error('Pakai: node scripts/make-plugin.js <nama-plugin>');
	console.error('Contoh: node scripts/make-plugin.js autoreact');
	process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(rawName)) {
	console.error('Nama plugin harus huruf kecil, diawali huruf, boleh angka & strip. Contoh: autoreact, anti-delete, my-fitur');
	process.exit(1);
}
if (rawName.startsWith('_')) {
	console.error('Nama plugin tidak boleh diawali _ (itu file sistem loader).');
	process.exit(1);
}

const fileName = `${rawName}.js`;
const filePath = path.join(PLUGINS_DIR, fileName);
if (fs.existsSync(filePath)) {
	console.error(`Plugin ${fileName} sudah ada — pilih nama lain atau edit langsung file-nya.`);
	process.exit(1);
}

const template = `/// ============================================================
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
 * plugins/${fileName} — ${rawName}.
 * Dibikin otomatis oleh scripts/make-plugin.js.
 *
 * Interface plugin:
 *  { name, desc, onMessage(ctx) } — ctx = { sock, msg, config }
 *  onMessage dipanggil index.js untuk SETIAP pesan masuk.
 *  Kalau pesan bukan untuk plugin ini, langsung return.
 */
export default {
	name: '${rawName}',
	desc: 'Deskripsi ${rawName} — isi di sini.',

	async onMessage(ctx) {
		const { sock, msg } = ctx;
		// TODO: isi logika plugin di sini.
		// Contoh: balas chat pribadi yang isinya "ping":
		// if (msg.key?.remoteJid?.endsWith('@s.whatsapp.net') && !msg.key.fromMe) {
		//   const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
		//   if (text.trim().toLowerCase() === 'ping') {
		//     await sock.sendMessage(msg.key.remoteJid, { text: 'pong' }, { quoted: msg });
		//   }
		// }
		return;
	},
};
`;

fs.mkdirSync(PLUGINS_DIR, { recursive: true });
fs.writeFileSync(filePath, template);
console.log(`✅ Plugin baru: src/plugins/${fileName}`);
console.log('   Restart bot biar ke-load, lalu isi TODO di file-nya.');
