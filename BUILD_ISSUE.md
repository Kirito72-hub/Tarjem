# Tarjem - Build Issue Resolution

## Problem

Electron module returns `undefined` when required in the bundled main process, causing:

```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

## Root Cause

The electron-vite bundler is not properly externalizing the `electron` module despite configuration attempts.

## Solution: Use Source Files Directly

Instead of using the bundled output, we'll configure electron-vite to skip bundling the main process entirely and use TypeScript compilation only.

### Steps:

1. Update `electron.vite.config.ts` to disable bundling for main process
2. Use `tsc` to compile TypeScript to JavaScript
3. Run electron with compiled (not bundled) files

This is a common workaround for electron-vite bundling issues.
