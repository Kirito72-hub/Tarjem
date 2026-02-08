# Changelog

## v2.0.1-beta (2026-02-08)

### 🐛 Bug Fixes
- **Batch Subtitle Matching:** Fixed `[1 - 12]` style batch packs being incorrectly identified as Episode 1 only, preventing matches for episodes 2-12.
- **Temp File Cleanup:** Fixed orphan 0-byte temp files being created when subtitle filenames contain illegal Windows characters (e.g., colons).

### 🔧 Technical
- Added Range Detection in parser to correctly identify batch/season pack subtitles.
- Added `sanitizeFilename()` helper to strip Windows-illegal characters from temp paths.

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
