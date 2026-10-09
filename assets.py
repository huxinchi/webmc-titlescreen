#!/usr/bin/env python3
"""
extract_assets.py —— 从 MC jar、Realms jar 和 assets 索引提取资源

用法:
    python extract_assets.py <jar 路径> <索引 json 路径> [<realm jar 路径>]

例:
    python extract_assets.py \
        ~/.minecraft/versions/1.20.4/1.20.4.jar \
        ~/.minecraft/assets/indexes/1.20.4.json \
        ~/.minecraft/versions/1.20.4/realms-1.20.4.jar

映射表 mapping.json（与本脚本同目录），每条格式:
    { "from": "jar" | "realm" | "index", "path": "<源路径>", "to": "<目标路径>" }
    { "script": "<python 代码>" }

来源说明:
    jar     主游戏 jar
    realm   Realms jar（第三个参数指定；未提供时该来源条目跳过并警告）
    index   assets 索引（objects/<xx>/<hash>）

规则:

  源路径 path:
    - 以 / 结尾              → 文件夹
    - jar/realm 里存在 path+'/xxx' → 文件夹
    - 否则                    → 单文件

  目标路径 to（以 resources/ 为根）:
    - 以 / 结尾 或为空        → 目标文件夹（单文件源会用原名）
    - 否则                    → 完整目标路径

  jar/realm 来源:
    - 单文件 → 直接复制到 to
    - 文件夹 → 递归复制整个文件夹到 to/（保留内部结构）

  index 来源:
    - 文件在 objects/<xx>/<hash>，提取时按原始文件名重命名
    - 文件夹 → 前缀匹配，递归提取，保留相对结构
    - 目标文件夹不存在时自动创建

  script 条目:
    - 直接 exec 内容，作用域里注入:
        out_root       输出根目录 (Path)
        jar_path       jar 路径 (Path)
        realm_path     realm jar 路径 (Path | None)
        assets_root    assets 根目录 (Path)
        index          {相对路径: hash}
        mapping        完整映射表 (list)
        log(msg, level)        打印辅助
        ensure_parent(p)       建父目录
        Path, shutil, json, zipfile, os, sys   常用模块
"""

import sys
import os
import json
import zipfile
import shutil
from contextlib import nullcontext
from pathlib import Path


# ==========================================================
# 工具
# ==========================================================

def log(msg, level='INFO'):
    prefix = {'INFO': '  ', 'OK': '✓ ', 'WARN': '! ', 'ERR': '✗ '}.get(level, '  ')
    print(f'{prefix}{msg}')


def ensure_parent(p):
    Path(p).parent.mkdir(parents=True, exist_ok=True)


def strip_slashes(s):
    return s.lstrip('/').rstrip('/')


# ==========================================================
# 加载
# ==========================================================

def load_index(index_path):
    """读 assets/indexes/xxx.json → {相对路径: hash}"""
    with open(index_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return {k: v['hash'] for k, v in data.get('objects', {}).items()}


def load_mapping(p):
    if not p.exists():
        log(f'映射表不存在: {p}', 'ERR')
        sys.exit(1)
    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f)


# ==========================================================
# 源类型判断
# ==========================================================

def zip_is_folder(zip_names, src_clean):
    prefix = src_clean + '/'
    for n in zip_names:
        if n.startswith(prefix):
            return True
    return False


# ==========================================================
# zip 提取（jar 和 realm 共用）
# ==========================================================

def zip_extract_file(zf, src, dst_file):
    try:
        ensure_parent(dst_file)
        with zf.open(src) as s, open(dst_file, 'wb') as d:
            shutil.copyfileobj(s, d)
        return 1
    except KeyError:
        log(f'zip 中找不到: {src}', 'WARN')
        return 0
    except Exception as e:
        log(f'提取失败 {src}: {e}', 'ERR')
        return 0


def zip_extract_folder(zf, src, dst_dir):
    prefix = src + '/'
    count = 0
    for name in zf.namelist():
        if name.endswith('/'):
            continue
        if not name.startswith(prefix):
            continue
        rel = name[len(prefix):]
        out = Path(dst_dir) / rel
        ensure_parent(out)
        try:
            with zf.open(name) as s, open(out, 'wb') as d:
                shutil.copyfileobj(s, d)
            count += 1
        except Exception as e:
            log(f'提取失败 {name}: {e}', 'ERR')
    return count


