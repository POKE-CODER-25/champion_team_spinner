function randomIndex(maxExclusive) {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) return Math.floor(Math.random() * maxExclusive)

  const range = 0x100000000
  const limit = range - (range % maxExclusive)
  const values = new Uint32Array(1)
  do {
    cryptoApi.getRandomValues(values)
  } while (values[0] >= limit)

  return values[0] % maxExclusive
}

export function shuffleArray(items) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}
