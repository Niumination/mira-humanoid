#!/usr/bin/env python3
"""banding.py — gambar banding 4 panel: asli | Niu live (P13) | Niu P14 | peta selisih P14.

Pakai: python3 tools/banding.py cap/median-apex-asli.png cap/median-apex-niu.png \
       cap/median-apex-p14b.png report/banding-apex-idle.png "APEX IDLE"
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

asli, niu, p14, out = sys.argv[1:5]
judul = sys.argv[5] if len(sys.argv) > 5 else ''

A = Image.open(asli).convert('RGB')
B = Image.open(niu).convert('RGB')
C = Image.open(p14).convert('RGB')
W, H = A.size
SK = 0.5
w, h = int(W * SK), int(H * SK)

d = np.abs(np.asarray(C, np.float32) - np.asarray(A, np.float32)).mean(2)
d = np.clip(d / 64.0, 0, 1)
heat = np.zeros((H, W, 3), np.uint8)
heat[..., 0] = (d * 255).astype(np.uint8)
heat[..., 1] = (np.clip(d * 2 - 1, 0, 1) * 255).astype(np.uint8)
D = Image.fromarray(heat)

PAD, TOP = 8, 26
kanvas = Image.new('RGB', (w * 4 + PAD * 5, h + TOP + PAD * 2), (16, 16, 18))
dr = ImageDraw.Draw(kanvas)
label = ['ASLI (acuan)', 'NIU LIVE (P13)', 'NIU P14 (lokal)', 'SELISIH P14 vs ASLI']
for i, im in enumerate([A, B, C, D]):
    x = PAD + i * (w + PAD)
    kanvas.paste(im.resize((w, h), Image.LANCZOS), (x, TOP))
    dr.text((x + 4, 8), label[i], fill=(220, 220, 225))
if judul:
    dr.text((PAD, h + TOP + 6), judul, fill=(150, 150, 160))
kanvas.save(out)
print('tulis', out, kanvas.size)
