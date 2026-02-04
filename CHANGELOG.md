# Changelog

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

- **🆕 Guessit-JS Parser:** Replaced regex-based filename parser with `guessit-js` (WASM) + `anime-name-tool` for significantly better accuracy in detecting season/episode numbers (handles S03, Season 3, 3rd Season, etc.)
- **Sequential Processing:** Auto Match and Merger now process files one by one to prevent rate limits and UI overwhelming
- SubSource provider now throws error when ZIP doesn't contain matching episode
- Main download handler re-throws episode mismatch errors for retry
- Added `getSortedCandidates()` helper for retry logic (tries up to 5 candidates)
- Improved catch block to detect "found in ZIP archive" errors
- **Fix:** Resolved absolute vs season numbering conflict (e.g. JJK S2 Episode 3 detection) by prioritizing `anime-name-tool` for anime content

---

## v1.0.3 (Previous)

- Season detection improvements for anime filenames
- Pattern 3a for mid-filename episode numbers (e.g., "Show - 03 [Quality]")
- Episode-based filtering for SubSource provider
