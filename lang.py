#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 Minecraft 提取语言文件到 assets/lang/：
  1. 从 versions/<ver>/<ver>.jar 里提取 assets/minecraft/lang/en_us.json
  2. 从 assets/objects/ 里提取其它所有语言
  3. 生成 assets/lang/index.json（含 name / region）
  4. 更新 js/i18n.js 里的 SUPPORTED 数组

用法：
    python3 extract_langs.py
    python3 extract_langs.py --jar /storage/emulated/0/FCL/.minecraft/versions/26.2-Fabric/26.2-Fabric.jar
    python3 extract_langs.py --assets /storage/emulated/0/FCL/.minecraft/assets
    python3 extract_langs.py --out assets/lang --i18n js/i18n.js
"""

import os
import re
import json
import shutil
import zipfile
import argparse

DEFAULT_ASSETS = "/storage/emulated/0/FCL/.minecraft/assets"
DEFAULT_JAR    = "/storage/emulated/0/FCL/.minecraft/versions/26.2-Fabric/26.2-Fabric.jar"
DEFAULT_OUT    = "assets/lang"
DEFAULT_I18N   = "js/i18n.js"


# ==============================================================
# jar 部分
# ==============================================================

def extract_from_jar(jar_path, out_dir, verbose=True):
    """从 jar 里提取 assets/minecraft/lang/en_us.json"""
    if not os.path.isfile(jar_path):
        if verbose:
            print("[!] jar 不存在:", jar_path)
        return []

    found = []
    try:
        with zipfile.ZipFile(jar_path, "r") as zf:
            for name in zf.namelist():
                m = re.match(r"^assets/minecraft/lang/([a-z]{2,3}_[a-z]{2,3})\.json$",
                             name, re.IGNORECASE)
                if not m:
                    continue
                code = m.group(1).lower()
                dst = os.path.join(out_dir, code + ".json")
                with zf.open(name) as src, open(dst, "wb") as out:
                    shutil.copyfileobj(src, out)
                found.append(code)
                if verbose:
                    print("[i] jar 提取:", code)
    except Exception as e:
        print("[!] jar 读取失败:", e)

    return found


# ==============================================================
# assets objects 部分
# ==============================================================

def find_latest_index(assets_dir):
    idx_dir = os.path.join(assets_dir, "indexes")
    if not os.path.isdir(idx_dir):
        raise SystemExit("找不到 indexes 目录: " + idx_dir)

    files = [f for f in os.listdir(idx_dir) if f.endswith(".json")]
    if not files:
        raise SystemExit("indexes 目录下没有 json 文件")

    def ver(f):
        try:
            return int(f[:-5])
        except ValueError:
            return -1

    files.sort(key=ver, reverse=True)
    return os.path.join(idx_dir, files[0])


def extract_from_assets(assets_dir, out_dir, verbose=True):
    """从 objects 里提取所有语言文件"""
    index_path = find_latest_index(assets_dir)
    if verbose:
        print("[i] 使用索引:", index_path)

    with open(index_path, "r", encoding="utf-8") as f:
        idx = json.load(f)

    objects = idx.get("objects", {})
    if not objects:
        raise SystemExit("索引里没有 objects 字段")

    pattern = re.compile(r"^minecraft/lang/([a-z]{2,3}_[a-z]{2,3})\.json$", re.IGNORECASE)
    found = []

    for path, meta in objects.items():
        m = pattern.match(path)
        if not m:
            continue
        code = m.group(1).lower()
        h = meta.get("hash")
        if not h:
            continue

        src = os.path.join(assets_dir, "objects", h[:2], h)
        if not os.path.exists(src):
            if verbose:
                print("[!] 对象不存在:", src)
            continue

        dst = os.path.join(out_dir, code + ".json")
        try:
            shutil.copy2(src, dst)
            found.append(code)
        except Exception as e:
            print("[!] 复制失败:", code, e)

    if verbose:
        print("[i] 从 assets 提取 %d 个语言文件" % len(found))

    return found


# ==============================================================
# 生成 index.json
# ==============================================================

def write_index(out_dir, codes):
    index = {}
    for code in codes:
        path = os.path.join(out_dir, code + ".json")
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print("[!] 读取失败:", code, e)
            continue
        index[code] = {
            "name":   data.get("language.name",   code),
            "region": data.get("language.region", "")
        }

    idx_path = os.path.join(out_dir, "index.json")
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2, sort_keys=True)
    print("[i] 已写入 %s，共 %d 种语言" % (idx_path, len(index)))


# ==============================================================
# 更新 i18n.js
# ==============================================================

def format_supported(codes):
    lines = ["var SUPPORTED = ["]
    row = []
    for c in codes:
        row.append("'" + c + "'")
        if len(row) == 4:
            lines.append("    " + ", ".join(row) + ",")
            row = []
    if row:
        lines.append("    " + ", ".join(row))
    lines.append("];")
    return "\n".join(lines)


def apply_to_i18n(i18n_path, codes):
    if not os.path.exists(i18n_path):
        print("[!] 未找到", i18n_path, "，跳过自动替换")
        return

    with open(i18n_path, "r", encoding="utf-8") as f:
        src = f.read()

    block = format_supported(codes)
    pattern = re.compile(r"var SUPPORTED\s*=\s*\[[^\]]*\];", re.MULTILINE)
    if pattern.search(src):
        src = pattern.sub(block, src, count=1)
        with open(i18n_path, "w", encoding="utf-8") as f:
            f.write(src)
        print("[i] 已更新", i18n_path)
    else:
        print("[!] 没找到 `var SUPPORTED = [...];`，请手动替换")
        print()
        print(block)


# ==============================================================
# 主流程
# ==============================================================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", default=DEFAULT_ASSETS)
    ap.add_argument("--jar",    default=DEFAULT_JAR)
    ap.add_argument("--out",    default=DEFAULT_OUT)
    ap.add_argument("--i18n",   default=DEFAULT_I18N,
                    help="i18n.js 路径，自动替换 SUPPORTED；传空字符串跳过")
    ap.add_argument("-q", "--quiet", action="store_true")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    verbose = not args.quiet

    codes = set()

    # 1. jar 里的 en_us.json
    if verbose:
        print("[i] 从 jar 提取 en_us…")
    for c in extract_from_jar(args.jar, args.out, verbose=verbose):
        codes.add(c)

    # 2. objects 里的其他语言
    if os.path.isdir(args.assets):
        if verbose:
            print("[i] 从 assets/objects 提取其他语言…")
        for c in extract_from_assets(args.assets, args.out, verbose=verbose):
            codes.add(c)
    else:
        print("[!] assets 目录不存在:", args.assets)

    codes = sorted(codes)
    if not codes:
        raise SystemExit("没有提取到任何语言文件")

    print("[i] 共 %d 种语言" % len(codes))

    # 3. 生成 index.json
    write_index(args.out, codes)

    # 4. 更新 i18n.js
    if args.i18n:
        apply_to_i18n(args.i18n, codes)


if __name__ == "__main__":
    main()