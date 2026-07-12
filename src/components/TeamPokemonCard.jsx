import { POKEMON_IMAGE_FALLBACK } from '../utils/pokemonImage'

export default function TeamPokemonCard({ pokemon, position }) {
  const handleImageError = (event) => {
    event.currentTarget.onerror = null
    event.currentTarget.src = POKEMON_IMAGE_FALLBACK
  }

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border-2 border-blue-200 bg-white p-3 shadow-sm transition hover:border-brand-blue hover:shadow-md">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">Slot {position}</p>
      <div className="mt-2 flex aspect-square items-center justify-center rounded-lg bg-slate-100 p-2">
        <img src={pokemon.image} alt={pokemon.name} loading="lazy" onError={handleImageError}
          className="h-full w-full object-contain" />
      </div>
      <h2 className="mt-3 min-h-10 break-words text-sm font-bold leading-5 text-slate-950">{pokemon.name}</h2>
      <div className="mt-auto flex flex-wrap gap-1 pt-2" aria-label={`Types: ${pokemon.types.join(', ')}`}>
        {pokemon.types.map((type) => (
          <span key={type} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">{type}</span>
        ))}
      </div>
    </article>
  )
}
