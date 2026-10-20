# 🤖 AUTO LIHAT STATUS BY IYAN

> ⚡ **Built from zero. Two missions. Zero drama.**
>
> Bot WhatsApp **super-ringan** dari nol — tugasnya cuma dua: **status auto-kebaca** 👁️ + **status auto-react** 😍.
> Mesin autoread + autoreact warisan readsw, dipangkas habis sampai tinggal intinya:
> **tanpa reply • tanpa forward • tanpa menu ribet.**
>
> Bersih. Cepat. Jalan terus. 👁️✅

> **© 2026 Iyan. Seluruh hak cipta dilindungi. / All rights reserved.**
>
> **[ID]** Script ini dibuat oleh Iyan. Dilarang keras memperjualbelikan, mengklaim ulang, atau mendistribusikan ulang script ini — baik sebagian maupun seluruhnya — tanpa izin tertulis dari pembuat. Jika menemukan pihak yang memperjualbelikan script ini, segera hubungi pembuat via WhatsApp: **+6282161429908**.
>
> **[EN]** This script was created by Iyan. Reselling, rebranding, or redistributing this script — in whole or in part — without written permission from the creator is strictly prohibited. If you find anyone reselling this script, please contact the creator immediately via WhatsApp: **+6282161429908**.

Struktur **plugin** — tiap fitur 1 file, gampang nambah.

## Yang dilakukan bot ini
- **Auto-lihat status** 👁️: setiap ada status baru (`status@broadcast`), bot tandai **dibaca** via `readMessages()` (= `sendReceipts` + `read`/`read-self` sesuai privasi akun, persis seperti readsw).
- **SW grup** 👥: status yang diposting **ke grup** (dibungkus `groupStatusMessage/V2`) ikut dibaca + di-react juga — react dikirim ke JID grup langsung, seperti di readsw. Bisa dimatikan via `.swgrup off`. Chat grup biasa tetap diabaikan total.
- **Auto-react status** 😍: setiap status di-react otomatis — mode **emoji** (1 emoji, acak / urut) atau mode **teks** (teks berurutan, pisah pakai `|`, jeda 1 dtk — persis seperti readsw).
- **Menu foto** 🖼️: `.menu` mengirim foto banner + daftar perintah bergaya bot MD profesional, status ON/OFF-nya live dari config.
- Skip status sendiri + reaction (anti-loop). Dedup: 1 status cuma dibaca + di-react 1x.
- Config dibaca dari disk tiap status → on/off tanpa restart. Atau atur lewat command (lihat bawah).

## Yang TIDAK ada (saat ini)
Reply, forward ke Telegram/WA, status saver, anti-delete, story, bio, jadibot. Nol — tapi gampang ditambah lewat plugin baru.

## Cara pakai
1. `cp .env.example .env` lalu isi `BOT_NUMBER_PAIR` (contoh: `628xxxx`) — nomor WA **beda** dari readsw.
2. `npm install`
3. `bash run.sh` (supervisor: auto-restart, single instance via flock) atau `npm start` sekali jalan.
4. Masukkan pairing code di WA (pengaturan → perangkat tertaut → tautkan dengan nomor telepon). Kode kedaluwarsa ~2 menit.
5. Tes: minta teman posting status → cek log: `[auto-lihat-status] dibaca: ...` + `[auto-lihat-status] react emoji ...`, dan di HP teman statusnya centang biru + ada react.

## Perintah — SIMPLE, mudah diingat
Semua perintah dikirim **dari akun bot sendiri** (pesan fromMe, di chat mana pun). Prefix boleh `.` `/` `!` — contoh pakai `.`.

**Umum:**
| Perintah | Artinya |
|---|---|
| `.menu` | Menu utama: foto banner + daftar perintah (alias `.help` / `.bantuan`) |

**Lihat status:**
| Perintah | Artinya |
|---|---|
| `.read on` | Nyalain auto-lihat |
| `.read off` | Matiin auto-lihat |
| `.swgrup on` | SW grup ikut dibaca + di-react |
| `.swgrup off` | SW grup tidak diproses (hanya status pribadi) |

**React status (yang utama):**
| Perintah | Artinya |
|---|---|
| `.react on` | Nyalain auto react |
| `.react off` | Matiin auto react |
| `.react emoji ❤️ 🔥 😍` | Pakai **emoji**, sekalian set daftar emoji |
| `.react teks SEMANGAT YA :)` | Pakai **teks**, sekalian set teks react |
| `.react teks off` | Balik ke mode emoji |
| `.react acak on` | Emoji dipilih **acak** dari daftar |
| `.react acak off` | Emoji jalan **urut** giliran |
| `.react cek` | Lihat setting react saat ini |
| `.react` | Bantuan react |

**Contoh cepat:**
- `.react emoji ❤️ 🔥` → tiap status di-react ❤️ / 🔥 (1 emoji per status)
- `.react teks SEMANGAT YA :) | KAMU BISA!` → tiap status di-react 2 teks berurutan, jeda 1 detik
- `.react teks SEMANGAT YA :)` → tiap status di-react teks itu saja

## On / off tanpa restart (cara lain)
Edit `config.json` langsung, tanpa restart:
```json
{ "autoread": true, "swgrup": true, "autoreact": true, "react_mode": "emoji",
  "emoji_pool": ["❤️","😍","🔥"], "react_random": true, "react_text": "" }
```
- `react_mode: "teks"` + `react_text: "SEMANGAT"` → mode teks. Kosongkan `react_text` untuk balik ke emoji.

## Stop
`kill $(cat bot-sup.pid)` — matikan supervisor + bot.

## Struktur file (dipisah per file)
- `src/index.js` — entry point, HANYA bootstrap: konek WA + load plugin + teruskan pesan ke plugin. Tanpa logika fitur.
- `src/helper/config.js` — baca + tulis `config.json` dari disk.
- `src/plugins/_loader.js` — pemuat plugin (scan `plugins/*.js`, validasi `{ name, onMessage }`).
- `src/plugins/autoread.js` — fitur: auto-lihat status + SW grup + command `.read` / `.swgrup`.
- `src/plugins/autoreact.js` — fitur: auto-react status (emoji + teks) + command `.react`.
- `src/plugins/menu.js` — fitur: `.menu` / `.help` foto banner bergaya bot MD (foto dari `assets/menu.jpg`; tanpa foto, menu terkirim sebagai teks).
- `scripts/make-plugin.js` — **pembuat plugin baru**.
- `config.json` — setting bot (autoread, autoreact, emoji, teks, dll).
- `run.sh` — supervisor (flock + auto-restart)
- `sessions/autoread/` — session WA (jangan dibagikan / di-push)

## Tambah fitur baru (pembuat plugin)
```bash
node scripts/make-plugin.js namafitur
# -> bikin src/plugins/namafitur.js dari template
# -> isi TODO di file-nya
# -> restart bot, plugin langsung ke-load
```

Interface plugin:
```js
export default {
  name: 'namaku',
  desc: '...',
  async onMessage({ sock, msg, config }) {
    // kalau pesan bukan untukku, langsung return
  },
};
```
1 plugin error tidak mematikan plugin lain / bot — index.js bungkus tiap `onMessage` dengan try/catch.
