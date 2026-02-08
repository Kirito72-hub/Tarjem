/**
 * Clean show title by removing season information
 * e.g. "Jujutsu Kaisen 2nd Season" -> "Jujutsu Kaisen"
 * e.g. "Show Name Season 3" -> "Show Name"
 */
export function cleanShowTitle(title: string): string {
  if (!title) return title

  return title
    .replace(/\s+(?:2nd|3rd|4th|\d+th|[1-9]\d*st|[1-9]\d*nd|[1-9]\d*rd)\s+Season/i, '') // "2nd Season"
    .replace(/\s+Season\s+\d+/i, '') // "Season 2"
    .replace(/\s+S\d+$/i, '') // "S2" at end
    .trim()
}
