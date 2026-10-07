#!/data/data/com.termux/files/usr/bin/zsh
# mcslice.sh  <src.png> <out.png> <W> <H> <B>
# B = 边宽（button.png 是 3）

src=$1
out=$2
W=$3
H=$4
B=$5

# 原图尺寸
SW=$(identify -format "%w" "$src")
SH=$(identify -format "%h" "$src")
MW=$((SW - B*2))   # 中间原宽
MH=$((SH - B*2))   # 中间原高
TW=$((W - B*2))    # 目标中间宽
TH=$((H - B*2))    # 目标中间高

T=$(mktemp -d)

# 切九块
magick convert "$src" -crop ${B}x${B}+0+0         +repage $T/tl.png
magick convert "$src" -crop ${MW}x${B}+${B}+0     +repage $T/tc.png
magick convert "$src" -crop ${B}x${B}+$((SW-B))+0 +repage $T/tr.png

magick convert "$src" -crop ${B}x${MH}+0+${B}         +repage $T/ml.png
magick convert "$src" -crop ${MW}x${MH}+${B}+${B}     +repage $T/mc.png
magick convert "$src" -crop ${B}x${MH}+$((SW-B))+${B} +repage $T/mr.png

magick convert "$src" -crop ${B}x${B}+0+$((SH-B))         +repage $T/bl.png
magick convert "$src" -crop ${MW}x${B}+${B}+$((SH-B))     +repage $T/bc.png
magick convert "$src" -crop ${B}x${B}+$((SW-B))+$((SH-B)) +repage $T/br.png

# 拉伸中间四块
magick convert $T/tc.png -resize "${TW}x${B}!"   $T/tc2.png
magick convert $T/ml.png -resize "${B}x${TH}!"   $T/ml2.png
magick convert $T/mc.png -resize "${TW}x${TH}!"  $T/mc2.png
magick convert $T/mr.png -resize "${B}x${TH}!"   $T/mr2.png
magick convert $T/bc.png -resize "${TW}x${B}!"   $T/bc2.png

# 拼三行
magick convert $T/tl.png $T/tc2.png $T/tr.png +append $T/row_t.png
magick convert $T/ml2.png $T/mc2.png $T/mr2.png +append $T/row_m.png
magick convert $T/bl.png $T/bc2.png $T/br.png +append $T/row_b.png

# 拼成最终图
magick convert $T/row_t.png $T/row_m.png $T/row_b.png -append "$out"

rm -rf $T
echo "生成: $out  ${W}x${H}"