# LYS Refiner

Lyricify Syllable (`.lys`) lyric merge tool.

[中文](./README.md)

## Overview

LYS Refiner merges overly fragmented syllable-level timing into more natural word-level timing while preserving long held notes and word boundary control.

Available as a desktop app (Tauri) and web app (GitHub Pages). Fully local processing, no network required, no data uploaded.

## Online

**https://watercooling480.github.io/lys-refiner/**

## Download

[GitHub Releases](https://github.com/watercooling480/lys-refiner/releases)

| File | Description |
| --- | --- |
| `LYS.Refiner_VERSION_x64-setup.exe` | Installer |
| `LYS.Refiner_VERSION_x64-standalone.exe` | Portable, no install needed |

## Features

- Paste or drag in `.lys` / `.txt` lyrics
- Automatic syllable merging
- Highlight merged words
- Timeline preview: original vs output
- Click output tokens to manually split or merge
- Prevent merges across word boundaries and hyphens
- Copy result directly from the output box

## Multi-language Support

Automatically detects script type and applies different rules:

| Script | Behavior |
| --- | --- |
| Latin/English | Normal merge (main sensitivity) |
| Korean | Separate sensitivity, default 0.08 |
| Chinese | No merge, preserved as-is |
| Japanese | No merge, preserved as-is |

A Korean sensitivity slider appears automatically when Korean text is detected.

Different scripts are never merged across boundaries.

## Algorithm

Merge decisions are based on:

- syllable duration
- visual letter width (m/w are wide, i/l are narrow) instead of raw character count
- fixed gap boundary: gaps >= 10ms are not merged
- long words and long durations automatically tighten the threshold
- long trailing syllables tend to stay split

## Usage

1. Open LYS Refiner (desktop or web)
2. Paste lyrics or choose a file
3. Select a preset or adjust the merge strength slider
4. Click `转换`
5. Review results in the timeline preview
6. Click output tokens and use floating buttons to split or merge
7. Copy final lyrics from the output box

## Development

### Web

```powershell
npm install
npm run dev
npm run build
```

### Desktop (Tauri)

Additional requirements: Rust toolchain, Windows WebView2 Runtime

```powershell
npm install
npm run tauri:dev
npm run dist
```

## Tech Stack

Tauri 2 / React / TypeScript / Vite
