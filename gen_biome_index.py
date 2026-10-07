#!/usr/bin/env python3
"""
gen_biome_index.py

扫描 assets/biome/ 下的所有 .json 文件，
生成 assets/biome/index.js，包含所有 biome id 的清单。

用法：
    cd <项目根目录>
    python3 gen_biome_index.py
"""
import os
import sys

BIOME_DIR = 'assets/biome'
OUT_FILE  = os.path.join(BIOME_DIR, 'index.js')


def main():
    if not os.path.isdir(BIOME_DIR):
        print(f'[错误] 目录不存在: {BIOME_DIR}', file=sys.stderr)
        print('   请先把 jar 里的 biome json 提取到 assets/biome/', file=sys.stderr)
        sys.exit(1)

    names = []
    for f in os.listdir(BIOME_DIR):
        if not f.endswith('.json'):
            continue
        name = f[:-5]          # 去掉 .json
        if not name:
            continue
        names.append(name)

    names.sort()

    lines = [
        '/* ==========================================================',
        '   生物群系清单',
        '   由 gen_biome_index.py 自动生成',
        '   每项对应同目录下的 <name>.json',
        '   ========================================================== */',
        'window.__mcBiomes = [',
    ]
    for n in names:
        lines.append(f"  '{n}',")
    lines += ['];', '']

    with open(OUT_FILE, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(lines))

    print(f'生成: {OUT_FILE}  共 {len(names)} 项')


if __name__ == '__main__':
    main()