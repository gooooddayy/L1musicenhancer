# L1音频增强器 开发指南

> 适用场景：换新电脑 / 从 GitHub 重新 clone 项目后，如何继续改 bug、加功能。

## 0. 先认准文件，别改错

仓库根目录有三个文件：

| 文件 | 大小 | 是什么 | 要不要动 |
|------|------|--------|---------|
| `L1音频增强器WB.html` | ~13.7MB | **当前正式版**，唯一交付物，自包含单文件 | ✅ 日常改这个 |
| `index.html` | 168KB | 早期原型（Trae 生成的旧版），功能不全，已停更 | ❌ 不要改 |
| `README.md` | <1KB | 项目说明 | ❌ 不用动 |

**所有开发都在 `L1音频增强器WB.html` 上进行。** 直接双击它就能用（Chrome / Edge），无需服务器、无需联网。

## 1. 单文件内部结构（从上到下）

| 区块 | 位置 | 内容 | 能否编辑 |
|------|------|------|---------|
| 头部 | 开头 ~4KB | HTML 结构 + CSS | ✅ |
| 中段 | ~13MB | gzip+base64 内嵌的 ffmpeg 引擎三件套（`r-worker` / `r-core` / `r-wasm`） | ❌ 机器数据，禁止手工编辑 |
| 尾部 | ~10KB | 主 JS 逻辑 | ✅ |

打开方式：用 VS Code 等支持大文件的编辑器，**不要用记事本**（13MB 单行 base64 会卡死）。
快速定位：CSS 搜 `<style>`；JS 逻辑搜 `(function(){'use strict'`。

## 2. 日常改 bug / 加功能

直接编辑 `L1音频增强器WB.html`：

- **界面 / 样式** → 头部的 `<style>` 和 HTML
- **交互 / 转换逻辑** → 尾部 `<script>`，关键位置：
  - `RATES` / `DEPTHS` / `WAV_C` —— 参数表（加采样率档位、改 codec 映射改这里）
  - `analyze()` —— 音频分析（峰值电平、过采样检测）
  - `renderOpts()` / `rerender()` —— 选项渲染（含 MP3 动态过滤）
  - `buildArgs()` —— 组装 FFmpeg 命令行参数
  - `convert()` —— 转换主流程
  - `D()` / `mkURLs()` / `idbGet` —— 引擎解压、缓存、加载

改完双击用 Chrome/Edge 打开即可验证。改前建议先扫一眼 `docs/PITFALLS.md`，很多坑已经踩过。

## 3. 重建引擎（rare，平时不用）

仅当需要更换 ffmpeg 内核版本、或内嵌数据块损坏时：

```bash
node tools/build.js                # 默认处理 L1音频增强器WB.html
node tools/build.js 其他文件.html   # 也可指定别的文件
```

脚本会：重新下载引擎三件套 → gzip 自检 → base64 → **只替换三个数据块**，你的 UI/JS 修改原样保留。

> ⚠️ 升级内核前查许可：`@ffmpeg/core` 0.12.6 是 **MIT**；0.12.8+ 改为 **GPL-2.0-or-later**。继续用 0.12.6 最省事。

## 4. 改完自测清单

- [ ] 上传 44.1k/16bit WAV → 转 192kHz/24bit WAV，下载后播放器能打开
- [ ] 上传 192k/24bit WAV → 转 44.1k/16bit WAV（降参数方向）
- [ ] 输出格式切 MP3：采样率/位深选项应只剩 44.1kHz + 16-bit
- [ ] Peak Level 偏低的文件：电平修复自动勾选，转换后峰值接近 -1 dBFS
- [ ] 上传 MP3 再转 WAV（有损→无损方向）
- [ ] 关掉页面重新打开：引擎应秒加载（IndexedDB 缓存生效）
- [ ] 控制台无报错（F12 → Console）

## 5. 提交回 GitHub

```bash
git add "L1音频增强器WB.html"
git commit -m "简要描述改动"
git push
```

新增功能建议同步更新本文档和 `docs/PITFALLS.md`（如果踩到新坑）。
