/**
 * Simple iCal (.ics) parser — no external dependencies.
 * Fetches an .ics URL and extracts VEVENT blocks with UID, DTSTART, DTEND, SUMMARY.
 */

export interface ICalEvent {
  uid: string
  summary: string
  check_in: string  // YYYY-MM-DD
  check_out: string // YYYY-MM-DD
}

/**
 * Parse an iCal date value to YYYY-MM-DD.
 * Handles:
 *   - VALUE=DATE format: 20240315
 *   - DateTime format: 20240315T140000Z or 20240315T140000
 */
function parseICalDate(raw: string): string {
  // Remove any VALUE=DATE: prefix or TZID parameter
  const cleaned = raw.replace(/^.*:/, '').trim()
  // Extract YYYYMMDD portion (first 8 digits)
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) {
    throw new Error(`Invalid iCal date: ${raw}`)
  }
  return `${match[1]}-${match[2]}-${match[3]}`
}

/**
 * Parse raw .ics text content into an array of ICalEvent.
 */
export function parseICalText(icsText: string): ICalEvent[] {
  const events: ICalEvent[] = []

  // Unfold lines: lines starting with space/tab are continuations
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  let inEvent = false
  let uid = ''
  let summary = ''
  let dtstart = ''
  let dtend = ''

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      uid = ''
      summary = ''
      dtstart = ''
      dtend = ''
      continue
    }

    if (trimmed === 'END:VEVENT') {
      if (inEvent && uid && dtstart && dtend) {
        try {
          events.push({
            uid,
            summary: summary || 'Blocked',
            check_in: parseICalDate(dtstart),
            check_out: parseICalDate(dtend),
          })
        } catch {
          // Skip events with unparseable dates
        }
      }
      inEvent = false
      continue
    }

    if (!inEvent) continue

    // Parse property lines — handle parameters (e.g., DTSTART;VALUE=DATE:20240315)
    if (trimmed.startsWith('UID:') || trimmed.startsWith('UID;')) {
      uid = trimmed.substring(trimmed.indexOf(':') + 1).trim()
    } else if (trimmed.startsWith('SUMMARY:') || trimmed.startsWith('SUMMARY;')) {
      summary = trimmed.substring(trimmed.indexOf(':') + 1).trim()
    } else if (trimmed.startsWith('DTSTART:') || trimmed.startsWith('DTSTART;')) {
      dtstart = trimmed.substring(trimmed.indexOf(':') + 1).trim()
    } else if (trimmed.startsWith('DTEND:') || trimmed.startsWith('DTEND;')) {
      dtend = trimmed.substring(trimmed.indexOf(':') + 1).trim()
    }
  }

  return events
}

/**
 * Fetch an .ics URL and parse its events.
 */
export async function fetchAndParseICal(url: string): Promise<ICalEvent[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'StayJoy-iCal-Sync/1.0',
    },
    // 30 second timeout
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  return parseICalText(text)
}
