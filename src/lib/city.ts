/**
 * Shared city extraction logic.
 * Used by home page filters, Places page grouping, and anywhere else that needs
 * to resolve a reco's location into a clean city name.
 *
 * Rule 10 in CLAUDE.md: location = city, always.
 */

// Neighbourhood/region → city aliases
const CITY_ALIASES: Record<string, string> = {
  // London
  'greater london': 'London', 'city of london': 'London', 'central london': 'London',
  'inner london': 'London', 'outer london': 'London', 'city of westminster': 'London',
  'borough market': 'London', 'soho': 'London', 'shoreditch': 'London', 'hackney': 'London',
  'peckham': 'London', 'brixton': 'London', 'camden': 'London', 'notting hill': 'London',
  'covent garden': 'London', 'mayfair': 'London', 'fitzrovia': 'London', 'dalston': 'London',
  'islington': 'London', 'bermondsey': 'London', 'south bank': 'London', 'kings cross': 'London',
  'marylebone': 'London', 'chelsea': 'London', 'kensington': 'London', 'battersea': 'London',
  'clapham': 'London', 'fulham': 'London', 'stratford': 'London', 'greenwich': 'London',
  'east london': 'London', 'west london': 'London', 'north london': 'London', 'south london': 'London',
  'southwark': 'London', 'lambeth': 'London', 'tower hamlets': 'London', 'westminster': 'London',
  'hammersmith': 'London', 'wandsworth': 'London', 'lewisham': 'London', 'newham': 'London',
  'haringey': 'London', 'barnet': 'London', 'ealing': 'London', 'brent': 'London',
  'richmond': 'London', 'croydon': 'London', 'bromley': 'London', 'hounslow': 'London',
  // Manchester
  'greater manchester': 'Manchester', 'city of manchester': 'Manchester',
  'northern quarter': 'Manchester', 'ancoats': 'Manchester', 'deansgate': 'Manchester',
  // Edinburgh / Bristol
  'city of edinburgh': 'Edinburgh', 'city of bristol': 'Bristol',
  // Paris
  'ile-de-france': 'Paris', 'arrondissement de paris': 'Paris',
  'le marais': 'Paris', 'montmartre': 'Paris', 'saint-germain': 'Paris', 'belleville': 'Paris',
  // Amsterdam
  'north holland': 'Amsterdam', 'noord-holland': 'Amsterdam',
  'de pijp': 'Amsterdam', 'jordaan': 'Amsterdam', 'oud-west': 'Amsterdam',
  // Spain
  'comunidad de madrid': 'Madrid', 'provincia de barcelona': 'Barcelona',
  'el born': 'Barcelona', 'gothic quarter': 'Barcelona', 'gracia': 'Barcelona',
  // Italy
  'metropolitan city of rome': 'Rome', 'citta metropolitana di roma': 'Rome',
  'metropolitan city of milan': 'Milan', 'citta metropolitana di milano': 'Milan',
  'trastevere': 'Rome', 'navigli': 'Milan', 'brera': 'Milan',
  // New York
  'new york county': 'New York', 'manhattan': 'New York', 'brooklyn': 'New York',
  'queens': 'New York', 'the bronx': 'New York', 'staten island': 'New York',
  'williamsburg': 'New York', 'soho, new york': 'New York', 'lower east side': 'New York',
  'upper east side': 'New York', 'upper west side': 'New York', 'greenpoint': 'New York',
  'bushwick': 'New York', 'dumbo': 'New York', 'harlem': 'New York',
  // Other US
  'san francisco county': 'San Francisco', 'city of los angeles': 'Los Angeles',
  'cook county': 'Chicago', 'king county': 'Seattle',
  // Australia
  'greater sydney': 'Sydney', 'city of sydney': 'Sydney',
  'greater melbourne': 'Melbourne', 'city of melbourne': 'Melbourne',
  'surry hills': 'Sydney', 'newtown': 'Sydney', 'bondi': 'Sydney',
  'fitzroy': 'Melbourne', 'collingwood': 'Melbourne', 'st kilda': 'Melbourne',
  // Asia
  'gangnam': 'Seoul', 'gangnam-gu': 'Seoul', 'hongdae': 'Seoul', 'itaewon': 'Seoul',
  'shibuya': 'Tokyo', 'shinjuku': 'Tokyo', 'roppongi': 'Tokyo', 'harajuku': 'Tokyo',
  // Germany
  'kreuzberg': 'Berlin', 'mitte': 'Berlin', 'prenzlauer berg': 'Berlin', 'neukölln': 'Berlin',
  'friedrichshain': 'Berlin', 'charlottenburg': 'Berlin',
  // Portugal
  'alfama': 'Lisbon', 'bairro alto': 'Lisbon', 'chiado': 'Lisbon',
  // Other
  'city of dublin': 'Dublin', 'city of copenhagen': 'Copenhagen',
}

/**
 * Strip postcodes from start/end of a string.
 * Handles: EU numeric (1016 HD), UK format (SW1A 2AA), US zip (10001), AU (2000)
 */
function stripPostcodes(s: string): string {
  return s
    // Leading: EU numeric postcodes "1016 HD Amsterdam", "75001 Paris"
    .replace(/^\d{3,5}\s*[A-Z]{0,2}\s+/i, '')
    // Leading: UK postcodes "EC2R 8AH London"
    .replace(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\s+/i, '')
    // Trailing: EU numeric postcodes "Amsterdam 1016"
    .replace(/\s+\d{3,5}\s*[A-Z]{0,2}$/i, '')
    // Trailing: UK postcodes "London SW1A 2AA"
    .replace(/\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, '')
    // Trailing: US zip "New York 10001" or AU "Sydney 2000"
    .replace(/\s+\d{4,5}$/i, '')
    .trim()
}

/**
 * Clean a raw location string into a city name.
 * Handles comma-separated values, postcodes, and aliases.
 */
function cleanCity(raw: string): string | null {
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)

  for (const part of parts) {
    const cleaned = stripPostcodes(part)
    if (!cleaned || cleaned.length <= 2) continue
    const lower = cleaned.toLowerCase()
    if (CITY_ALIASES[lower]) return CITY_ALIASES[lower]
    // Skip if it's still just a postcode after cleaning
    if (/^\d/.test(cleaned) || /^[A-Z]{1,2}\d/i.test(cleaned)) continue
    return cleaned
  }

  // Fallback: try last non-postcode part (usually the city in "Street, City" format)
  for (let i = parts.length - 1; i >= 0; i--) {
    const cleaned = stripPostcodes(parts[i])
    if (!cleaned || cleaned.length <= 2) continue
    if (/^\d/.test(cleaned) || /^[A-Z]{1,2}\d/i.test(cleaned)) continue
    const lower = cleaned.toLowerCase()
    if (CITY_ALIASES[lower]) return CITY_ALIASES[lower]
    return cleaned
  }

  return null
}

/**
 * Extract a clean city name from a reco's meta fields.
 * Checks meta.city (from Google Places) and meta.location.
 * Returns null if no city can be determined.
 */
export function extractRecoCity(meta: Record<string, unknown> | undefined | null): string | null {
  if (!meta) return null
  const city = meta.city as string | undefined
  const loc = meta.location as string | undefined

  if (city) {
    const result = cleanCity(city)
    if (result) return result
  }
  if (loc) {
    const result = cleanCity(loc)
    if (result) return result
  }

  return null
}

/**
 * Get the CITY_ALIASES map (for Places page that needs it directly)
 */
export { CITY_ALIASES }
