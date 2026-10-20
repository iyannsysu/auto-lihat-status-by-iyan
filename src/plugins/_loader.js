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
 * plugins/_loader.js — pemuat plugin.
 *
 * Cara kerja:
 *  - baca semua file *.js di folder plugins/ (kecuali yang diawali _)
 *  - import masing-masing, ambil default export-nya
 *  - validasi: harus punya { name: string, onMessage: function }
 *  - kembalikan array plugin yang lolos, urut abjad nama file
 *
 * Tambah fitur baru = tambah 1 file di plugins/ (atau pakai
 * `node scripts/make-plugin.js <nama>`), tanpa ubah index.js.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function loadPlugins(pluginsDir) {
	const files = fs
		.readdirSync(pluginsDir)
		.filter(f => f.endsWith('.js') && !f.startsWith('_'))
		.sort();

	const plugins = [];
	for (const file of files) {
		try {
			const mod = await import(pathToFileURL(path.join(pluginsDir, file)).href);
			const plugin = mod.default;
			if (!plugin || typeof plugin.name !== 'string' || typeof plugin.onMessage !== 'function') {
				console.warn(`[loader] skip ${file}: harus export default { name, onMessage }`);
				continue;
			}
			plugins.push(plugin);
			console.log(`[loader] loaded: ${plugin.name} (${file})`);
		} catch (err) {
			console.error(`[loader] gagal load ${file}:`, err?.message || err);
		}
	}
	return plugins;
}
