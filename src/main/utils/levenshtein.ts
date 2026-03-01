/**
 * Levenshtein string similarity utility.
 * Returns a value from 0.0 (no match) to 1.0 (exact match).
 * Threshold for AniList verification: >= 0.80
 */

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length

  // Create a 2D DP matrix
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Compute string similarity as a ratio between 0.0 and 1.0.
 * Normalizes both strings to lowercase before comparison.
 */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  const normA = a.toLowerCase().trim()
  const normB = b.toLowerCase().trim()
  if (normA === normB) return 1.0
  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen === 0) return 1.0
  const dist = levenshteinDistance(normA, normB)
  return 1 - dist / maxLen
}
