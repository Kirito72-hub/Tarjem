# Tarjem 1.0.0 Beta - Auto Match Feature Complete 🎉

The first beta release of Tarjem brings the complete **Auto Match** workflow - automatically find, download, and merge subtitles with your video files!

## ✨ Major Features

### 🤖 Complete Auto Match Workflow
- **Automatic Hash Calculation** - Uses OpenSubtitles hash algorithm for precise matching
- **Multi-Provider Search** - Searches across OpenSubtitles, SubDL, and SubSource simultaneously
- **Intelligent Episode Matching** - Extracts episode numbers from filenames and matches them with subtitles
- **One-Click Processing** - Hash → Search → Download → Merge - all automated!

### 🎯 Smart Subtitle Selection
**Episode Number Detection** - Supports multiple naming patterns:
- `Show Name - 06.mkv` → Episode 6
- `Show Name S01E12.mkv` → Season 1, Episode 12
- `Show Name EP 5.mkv` → Episode 5
- `Show Name Episode 3.mkv` → Episode 3

**Prevents Incorrect Matches** - Won't select movie subtitles for TV episodes

**Scoring Algorithm** - Prioritizes exact episode matches + high ratings + download counts

### 🎨 Subtitle Format Preservation
- **Original Styling Maintained** - Font size, colors, positioning preserved
- **FFmpeg Smart Codec** - Uses `-c:s copy` for MKV files to avoid conversion
- **No Quality Loss** - Subtitles embedded exactly as downloaded

### 🧹 Automatic Cleanup
- **Temporary File Removal** - Deletes downloaded subtitle files after successful merge
- **Clean Export Folders** - Only merged video files remain
- **Error-Safe** - Cleanup failures won't affect the merge process

## 🔧 Improvements

- SubSource Zip Extraction - Automatically extracts subtitle files from zip archives
- FFmpeg Stream Mapping - Correctly maps video, audio, and subtitle streams
- Progress Tracking - Visual feedback for all workflow stages (Hashing, Searching, Downloading, Merging)
- Language Metadata - Adds proper language tags to embedded subtitles

## 🐛 Bug Fixes

- Fixed download API signature (2 arguments instead of 3)
- Fixed SubSource zip extraction (AdmZip import issue)
- Fixed FFmpeg subtitle codec (copy instead of convert to preserve styling)
- Fixed subtitle file cleanup after merge
- Fixed stream mapping to prevent old subtitle tracks from being copied

## 🚀 Usage

1. **Add Videos** - Drag and drop video files into the app
2. **Configure Settings** - Set your preferred subtitle language and export path
3. **Auto Match** - Click "Auto Match" to start the automated workflow
4. **Wait** - The app will hash, search, download, and merge automatically
5. **Done** - Find your merged videos in the export folder!

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

**Full Changelog:** https://github.com/Kirito72-hub/Tarjem/commits/v1.0.0-beta
