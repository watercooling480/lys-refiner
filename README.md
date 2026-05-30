# LYS Refiner

Lyricify Syllable (`.lys`) 歌词智能合并工具。

[English](./README.en.md)

## 简介

LYS Refiner 把过碎的逐音节时间轴合并成更自然的词级时间轴，同时保留长拖音位置和词边界的可控性。

提供桌面版（Tauri）和在线版（GitHub Pages）。纯本地处理，不联网，不上传数据。

## 在线使用

**https://watercooling480.github.io/lys-refiner/**

## 下载

[GitHub Releases](https://github.com/watercooling480/lys-refiner/releases)

| 文件 | 说明 |
| --- | --- |
| `LYS.Refiner_版本号_x64-setup.exe` | 安装版（x64） |
| `LYS.Refiner_版本号_x64-standalone.exe` | 免安装（x64） |
| `LYS.Refiner_版本号_arm64-setup.exe` | 安装版（ARM64） |
| `LYS.Refiner_版本号_arm64-standalone.exe` | 免安装（ARM64） |

## 系统要求

| 平台 | 最低版本 | 说明 |
| --- | --- | --- |
| Windows | Windows 10 1803+ | 需要 WebView2 Runtime |
| 处理器 | x64 或 ARM64 | 分别提供对应构建 |

WebView2 Runtime 在 Windows 10 20H2+ 和 Windows 11 中已预装。如果系统没有，可从 [Microsoft 下载](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)。

在线版无系统要求，支持任何现代浏览器。

## 功能

- 粘贴或拖入 `.lys` / `.txt` 歌词
- 自动合并过碎音节
- 高亮显示被合并的词
- 时间轴预览：原始 vs 输出
- 点击输出 token 后可手动拆开或合并
- 阻止跨词/跨连字符的误合并
- 输出框直接复制结果

## 多语言支持

自动检测歌词中的文字类型，分别处理：

| 文字 | 处理方式 |
| --- | --- |
| 英文/拉丁 | 正常合并（主灵敏度） |
| 韩语 | 独立灵敏度，默认 0.08 |
| 中文 | 不合并，保留原样 |
| 日语 | 不合并，保留原样 |

当歌词中包含韩语时，界面会自动出现韩语灵敏度滑块。

不同文字之间不会跨脚本合并。

## 合并逻辑

判断依据：

- 音节时长
- 字母视觉宽度（m/w 宽，i/l 窄），而非单纯字母数量
- 固定 gap：相邻空隙 >= 10ms 不合并
- 长词/长时长自动收紧阈值
- 后半段明显拖长时倾向保留拆分

## 使用方法

1. 打开 LYS Refiner（桌面版或在线版）
2. 粘贴歌词或选择文件
3. 选择预设或调整合并强度滑块
4. 点击 `转换`
5. 在时间轴预览中检查结果
6. 需要调整时，点击输出 token，使用悬浮按钮拆开或合并
7. 从输出框复制最终歌词

## 开发

### Web 版

```powershell
npm install
npm run dev
npm run build
```

### 桌面版（Tauri）

额外需要：Rust toolchain、Windows WebView2 Runtime

```powershell
npm install
npm run tauri:dev
npm run dist
```

## 技术栈

Tauri 2 / React / TypeScript / Vite
