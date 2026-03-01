;```typescript
import { ElectronAPI } from '../types'

declare global {
  interface Window {
    electron: any
    api: ElectronAPI & {
      getVersion: () => Promise<string>
    }
  }
}
```
