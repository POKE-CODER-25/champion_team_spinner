import { Check } from 'lucide-react'
import { memo } from 'react'
import { POKEMON_IMAGE_FALLBACK } from '../utils/pokemonImage'

function PokemonCard({ pokemon, selected, editable, disabled, onToggle }) {
  const handleImageError = (event) => {
    event.currentTarget.onerror = null
    event.currentTarget.src = POKEMON_IMAGE_FALLBACK
  }

  const content = (
    <>
      <div className="relative flex aspect-square items-center justify-center rounded-lg bg-slate-100 p-2">
        <img src={pokemon.image} alt={pokemon.name} loading="lazy" onError={handleImageError}
          className="h-full w-full object-contain" />
        {editable && selected && (
          <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand-blue text-white"
            aria-hidden="true">
            <Check className="size-4" />
          </span>
        )}
      </div>
      <span className="mt-3 block text-sm font-bold leading-5 text-slate-950">{pokemon.name}</span>
      <span className="mt-1 block text-xs text-slate-600">{pokemon.types.join(' / ')}</span>
    </>
  )

  const classes = `relative min-w-0 rounded-xl border-2 bg-white p-3 text-left shadow-sm outline-none transition
    ${selected ? 'border-brand-blue ring-1 ring-brand-blue' : 'border-slate-200'}
    ${editable && !disabled ? 'cursor-pointer hover:border-blue-400 focus-visible:ring-3 focus-visible:ring-brand-yellow' : ''}
    ${disabled ? 'cursor-not-allowed opacity-60' : ''}`

  if (!editable) return <article className={classes}>{content}</article>

  return (
    <button type="button" className={classes} onClick={() => onToggle(pokemon.id)}
      aria-pressed={selected} disabled={disabled} aria-label={`${selected ? 'Remove' : 'Add'} ${pokemon.name}`}>
      {content}
    </button>
  )
}

export default memo(PokemonCard)
