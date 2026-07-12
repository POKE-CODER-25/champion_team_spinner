import { POKEMON_IMAGE_FALLBACK } from '../utils/pokemonImage'

export default function TeamPokemonCard({ pokemon, position }) {
  const handleImageError = (event) => {
    event.currentTarget.onerror = null
    event.currentTarget.src = POKEMON_IMAGE_FALLBACK
  }

  return (
    <article className="rounded-xl border-2 border-brand-blue bg-white p-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">Position {position}</p>
      <div className="mt-2 flex aspect-square items-center justify-center rounded-lg bg-slate-100 p-2">
        <img src={pokemon.image} alt={pokemon.name} loading="lazy" onError={handleImageError}
          className="h-full w-full object-contain" />
      </div>
      <h2 className="mt-3 text-sm font-bold leading-5 text-slate-950">{pokemon.name}</h2>
      <p className="mt-1 text-xs text-slate-600">{pokemon.types.join(' / ')}</p>
    </article>
  )
}
