# LYS Refiner

Local Lyricify Syllable (`.lys`) lyric refinement tool.

[中文说明](./README.md)

## Overview

LYS Refiner merges overly fragmented Lyricify Syllable timing tokens into more readable word-level timing while keeping long held notes and word boundaries controllable.

It is a Tauri desktop app. There is no Python backend, no browser tab, and no network requirement at runtime.

## Features

- Local `.lys` / `.txt` lyric processing
- Paste text or load a file
- Automatically merge fragmented syllable tokens
- Highlight automatically merged words
- Preview original and refined timelines side by side
- Manually split or merge tokens directly in the preview
- Prevent manual merges across whitespace boundaries
- Copy the final result from the output text box

## Usage

1. Open LYS Refiner.
2. Paste lyrics or choose a `.lys` / `.txt` file.
3. Select a merge strength preset or adjust the slider.
4. Click `转换`.
5. Review highlighted merged tokens in the timeline preview.
6. Click output tokens to split or merge them with the floating action buttons.
7. Copy the final lyrics from `输出 LYS`.

## Download

Download from GitHub Releases:

- `LYS.Refiner_VERSION_x64-setup.exe`: installer build
- `LYS.Refiner_VERSION_x64-standalone.exe`: portable standalone build

## Algorithm

Merge decisions are based on:

- syllable timing
- visual letter width instead of raw character count
- fixed gap boundary: gaps of 10 ms or more are not merged
- stricter handling for long held tails

Examples:

- `spo + ti + fy` can become `spotify`
- `a + lone` can become `alone`
- long-tail cases such as `moon + light` or `mid + night` are more likely to stay split

## Development

Requirements:

- Node.js
- Rust toolchain
- Windows WebView2 Runtime

Install dependencies:

```powershell
npm install
```

Build frontend:

```powershell
npm run build
```

Build Windows app:

```powershell
npm run dist
```

Build outputs are generated under:

```text
src-tauri/target/release/
src-tauri/target/release/bundle/nsis/
```

## Tech Stack

- Tauri 2
- React
- TypeScript
- Vite

## Notes

This is a local-only app. The core processing logic runs in the frontend; there is no backend service.
