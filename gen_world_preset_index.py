#!/usr/bin/env python3
"""
gen_world_preset_index.py

扫描 resources/world_presets/flat/ 下的所有 .json 文件，
生成同目录下 index.js，包含所有 preset id 清单。

用法：
    cd <项目根目录>
    python3 gen_world_preset_index.py
"""
import os
import sys

PRESET_DIR = 'assets/world_presets/flat'
OUT_FILE   = os.path.join(PRESET_DIR, 'index.js')


def main():
    if not os.path.isdir(PRESET_DIR):
        print(f'[错误] 目录不存在: {PRESET_DIR}', file=sys.stderr)
        print('   请先把 jar 里的 flat_level_generator_preset 提取到 resources/world_presets/flat/', file=sys.stderr)
        sys.exit(1)

    names = []
    for f in os.listdir(PRESET_DIR):
        if not f.endswith('.json'):
            continue
        name = f[:-5]
        if name:
            names.append(name)

    names.sort()

    lines = [
        '/* ==========================================================',
        '   超平坦世界预设清单',
        '   由 gen_world_preset_index.py 自动生成',
        '   每项对应同目录下的 <name>.json',
        '   ========================================================== */',
        'window.__mcWorldPresets = [',
    ]
    for n in names:
        lines.append(f"  '{n}',")
    lines += ['];', '']

    with open(OUT_FILE, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(lines))

    print(f'生成: {OUT_FILE}  共 {len(names)} 项')


if __name__ == '__main__':
    main()