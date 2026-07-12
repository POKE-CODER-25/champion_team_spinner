export const VALID_POKEMON_TYPES = Object.freeze([
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
])

const VALID_TYPE_SET = new Set(VALID_POKEMON_TYPES)
const REQUIRED_KEYS = ['id', 'nationalDex', 'name', 'types', 'image']

export function validateRosterDataset(roster) {
  const errors = []
  const warnings = []

  if (!Array.isArray(roster)) {
    return { valid: false, errors: ['Roster must be an array.'], warnings }
  }

  const ids = new Set()
  const names = new Set()

  roster.forEach((entry, index) => {
    const location = `Entry ${index + 1}`
    const keys = entry && typeof entry === 'object' ? Object.keys(entry).sort() : []

    if (keys.join('|') !== [...REQUIRED_KEYS].sort().join('|')) {
      errors.push(`${location} does not contain exactly the required fields.`)
    }
    if (!entry?.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
      errors.push(`${location} has a missing or invalid URL-safe ID.`)
    } else if (ids.has(entry.id)) {
      errors.push(`Duplicate ID: ${entry.id}.`)
    } else {
      ids.add(entry.id)
    }
    if (!entry?.name || typeof entry.name !== 'string') {
      errors.push(`${location} has a missing name.`)
    } else if (names.has(entry.name)) {
      errors.push(`Duplicate display name: ${entry.name}.`)
    } else {
      names.add(entry.name)
    }
    if (!Number.isInteger(entry?.nationalDex) || entry.nationalDex < 1 || entry.nationalDex > 2000) {
      errors.push(`${location} has an invalid National Pokédex number.`)
    }
    if (!Array.isArray(entry?.types) || entry.types.length < 1 || entry.types.length > 2) {
      errors.push(`${location} must have one or two types.`)
    } else {
      if (new Set(entry.types).size !== entry.types.length) {
        errors.push(`${location} contains duplicate types.`)
      }
      entry.types.forEach((type) => {
        if (!VALID_TYPE_SET.has(type)) errors.push(`${location} has invalid type: ${type}.`)
      })
    }
    if (!entry?.image || typeof entry.image !== 'string') {
      errors.push(`${location} has no image value.`)
    }

    const previous = roster[index - 1]
    if (
      previous &&
      (previous.nationalDex > entry.nationalDex ||
        (previous.nationalDex === entry.nationalDex && previous.id.localeCompare(entry.id) > 0))
    ) {
      errors.push(`${location} is not in National Pokédex and form-ID order.`)
    }
  })

  if (roster.length === 0) warnings.push('Roster is empty.')

  return { valid: errors.length === 0, errors, warnings }
}
