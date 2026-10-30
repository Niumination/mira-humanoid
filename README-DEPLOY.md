# MIRA Humanoid — rebuild (WIP, langkah 1 & 7 selesai)

```bash
npm install
npm run dev         # http://localhost:5190
npm run build       # dist/
vercel deploy       # lalu kirim URL-nya
```

## Status
| langkah | isi | status |
|---|---|---|
| P1.3–P1.5 | verifikasi 82 param / 20 seksi / 7 alias / 13 query param vs bundle | ✅ 82/82 |
| 1 | entry screen + seluruh baris tombol | ✅ Gerbang A 8/8 |
| 7 | panel 82 slider + `?dial.<key>=` + localStorage + 7 alias | ✅ Gerbang B 10/10 |
| 2–6, 8 | mesin garis (wire shader), ignition, audio, state, hand tracking, bloom | ⬜ belum |

Deploy APEX yang sudah live: https://niu-humanoid.vercel.app
