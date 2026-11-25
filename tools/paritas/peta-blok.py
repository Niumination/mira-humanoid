#!/usr/bin/env python3
"""peta-blok.py — peta |selisih| per blok antara median tangkapan dan acuan."""
import sys
import numpy as np
from PIL import Image

ref = np.asarray(Image.open(sys.argv[1]).convert('RGB'), dtype=np.float32)
cur = np.asarray(Image.open(sys.argv[2]).convert('RGB'), dtype=np.float32)
gx, gy = 12, 8
h, w, _ = ref.shape
d = np.abs(cur - ref).mean(axis=2)
print(f'{sys.argv[2].split("/")[-1]} vs {sys.argv[1].split("/")[-1]}  MAE {d.mean():.2f}')
for i in range(gy):
    print('  ' + ' '.join(f'{d[i*h//gy:(i+1)*h//gy, j*w//gx:(j+1)*w//gx].mean():6.1f}' for j in range(gx)))
