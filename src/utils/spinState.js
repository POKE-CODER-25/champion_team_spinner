import { shuffleArray } from './shuffle.js'

const TEAM_SIZE = 6

function uniqueAllowedIds(ids, allowedIds) {
  if (!Array.isArray(ids)) return []
  return [...new Set(ids)].filter((id) => allowedIds.has(id))
}

export function normalizeSpinState(spinState, ownedPokemonIds) {
  const owned = [...new Set(Array.isArray(ownedPokemonIds) ? ownedPokemonIds : [])]
  const ownedSet = new Set(owned)
  const usedPokemonIds = uniqueAllowedIds(spinState?.usedPokemonIds, ownedSet)
  const usedSet = new Set(usedPokemonIds)
  const unusedPokemonIds = uniqueAllowedIds(spinState?.unusedPokemonIds, ownedSet)
    .filter((id) => !usedSet.has(id))
  const accountedFor = new Set([...usedPokemonIds, ...unusedPokemonIds])

  for (const id of owned) {
    if (!accountedFor.has(id)) unusedPokemonIds.push(id)
  }

  const cycleNumber = Number.isInteger(spinState?.cycleNumber) && spinState.cycleNumber >= 1
    ? spinState.cycleNumber
    : 1
  const totalSpins = Number.isInteger(spinState?.totalSpins) && spinState.totalSpins >= 0
    ? spinState.totalSpins
    : 0

  return {
    unusedPokemonIds,
    usedPokemonIds,
    currentTeamIds: uniqueAllowedIds(spinState?.currentTeamIds, ownedSet).slice(0, TEAM_SIZE),
    cycleNumber,
    totalSpins,
    lastSpinAt: spinState?.lastSpinAt ?? null,
  }
}

export function buildNextSpinState(spinState, ownedPokemonIds, shuffle = shuffleArray) {
  const owned = [...new Set(Array.isArray(ownedPokemonIds) ? ownedPokemonIds : [])]
  if (owned.length < TEAM_SIZE) {
    throw new Error('At least six owned Pokémon are required to generate a team.')
  }

  const normalized = normalizeSpinState(spinState, owned)
  let currentTeamIds
  let unusedPokemonIds
  let usedPokemonIds
  let cycleNumber = normalized.cycleNumber
  let rolloverType = null
  let rolloverMessage = ''

  if (normalized.unusedPokemonIds.length >= TEAM_SIZE) {
    currentTeamIds = shuffle(normalized.unusedPokemonIds).slice(0, TEAM_SIZE)
    const selected = new Set(currentTeamIds)
    unusedPokemonIds = normalized.unusedPokemonIds.filter((id) => !selected.has(id))
    usedPokemonIds = [...normalized.usedPokemonIds, ...currentTeamIds]
  } else if (normalized.unusedPokemonIds.length === 0) {
    cycleNumber += 1
    currentTeamIds = shuffle(owned).slice(0, TEAM_SIZE)
    const selected = new Set(currentTeamIds)
    unusedPokemonIds = owned.filter((id) => !selected.has(id))
    usedPokemonIds = [...currentTeamIds]
    rolloverType = 'empty'
    rolloverMessage = `You used every Pokémon in the previous cycle. Cycle ${cycleNumber} has started.`
  } else {
    const finalOldCycleIds = shuffle(normalized.unusedPokemonIds)
    const finalOldSet = new Set(finalOldCycleIds)
    const refreshedCandidates = owned.filter((id) => !finalOldSet.has(id))
    const newCycleIds = shuffle(refreshedCandidates).slice(0, TEAM_SIZE - finalOldCycleIds.length)
    currentTeamIds = [...finalOldCycleIds, ...newCycleIds]
    const newCycleUsed = new Set(newCycleIds)
    unusedPokemonIds = owned.filter((id) => !newCycleUsed.has(id))
    usedPokemonIds = newCycleIds
    cycleNumber += 1
    rolloverType = 'partial'
    rolloverMessage =
      'All Pokémon from the previous cycle have now been used. A new cycle has started, so part of this team comes from the refreshed roster.'
  }

  return {
    spinState: {
      unusedPokemonIds,
      usedPokemonIds,
      currentTeamIds,
      cycleNumber,
      totalSpins: normalized.totalSpins + 1,
      lastSpinAt: normalized.lastSpinAt,
    },
    rolloverType,
    rolloverMessage,
  }
}
