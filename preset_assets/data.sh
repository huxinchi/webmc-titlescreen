rm panorama_equirect.png cubemap_3x2.png overlay_big.png row1.png row2.png
# 第一行：前 右 后
magick convert panorama_0.png panorama_1.png panorama_2.png +append row1.png
# 第二行：左 上 下
magick convert panorama_3.png panorama_4.png panorama_5.png +append row2.png
# 上下拼接成 3x2
magick convert row1.png row2.png -append cubemap_3x2.png
# 1. 先转全景（你上一步的命令）
ffmpeg -i cubemap_3x2.png \
  -vf "v360=c3x2:e:cubic:in_forder='frblud'" \
  -y panorama_equirect.png

# 2. overlay 按 CSS 里的 cover 行为缩放：等比放大到铺满，居中裁切
convert panorama_overlay.png \
  -resize '2048x1024^' \
  -gravity center \
  -extent 2048x1024 \
  overlay_big.png

# 3. 叠加（overlay 带 alpha，直接 composite 即可）
magick convert panorama_equirect.png overlay_big.png \
  -compose over -composite \
  -y panorama_final.png

# 4. 清理中间文件
rm cubemap_3x2.png overlay_big.png row1.png row2.png