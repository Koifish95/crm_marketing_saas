import type { ProspectIngestInput } from './prospects'
import { normalizeState } from '../../shared/utils/prospect'

export const OSM_SOURCE = 'openstreetmap'

const SKIP_AMENITIES = new Set([
  'restaurant',
  'cafe',
  'fast_food',
  'bar',
  'pub',
  'fuel',
  'parking',
  'school',
  'kindergarten',
  'place_of_worship',
])

const WEBSITE_TAGS = ['website', 'contact:website', 'url']
const EMAIL_TAGS = ['email', 'contact:email']
const PHONE_TAGS = ['phone', 'contact:phone', 'contact:mobile']

export type OverpassElement = {
  type: string
  id: number
  tags?: Record<string, string>
}

export function overpassQueryForState(stateCode: string) {
  const code = stateCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error('Discovery needs a two-letter state code.')
  }
  return `[out:json][timeout:180];
area["ISO3166-2"="US-${code}"]->.searchArea;
(
  nwr["sport"~"martial_arts|judo|karate|taekwondo|aikido|kendo|brazilian_jiu_jitsu|jiu_jitsu|kickboxing|muay_thai|kung_fu|wushu|hapkido|krav_maga|capoeira|boxing",i](area.searchArea);
  nwr["amenity"="dojo"](area.searchArea);
  nwr["name"~"martial arts|dojo|jiu[- ]?jitsu|karate|taekwondo|tae kwon do|brazilian jiu",i](area.searchArea);
);
out tags center;`
}

export function overpassQueryForUtah() {
  return overpassQueryForState('UT')
}

export function overpassExternalId(element: OverpassElement) {
  return `${element.type}/${element.id}`
}

export function overpassSourceUrl(element: OverpassElement) {
  if (element.type !== 'node' && element.type !== 'way' && element.type !== 'relation') {
    return null
  }
  return `https://www.openstreetmap.org/${element.type}/${element.id}`
}

function firstTag(tags: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = tags[key]?.trim()
    if (value) {
      return value
    }
  }
  return null
}

const DISCIPLINE_ONLY_NAMES = new Set([
  'karate',
  'kung fu',
  'taekwondo',
  'tae kwon do',
  'judo',
  'boxing',
  'jiu jitsu',
  'jiujitsu',
  'brazilian jiu jitsu',
  'mma',
  'martial arts',
  'kickboxing',
  'kenpo',
  'kempo',
])

const MARTIAL_SPORTS = new Set([
  'martial_arts',
  'judo',
  'karate',
  'taekwondo',
  'aikido',
  'kendo',
  'brazilian_jiu_jitsu',
  'jiu_jitsu',
  'jiu-jitsu',
  'kickboxing',
  'muay_thai',
  'kung_fu',
  'wushu',
  'hapkido',
  'krav_maga',
  'capoeira',
  'boxing',
  'kenpo',
  'kempo',
  'mixed_martial_arts',
])

function keepOverpassPlace(name: string, tags: Record<string, string>) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const website = firstTag(tags, WEBSITE_TAGS)
  const phone = firstTag(tags, PHONE_TAGS)
  const city = tags['addr:city']?.trim()
  if (DISCIPLINE_ONLY_NAMES.has(normalized) && !website && !phone && !city) {
    return false
  }
  const sports = (tags.sport ?? '').split(';').map(part => part.trim().toLowerCase()).filter(Boolean)
  const nameLooksMartial = /martial|karate|dojo|jitsu|judo|taekwondo|kung|boxing|kenpo|kempo|mma|kickbox/.test(normalized)
  if (sports.length > 1 && !nameLooksMartial) {
    const martialCount = sports.filter(sport => MARTIAL_SPORTS.has(sport)).length
    if (martialCount < sports.length) {
      return false
    }
  }
  return true
}

function disciplineFrom(tags: Record<string, string>) {
  return tags.sport?.trim() || tags.martial_arts?.trim() || null
}

export function prospectFromOverpassElement(
  element: OverpassElement,
  input: { query: string, rawRef?: string | null, defaultState?: string | null, discoveredAt?: Date },
): ProspectIngestInput | null {
  const tags = element.tags ?? {}
  const name = tags.name?.trim() || tags.official_name?.trim()
  if (!name || !element.type || !Number.isFinite(element.id)) {
    return null
  }
  if (tags.shop?.trim()) {
    return null
  }
  if (tags.amenity && SKIP_AMENITIES.has(tags.amenity.trim())) {
    return null
  }
  if (!keepOverpassPlace(name, tags)) {
    return null
  }
  const state = normalizeState(tags['addr:state']) ?? normalizeState(input.defaultState) ?? null
  return {
    name,
    website: firstTag(tags, WEBSITE_TAGS),
    city: tags['addr:city']?.trim() || null,
    state,
    discipline: disciplineFrom(tags),
    email: firstTag(tags, EMAIL_TAGS),
    phone: firstTag(tags, PHONE_TAGS),
    lane: 'national',
    source: OSM_SOURCE,
    externalId: overpassExternalId(element),
    query: input.query,
    sourceUrl: overpassSourceUrl(element),
    rawRef: input.rawRef ?? null,
    discoveredAt: input.discoveredAt,
  }
}

export function prospectsFromOverpassDocument(
  document: { elements?: OverpassElement[] },
  input: { query: string, rawRef?: string | null, defaultState?: string | null, discoveredAt?: Date },
) {
  const skipped: string[] = []
  const prospects: ProspectIngestInput[] = []
  for (const element of document.elements ?? []) {
    const prospect = prospectFromOverpassElement(element, input)
    if (!prospect) {
      skipped.push(overpassExternalId(element))
      continue
    }
    prospects.push(prospect)
  }
  return { prospects, skipped }
}
