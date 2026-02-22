# Changelog

## v3.0.0-beta (2026-02-22)

### 🎨 New App Icon
- **Custom Icon:** Updated application icon across the taskbar, window, and title bar.
- **Title Bar Icon:** App icon now appears in the custom title bar alongside the version number.

### 🐛 Fixes
- **Batch Subtitle Search:** Fixed parser treating `[1 - 12]` episode ranges as "Episode 1", causing episodes 2-12 to return no results. Batch packs now correctly match any episode in their range.
- **Temp File Cleanup:** Fixed orphan 0-byte temp files left behind when subtitle filenames contain Windows-illegal characters (e.g. colons from Crunchyroll titles).

---



## v2.0.3-beta (2026-02-22)

### 🐛 Fixes
- **Batch Subtitle Support:** Fixed parser misidentifying `[1 - 12]` range patterns as "Episode 1", causing episodes 2-12 to find no results. Batch subtitle packs are now correctly matched to any episode in their range.
- **Temp File Cleanup:** Fixed orphan 0-byte temp files being created on disk when subtitle filenames contained Windows-illegal characters (e.g., colons in Crunchyroll titles). Filenames are now sanitized before creating temp paths.

### 🔍 Improvements
- **Version Display:** App title bar now dynamically reflects the current version from `package.json` via IPC.

---

## v2.0.0-beta (2026-02-05)

### ✨ Manual Downloads Engine
- **Robust Extension Handling:** Auto-detects extensions (`.ass`, `.srt`, `.zip`) from server headers (`Content-Disposition`) when not present in URL.
- **Auto-Directory Creation:** Automatically creates destination folders if missing, fixing ENOENT errors.
- **Skip Extraction:** Option to preserve original archives (ZIP/RAR) instead of auto-extracting.

### 🔍 Improvements
- **AniList Logging:** Explicit confirmation when Anime ID is found via AniList.


## v1.0.5-beta (2026-02-04)

### 🎯 Improved Episode Matching

**Multi-Result Retry Strategy:** When downloading subtitles from batch packs that don't contain the target episode, the app now automatically retries with the next best search result instead of using the wrong subtitle.

### Fixes

- **Progress Bar Flickering:** Fixed flickering in portable build by throttling FFmpeg progress updates and improving CSS transitions
- **ZIP Episode Extraction:** Fixed issue where batch subtitle packs (e.g., "JUJUTSU KAISEN.S02.1080P") would extract the wrong episode
- **Error Propagation:** Fixed errors not propagating correctly from ZIP extraction, which prevented retry logic from working
- **Filename Parsing:** Added pattern to strip `_with_subtitles` suffix from filenames
- **Code Cleanup:** Removed unused `selectBestSubtitle` function

### Technical Changes

- **🆕 Guessit-JS Parser:** Replaced regex-based filename parser with `guessit-js` (WASM) + `anime-name-tool` pipeline for significantly better accuracy.
- **Sequential Processing:** Auto Match and Merger now process files one by one to prevent rate limits.
- **Refactor:** Implemented robust "Parser Pipeline" (Base -> Enrichment -> Pattern Check) to handle all file types generically without hardcoded hacks.
- **Fix:** Improved JJK S2 episode matching (Absolute vs Relative numbering).
- **Fix:** Improved Anime title search (e.g. Kusuriya) by verifying titles against `anime-name-tool`.

---

## v1.0.3 (Previous)

- Season detection improvements for anime filenames
- Pattern 3a for mid-filename episode numbers (e.g., "Show - 03 [Quality]")
- Episode-based filtering for SubSource provider
