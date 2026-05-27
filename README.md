# LYS Refiner

本地 Lyricify Syllable (`.lys`) 歌词合并工具。

[English README](./README.en.md)

## 简介

LYS Refiner 用于把过碎的 Lyricify Syllable 音节时间轴合并成更易读的词级时间轴，同时保留长拖音和词边界的可控性。

提供 **桌面版**（Tauri）与 **在线版**（GitHub Pages）两种使用方式。运行时不需要 Python 后端，也不需要联网；歌词在本地浏览器或桌面应用中处理。

## 功能

- 本地处理 `.lys` / `.txt` 歌词
- 支持粘贴文本或选择文件
- 自动合并过碎的音节 token
- 高亮显示自动合并的词
- 时间轴预览原始结果和输出结果
- 点击预览中的 token 后可手动拆分或合并
- 阻止跨空格的手动合并，避免把不同单词误合
- 输出结果直接显示在 `输出 LYS` 文本框中，方便复制

## 在线使用

在浏览器中打开（无需安装）：

**https://watercooling480.github.io/lys-refiner/**

数据在本地浏览器中处理，不会上传到服务器。

## 使用方法

1. 打开 LYS Refiner（桌面版或在线版）。
2. 粘贴歌词，或选择 `.lys` / `.txt` 文件。
3. 选择合并强度预设，或手动调整滑块。
4. 点击 `转换`。
5. 在时间轴预览中检查高亮合并结果。
6. 如有需要，点击输出 token 后使用右侧悬浮按钮进行 `拆开` 或 `合并`。
7. 从 `输出 LYS` 文本框复制最终歌词。

## 下载

在 GitHub Releases 中下载：

- `LYS.Refiner_版本号_x64-setup.exe`：安装版
- `LYS.Refiner_版本号_x64-standalone.exe`：免安装版，双击即用

## 合并逻辑

合并判断基于：

- 音节时间
- 字母视觉宽度，而不是单纯字母数量
- 固定 gap 边界：相邻空隙达到 10 ms 不合并
- 长拖音自动收紧，避免把需要保留滚动位置的长尾词过度合并

例如：

- `spo + ti + fy` 可以合成 `spotify`
- `a + lone` 可以合成 `alone`
- `moon + light`、`mid + night` 这类长拖音场景会更倾向保留拆分

## 开发

### Web 版

依赖：Node.js

```powershell
npm install
npm run dev
npm run build
```

本地预览 Pages 构建（资源路径为 `/lys-refiner/`）：

```powershell
$env:GITHUB_PAGES='true'
npm run build
npm run preview
```

### 桌面版（Tauri）

额外依赖：Rust toolchain、Windows WebView2 Runtime

```powershell
npm install
npm run tauri:dev
npm run dist
```

构建产物位于：

```text
src-tauri/target/release/
src-tauri/target/release/bundle/nsis/
```

## 技术栈

- Tauri 2
- React
- TypeScript
- Vite

## 说明

这是一个纯本地应用。核心处理逻辑运行在前端，没有后端服务。
