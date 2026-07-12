const HOME_ARTWORK_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home'

export const POKEMON_IMAGE_FALLBACK = '/favicon.svg'

export function getPokemonImage(nationalDex, formImageId = nationalDex) {
  if (!Number.isInteger(nationalDex) || nationalDex < 1 || !formImageId) {
    return POKEMON_IMAGE_FALLBACK
  }

  return `${HOME_ARTWORK_BASE}/${formImageId}.png`
}
