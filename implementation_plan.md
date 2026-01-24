# Tarjem Desktop Application - Implementation Plan

## Current Status

### ✅ Completed (Phase 1 & 2)
- Electron + Vite + React + TypeScript project structure created
- Tailwind CSS configured with custom dark theme
- All core dependencies installed:
  - Zustand (state management)
  - electron-store (settings persistence)
  - axios (HTTP client)
  - fluent-ffmpeg + ffmpeg-static (video processing)
  - lucide-react (icons)
- All UI components created:
  - `TitleBar.tsx` - Custom window controls
  - `Sidebar.tsx` - Navigation with 3 tabs
  - `Dashboard.tsx` - Main content area
  - `EpisodeCard.tsx` - File display with status
  - `ProgressBar.tsx` - Progress indicator
  - `FileDropZone.tsx` - Drag & drop interface
- Frameless window configured
- IPC bridge structure in preload script
- TypeScript type definitions (`src/types/index.ts`)
- Zustand store (`src/renderer/src/store/appStore.ts`)

### ⚠️ Current Blocker

**Issue**: Electron module import error when running `npm run dev`
```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

**Root Cause**: The electron-vite build is not properly externalizing the `electron` module, causing it to be undefined at runtime.

**Attempted Fixes**:
1. ✗ Removed @electron-toolkit/utils imports
2. ✗ Added externalizeDepsPlugin to electron.vite.config.ts
3. ✗ Moved isDev check inside function
4. ✗ Reinstalled Electron dependencies

**Recommended Solution**:
Option A: Use a simpler Vite configuration without electron-vite
Option B: Create a minimal test to isolate the issue
Option C: Use the original @electron-toolkit/utils (may need to install missing package)

---

## Next Steps (Incremental Approach)

### Step 1: Fix Electron Build Issue
- [x] Try installing @electron-toolkit/tsconfig package
- [x] Or switch to vanilla Vite + Electron setup (Fixed via Tailwind v3 downgrade and config cleanup)
- [x] Verify app launches successfully
- [x] **Commit**: "fix: resolve electron module import issue"

### Step 2: Test Basic UI
- [x] Verify TitleBar window controls work (minimize, maximize, close)
- [x] Test Sidebar tab switching
- [x] Test FileDropZone drag-and-drop (will show file names only for now)
- [x] **Commit**: "test: verify basic UI functionality"

### Step 3: Implement File Selection (Phase 3.2)
- [x] Create IPC handler `dialog:openFile` in main process
- [x] Use `dialog.showOpenDialog()` with video/subtitle filters
- [x] Return file metadata (path, name, size, extension)
- [x] Test file selection from Dashboard
- [x] **Commit**: "feat: implement file selection dialog"

### Step 4: Implement Drag-and-Drop (Phase 3.3)
- [x] Create IPC handler for `file:drop` event (Handled in renderer via standard API)
- [x] Extract real file paths from dropped files
- [x] Validate file types
- [x] Update UI with dropped files
- [x] **Commit**: "feat: implement drag-and-drop file handling"

### Step 5: Implement File Hashing (Phase 4.1)
- [x] Create `src/main/services/hashCalculator.ts`
- [x] Implement MD5 hash calculation using Node crypto
- [x] Create IPC handler `hash:calculate`
- [x] Add progress callback for large files
- [x] Test with sample video file (Integrated into UI)
- [x] **Commit**: "feat: implement file hash calculation"

### Step 6: Real Subtitle API Integration (Phase 4.2)
- [x] Create `src/main/services/subtitleApi.ts`
- [x] Implement `OpenSubtitles` client using `axios`
- [x] Implement `SubDL` service
- [x] Implement `search` and `searchByHash` endpoint calls
- [x] Implement `download` endpoint call (Partial - Service ready)
- [x] Update `src/main/index.ts` to use real service
- [x] **Commit**: "feat: integrate real OpenSubtitles and SubDL API"

### Step 7: Auto-Match UI Flow (Phase 4.4)
- [x] Update Dashboard to show hashing progress
- [x] Display real search results (mapped from OpenSubtitles)
- [x] Implement real download functionality
- [x] Update file status through workflow
- [x] **Commit**: "feat: implement auto-match UI flow"

### Step 8: Manual Search Tab (Phase 5.1)
- [x] Create search input component
- [x] Implement `subtitle:searchByQuery` IPC handler
- [x] Display search results
- [x] **Commit**: "feat: implement manual search"

### Step 9: FFmpeg Setup (Phase 6.1)
- [x] Create `src/main/services/ffmpeg.ts`
- [x] Configure fluent-ffmpeg with ffmpeg-static
- [x] Test FFmpeg is accessible
- [x] **Commit**: "feat: setup FFmpeg integration"

### Step 10: Merger Implementation (Phase 6.2)
- [ ] Implement `mergeMedia()` function
- [ ] Create IPC handler `merger:start`
- [ ] Build FFmpeg command with options
- [ ] Test basic merge operation
- [ ] **Commit**: "feat: implement media merger"

### Step 11: Merger Progress Tracking (Phase 6.3)
- [ ] Parse FFmpeg stderr for progress
- [ ] Send progress updates via IPC
- [ ] Update ProgressBar in real-time
- [ ] **Commit**: "feat: add merger progress tracking"

### Step 12: Settings Implementation (Phase 7)
- [ ] Setup electron-store
- [ ] Create settings modal UI
- [ ] Implement language preferences
- [ ] **Commit**: "feat: implement settings management"

### Step 13: Error Handling (Phase 8)
- [ ] Add try-catch to all IPC handlers
- [ ] Create error notification system
- [ ] Handle edge cases
- [ ] **Commit**: "feat: add comprehensive error handling"

### Step 14: Real Subtitle API Integration
- [ ] Research OpenSubtitles API
- [ ] Implement real API calls
- [ ] Handle authentication
- [ ] **Commit**: "feat: integrate real subtitle API"

### Step 15: Testing & Polish (Phase 9)
- [ ] Test all features end-to-end
- [ ] Fix bugs
- [ ] Polish UI/UX
- [ ] **Commit**: "test: comprehensive feature testing"

### Step 16: Build & Package (Phase 10)
- [ ] Configure electron-builder
- [ ] Create Windows installer
- [ ] Test packaged app
- [ ] **Commit**: "build: create Windows installer"

---

## File Structure Reference

```
Tarjem/
├── src/
│   ├── main/
│   │   ├── index.ts              ✅ Main process entry
│   │   ├── ipc/                  ⏳ IPC handlers (to create)
│   │   │   ├── fileHandlers.ts
│   │   │   ├── hashHandlers.ts
│   │   │   ├── subtitleHandlers.ts
│   │   │   └── mergerHandlers.ts
│   │   └── services/             ⏳ Business logic (to create)
│   │       ├── subtitleApi.ts
│   │       ├── ffmpeg.ts
│   │       └── hashCalculator.ts
│   ├── preload/
│   │   ├── index.ts              ✅ IPC bridge
│   │   └── index.d.ts            ✅ Type definitions
│   ├── renderer/
│   │   └── src/
│   │       ├── App.tsx           ✅ Main app component
│   │       ├── components/       ✅ All UI components
│   │       ├── store/            ✅ Zustand store
│   │       └── assets/           ✅ Styles
│   └── types/
│       └── index.ts              ✅ Shared types
├── phases.md                     ✅ Detailed phases doc
├── task.md                       ✅ Task checklist
└── implementation_plan.md        ✅ This file
```

---

## Key Design Decisions

1. **State Management**: Zustand for simplicity and performance
2. **Styling**: Tailwind CSS for rapid development
3. **IPC Pattern**: Secure context bridge with TypeScript types
4. **File Processing**: Stream-based for large files
5. **Progress Tracking**: Event-based IPC for real-time updates

---

## Testing Strategy

- **Manual Testing**: Each feature tested immediately after implementation
- **Integration Testing**: Full workflow tests before packaging
- **Edge Cases**: Large files, network errors, corrupted files
- **Performance**: Monitor memory usage during merge operations

---

## Notes

- Keep commits small and focused
- Test each feature before moving to next step
- Update task.md after each step completion
- Document any blockers or issues encountered
