# LYS Refiner

Local Lyricify Syllable (`.lys`) lyric refinement tool.

[中文说明](./README.md)

## Overview

LYS Refiner merges overly fragmented Lyricify Syllable timing tokens into more readable word-level timing while keeping long held notes and word boundaries controllable.

Available as a **desktop app** (Tauri) and **web app** (GitHub Pages). There is no Python backend and no network requirement at runtime; lyrics are processed locally in the browser or desktop shell.

## Features

- Local `.lys` / `.txt` lyric processing
- Paste text or load a file
- Automatically merge fragmented syllable tokens
- Highlight automatically merged words
- Preview original and refined timelines side by side
- Manually split or merge tokens directly in the preview
- Prevent manual merges across whitespace boundaries
- Copy the final result from the output text box

## Online

Open in your browser (no install):

**https://watercooling480.github.io/lys-refiner/**

Data is processed locally in the browser; nothing is uploaded to a server.

## Usage

1. Open LYS Refiner (desktop or web).
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

### Web

Requirements: Node.js

```powershell
npm install
npm run dev
npm run build
```

Preview a GitHub Pages build locally (assets under `/lys-refiner/`):

```powershell
$env:GITHUB_PAGES='true'
npm run build
npm run preview
```

### Desktop (Tauri)

Additional requirements: Rust toolchain, Windows WebView2 Runtime

```powershell
npm install
npm run tauri:dev
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
