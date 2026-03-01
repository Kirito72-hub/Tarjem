# Tarjem 1.0.1 Beta - Advanced Subtitle Matching 🎯

This update brings a **major improvement** to subtitle matching accuracy with an advanced fuzzy matching algorithm!

## ✨ New Features

### 🎯 Advanced Subtitle Matching Algorithm

- **Levenshtein Distance** - Fuzzy string matching handles typos and variations
  - Example: "Chain Saw Man" vs "Chainsaw Man" → 95% similarity match ✅
  - Example: "Vivy Fluorite Eyes Song" vs "Vivy - Fluorite Eye's Song" → High similarity ✅
- **Multi-Factor Scoring System** (max ~215 points):
  - Episode Number Match: 100 points (exact match required)
  - Title Similarity: 0-50 points (fuzzy matching with Levenshtein distance)
  - Exact Title Match Bonus: 30 points
  - Season Match: 25 points
  - Movie Match: 50 points
  - Subtitle Rating: 0-10 points
  - Download Count: 0-10 points

- **Enhanced Episode Number Detection** - Now supports 5 different patterns:
  - `S01E12`, `s1e12` - Standard TV format
  - `- 06`, ` - 6` - Common anime format
  - `EP 12`, `E12`, `Episode 5` - Various episode formats
  - `[12]`, `(12)` - Bracket notation
  - Version indicators: `v2`, `v3`

- **Smart Rejection System**:
  - Wrong episode number → Score: 0 (automatically rejected)
  - Movie vs Episode mismatch → Score: 0 (automatically rejected)
  - Confidence threshold: 60 points minimum
  - No episode in subtitle when video has episode → Rejected

- **Detailed Debug Logging**:
  - See exactly why each subtitle was scored
  - View breakdown of all scoring factors
  - Identify best match with confidence level

### 🧹 Better Title Normalization

- Removes articles (the, a, an)
- Normalizes separators (dots, dashes, underscores)
- Case-insensitive comparison
- Removes special characters for cleaner matching

## 🐛 Bug Fixes

- Fixed subtitle mismatches caused by simple exact-match logic
- Improved handling of subtitle files with different naming conventions
- Better detection of movie vs episode content

## 🔧 Improvements

- More accurate subtitle selection (prevents wrong episode matches)
- Better handling of typos in titles
- Improved logging for debugging subtitle selection
- Cleaner title extraction from filenames

## 📊 Example Matching

**Before (v1.0.0):**

- Video: `Chainsaw Man - 06.mkv`
- ❌ Might match: `Chainsaw Man The Movie.srt` (wrong!)

**After (v1.0.1):**

- Video: `Chainsaw Man - 06.mkv`
- ✅ Matches: `Chainsaw Man - 06.srt` (score: 180)
- ❌ Rejects: `Chainsaw Man The Movie.srt` (score: 0, no episode)
- ✅ Matches: `Chain Saw Man - 06.srt` (score: 147.5, fuzzy title match)

## 🚀 Usage

Same as before - just use Auto Match! The new algorithm works automatically:

1. Add videos to the app
2. Click "Auto Match"
3. Watch the console for detailed scoring information
4. Enjoy more accurate subtitle matching!

## 🎬 Supported Formats

**Video:** MKV, MP4, AVI  
**Subtitles:** SRT, ASS, SSA, SUB, VTT

## 🌐 Subtitle Providers

- OpenSubtitles
- SubDL
- SubSource

## ⚠️ Known Limitations

- No retry logic for failed downloads (coming in future release)
- File conflict handling not yet implemented (overwrites by default)
- Single episode processing only (batch processing coming soon)

---

**Full Changelog:** https://github.com/Kirito72-hub/Tarjem/compare/v1.0.0-beta...v1.0.1-beta