# ==========================================================
# index 提取
# ==========================================================

def index_extract_file(index, index_root, key, dst_file):
    h = index.get(key)
    if h is None:
        log(f'索引中找不到: {key}', 'WARN')
        return 0
    src = index_root / 'objects' / h[:2] / h
    if not src.exists():
        log(f'对象缺失: {src}', 'WARN')
        return 0
    ensure_parent(dst_file)
    try:
        shutil.copy(src, dst_file)
        return 1
    except Exception as e:
        log(f'拷贝失败 {key}: {e}', 'ERR')
        return 0


def index_extract_folder(index, index_root, prefix_clean, dst_dir):
    prefix = prefix_clean + '/'
    count = 0
    for key, h in index.items():
        if not key.startswith(prefix):
            continue
        rel = key[len(prefix):]
        out = Path(dst_dir) / rel
        src = index_root / 'objects' / h[:2] / h
        if not src.exists():
            log(f'对象缺失: {src}', 'WARN')
            continue
        ensure_parent(out)
        try:
            shutil.copy(src, out)
            count += 1
        except Exception as e:
            log(f'拷贝失败 {key}: {e}', 'ERR')
    return count


# ==========================================================
# script 条目
# ==========================================================

def run_script(code, ctx):
    """执行 script 条目。

    注入的变量：
        out_root       输出根目录 (Path)
        jar_path       jar 路径 (Path)
        realm_path     realm jar 路径 (Path | None)
        assets_root    assets 根目录 (Path)
        index          {相对路径: hash}
        mapping        完整映射表 (list)
        log(msg, level)        打印辅助
        ensure_parent(p)       建父目录
        Path, shutil, json, zipfile, os, sys
    """
    env = dict(ctx)
    env['log'] = log
    env['ensure_parent'] = ensure_parent
    env['Path'] = Path
    env['shutil'] = shutil
    env['json'] = json
    env['zipfile'] = zipfile
    env['os'] = os
    env['sys'] = sys
    try:
        exec(code, env, env)
        return 0, 0
    except Exception as e:
        log(f'script 执行失败: {e}', 'ERR')
        return 0, 1


# ==========================================================
# 单条映射
# ==========================================================

def process_entry(entry, zf, jar_names, zf_realm, realm_names,
                  index, index_root, out_root,
                  jar_path, realm_path, mapping):

    # ---------- script ----------
    if 'script' in entry:
        ctx = {
            'out_root':    out_root,
            'jar_path':    jar_path,
            'realm_path':  realm_path,
            'assets_root': index_root,
            'index':       index,
            'mapping':     mapping,
        }
        return run_script(entry['script'], ctx)

    source = entry.get('from')
    src    = entry.get('path', '')
    dst    = entry.get('to', '')

    if not source or not src:
        log(f'条目缺少字段: {entry}', 'WARN')
        return 0, 1

    # 目标归一化
    dst_is_dir = dst.endswith('/') or dst == '' or dst == '/'
    dst_rel = strip_slashes(dst)
    dst_abs = (out_root / dst_rel) if dst_rel else out_root

    # 源归一化
    src_clean = strip_slashes(src)
    src_is_dir = src.endswith('/')
    # ---------- preset ----------
    if source == 'preset':
        preset_root = Path(__file__).parent / 'preset_assets'
        src_path = preset_root / src_clean
        if not src_path.exists():
            log(f'[preset] {src}  →  preset_assets/ 中不存在', 'WARN')
            return 0, 1
    
        # preset_assets 是摊平的，src_clean 一定是单文件
        dst_file = (Path(dst_abs) / Path(src_clean).name) if dst_is_dir else Path(dst_abs)
        ensure_parent(dst_file)
        try:
            shutil.copy(src_path, dst_file)
            log(f'[preset file] {src}  →  {dst}', 'OK')
            return 1, 0
        except Exception as e:
            log(f'[preset] 拷贝失败 {src}: {e}', 'ERR')
            return 0, 1
    # ---------- jar / realm ----------
    if source in ('jar', 'realm'):
        if source == 'jar':
            zf_use    = zf
            names_use = jar_names
            tag       = 'jar  '
        else:
            if zf_realm is None:
                log(f'[realm] {src}  →  跳过（未提供 realm jar 路径）', 'WARN')
                return 0, 1
            zf_use    = zf_realm
            names_use = realm_names
            tag       = 'realm'

        is_folder = src_is_dir or zip_is_folder(names_use, src_clean)

        if is_folder:
            n = zip_extract_folder(zf_use, src_clean, dst_abs)
            if n > 0:
                log(f'[{tag} dir ] {src}  →  {dst}  ({n} 文件)', 'OK')
                return n, 0
            log(f'[{tag} dir ] {src}  →  空', 'WARN')
            return 0, 1

        # 单文件
        dst_file = (Path(dst_abs) / Path(src_clean).name) if dst_is_dir else Path(dst_abs)
        n = zip_extract_file(zf_use, src_clean, dst_file)
        if n > 0:
            log(f'[{tag} file] {src}  →  {dst}', 'OK')
            return n, 0
        return 0, 1

    # ---------- index ----------
    elif source == 'index':
        # 先看是不是精确 key（单文件）
        if not src_is_dir and src_clean in index:
            dst_file = (Path(dst_abs) / Path(src_clean).name) if dst_is_dir else Path(dst_abs)
            n = index_extract_file(index, index_root, src_clean, dst_file)
            if n > 0:
                log(f'[idx  file] {src}  →  {dst}', 'OK')
                return n, 0
            return 0, 1

        # 否则按前缀（文件夹）处理
        n = index_extract_folder(index, index_root, src_clean, dst_abs)
        if n > 0:
            log(f'[idx  dir ] {src}  →  {dst}  ({n} 文件)', 'OK')
            return n, 0
        log(f'[idx  dir ] {src}  →  空', 'WARN')
        return 0, 1

    else:
        log(f'未知来源: {source}', 'WARN')
        return 0, 1


