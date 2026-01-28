// Minimal test to check electron module loading
console.log('=== ELECTRON MODULE TEST ===')
console.log('process.versions.electron:', process.versions.electron)
console.log('process.type:', process.type)

// Try different ways to load electron
console.log('\n1. require("electron"):')
const electron1 = require('electron')
console.log('  Type:', typeof electron1)
console.log('  Value:', electron1)

console.log('\n2. Try process.electronBinding:')
console.log('  Available:', typeof process.electronBinding)

console.log('\n3. Check if app is available globally:')
console.log('  global.require:', typeof global.require)

// The correct way in modern Electron
if (process.type === 'browser') {
  console.log('\n4. We are in main process')
  // In Electron's main process, the API should be available
  try {
    const { app } = require('electron')
    console.log('  app type:', typeof app)
    console.log('  app.whenReady:', typeof app?.whenReady)
  } catch (err) {
    console.log('  Error:', err.message)
  }
}
