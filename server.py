#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)


@app.route('/log', methods=['POST', 'OPTIONS'])
def log():
    """接收前端日志并打印到终端"""

    # 预检请求
    if request.method == 'OPTIONS':
        resp = app.make_default_options_response()
    else:
        resp = jsonify({'ok': True})

    # 允许跨域（如果用 file:// 或不同端口打开页面）
    resp.headers['Access-Control-Allow-Origin']  = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'

    if request.method == 'OPTIONS':
        return resp

    # 取数据（兼容 json 和 form）
    data = request.get_json(silent=True)
    if data is None:
        data = request.form.to_dict()

    ts = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    print(f'[{ts}] {request.remote_addr}  {data}', flush=True)

    return resp


if __name__ == '__main__':
    # host='0.0.0.0' 让手机能连（Termux 本身就在手机上，0.0.0.0 也方便）
    app.run(host='0.0.0.0', port=5000, debug=False)