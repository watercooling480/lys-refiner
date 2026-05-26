# LYS Refiner

LYS Refiner is a local desktop tool for refining Lyricify Syllable (`.lys`) lyrics.

It merges overly fragmented syllable tokens into more readable word-level timing while keeping long held notes and word boundaries controllable.

## Features

- Local-only Tauri desktop app
- No Python server, no browser tab, no internet required at runtime
- Paste or load `.lys` / `.txt` lyrics
- Convert fragmented syllable timing into cleaner word timing
- Preview original and converted timing side by side
- Highlight automatically merged words
- Manually split an auto-merged token back into original syllables
- Manually merge adjacent tokens when they belong to the same word
- Prevent manual merges across word boundaries
- Copy the refined `.lys` text directly from the output box

## Algorithm

The merge logic is based on:

- token timing
- visual letter width instead of raw character count
- fixed gap boundary: gaps of 10 ms or more are not merged
- stricter handling for long held tails

This keeps words such as `spotify` mergeable while avoiding unwanted merges such as long `moon` + `light` tails.

## Usage

1. Open LYS Refiner.
2. Paste lyrics or choose a `.lys` file.
3. Select a merge strength preset or adjust the slider.
4. Click `转换`.
5. Review the highlighted output tokens.
6. Click output tokens in the preview to split or merge manually.
7. Copy the final result from `输出 LYS`.

## Development

Requirements:

- Node.js
- Rust toolchain
- WebView2 Runtime on Windows

Install dependencies:

```powershell
npm install
```

Run frontend build:

```powershell
npm run build
```

Build the Windows app:

```powershell
npm run dist
```

The installer is generated under:

```text
src-tauri/target/release/bundle/nsis/
```

## Tech Stack

- Tauri 2
- React
- TypeScript
- Vite

## Notes

This project is a clean Tauri implementation. The app logic runs in the frontend; there is no backend service.