# ==========================================================
# 主流程
# ==========================================================

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    jar_path   = Path(sys.argv[1]).expanduser()
    index_path = Path(sys.argv[2]).expanduser()
    realm_path = Path(sys.argv[3]).expanduser() if len(sys.argv) >= 4 else None

    if not jar_path.exists():
        log(f'jar 不存在: {jar_path}', 'ERR')
        sys.exit(1)
    if not index_path.exists():
        log(f'索引不存在: {index_path}', 'ERR')
        sys.exit(1)
    if realm_path is not None and not realm_path.exists():
        log(f'realm jar 不存在: {realm_path}', 'WARN')
        log('realm 来源条目将被跳过', 'WARN')
        realm_path = None

    # 从 <assets>/indexes/xxx.json 上溯两级拿到 assets 根
    assets_root = index_path.parent.parent
    if not (assets_root / 'objects').exists():
        log(f'找不到 objects 目录: {assets_root / "objects"}', 'ERR')
        log('索引 json 应位于 <assets>/indexes/xxx.json', 'ERR')
        sys.exit(1)

    here         = Path(__file__).parent
    mapping_path = here / 'mapping.json'
    out_root     = here / 'assets'

    log(f'jar:    {jar_path}')
    log(f'索引:   {index_path}')
    log(f'realm:  {realm_path if realm_path else "(未提供)"}')
    log(f'assets: {assets_root}')
    log(f'映射:   {mapping_path}')
    log(f'输出:   {out_root}')
    print()

    mapping = load_mapping(mapping_path)
    index   = load_index(index_path)
    out_root.mkdir(parents=True, exist_ok=True)

    ok_total  = 0
    err_total = 0

    with zipfile.ZipFile(jar_path) as zf:
        jar_names = set(zf.namelist())

        realm_ctx = zipfile.ZipFile(realm_path) if realm_path else nullcontext(None)
        with realm_ctx as zf_realm:
            realm_names = set(zf_realm.namelist()) if zf_realm else set()

            for i, entry in enumerate(mapping):
                log(f'[{i+1}/{len(mapping)}]')
                ok, err = process_entry(
                    entry,
                    zf, jar_names,
                    zf_realm, realm_names,
                    index, assets_root, out_root,
                    jar_path, realm_path, mapping
                )
                ok_total  += ok
                err_total += err

    print()
    log(f'完成: {ok_total} 文件, {err_total} 失败',
        'OK' if err_total == 0 else 'WARN')


if __name__ == '__main__':
    main()