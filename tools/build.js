#!/usr/bin/env node
/**
 * L1音频增强器 - 引擎重建脚本
 *
 * 用法:
 *   node tools/build.js [html路径]
 *
 * 功能:
 *   重新下载 ffmpeg 引擎三件套，gzip 压缩 + base64 编码后，
 *   只替换 HTML 中的三个内嵌数据块（r-worker / r-core / r-wasm）。
 *   HTML 其余部分（UI / CSS / JS 逻辑）原样保留，
 *   所以你平时改的 bug 和功能不会因为重建而丢失。
 *
 * 什么时候需要跑:
 *   - 更换 ffmpeg 内核版本（改下面的 V）
 *   - 内嵌数据块损坏（页面提示引擎加载失败）
 *   平时改 bug / 加功能不需要跑，直接改 HTML 即可。
 *
 * 依赖: Node 18+（用内置 fetch，无需 npm install）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ffmpeg 引擎版本
// 注意: @ffmpeg/core 0.12.6 是 MIT 许可；0.12.8+ 改为 GPL-2.0-or-later，升级前先读 docs/PITFALLS.md 第 12 条
const V = { ffmpeg: '0.12.6', core: '0.12.6' };

// 三个内嵌块对应的上游文件（unpkg 打不开时换成 jsdelivr: https://cdn.jsdelivr.net/npm/...）
const FILES = [
  { id: 'r-worker', url: `https://unpkg.com/@ffmpeg/ffmpeg@${V.ffmpeg}/dist/umd/814.ffmpeg.js` },
  { id: 'r-core',   url: `https://unpkg.com/@ffmpeg/core@${V.core}/dist/umd/ffmpeg-core.js` },
  { id: 'r-wasm',   url: `https://unpkg.com/@ffmpeg/core@${V.core}/dist/umd/ffmpeg-core.wasm` },
];

const TARGET = process.argv[2] || path.join(__dirname, '..', 'L1音频增强器WB.html');

async function download(url) {
  process.stdout.write(`下载 ${url}\n  `);
  const r = await fetch(url); // Node 18+ 内置 fetch，自动跟随 unpkg 重定向
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1024) throw new Error(`文件异常小(${buf.length}B)，可能是 404 页面——unpkg 对不存在的版本会返回 200 + 小文件`);
  console.log(`${(buf.length / 1024 / 1024).toFixed(2)}MB`);
  return buf;
}

(async () => {
  let html = fs.readFileSync(TARGET, 'utf8');
  for (const f of FILES) {
    const raw = await download(f.url);
    // 自检: gzip 后必须能原样解回
    const gz = zlib.gzipSync(raw, { level: 9 });
    if (zlib.gunzipSync(gz).length !== raw.length) throw new Error(`${f.id} gzip 自检失败`);
    const b64 = gz.toString('base64');
    const block = `<script type="text/plain" id="${f.id}">${b64}</script>`;
    const re = new RegExp(`<script type="text/plain" id="${f.id}">[\\s\\S]*?</script>`);
    if (re.test(html)) {
      html = html.replace(re, () => block);
      console.log(`  替换 ${f.id}: ${(raw.length / 1024 / 1024).toFixed(1)}MB -> ${(b64.length / 1024 / 1024).toFixed(1)}MB(base64)`);
    } else {
      html = html.replace('</body>', () => block + '\n</body>');
      console.log(`  插入 ${f.id}（原文件没有这个块）`);
    }
  }
  fs.writeFileSync(TARGET, html);
  console.log(`完成: ${TARGET} (${(fs.statSync(TARGET).size / 1024 / 1024).toFixed(1)}MB)`);
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
