export function stemFromFileName(filename) {
  return String(filename || '').replace(/\.[^.]+$/i, '').trim()
}

export function patternHasImage(pattern) {
  return Boolean(pattern?.hasImage || String(pattern?.image || '').trim())
}

/** 全角字符转半角，便于文件名与图纸名对齐 */
function toHalfWidth(text) {
  return String(text || '')
    .replace(/\uFEFF/g, '')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .trim()
}

function stripEmojis(text) {
  return String(text || '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF\uFE00-\uFE0F\u200D\uFEFF]/g, '')
}

function foldMatchText(text) {
  return toHalfWidth(stripEmojis(text)).toLowerCase()
}

/** 去掉表情和分隔符，只保留文字数字，用于「文件名是否包含图纸名」 */
function compactMatchKey(text) {
  return foldMatchText(text).replace(/[^a-z0-9\u3400-\u9fff]/g, '')
}

const NOISE_TOKENS = new Set([
  '拼豆图纸',
  '拼豆版',
  '拼豆',
  '公开图纸',
  '联名图纸',
  '图纸',
  '来自小红书网页版',
  '来自小红书',
  '网页版',
  '小红书',
  '日更版',
  'dora',
  'zoraa',
  'nami',
  '阿豆',
  '隐藏',
])

const SERIES_BRANDS = new Set(['dora', 'zoraa', 'nami'])

const SERIES_BRAND_PATTERN = '(?:dora|zoraa|nami)'

function isWeakMatchKey(key) {
  return !key || key.length < 2 || /^\d+$/.test(key)
}

function isNoiseKey(key) {
  if (isWeakMatchKey(key)) return true
  if (NOISE_TOKENS.has(key)) return true
  if (SERIES_BRANDS.has(key)) return true
  if (key.startsWith('来自')) return true
  return false
}

/** 可用作图纸名匹配的 key（排除 Dora/拼豆图纸 等噪音） */
function isUsableNameKey(key, { allowSingleChar = false } = {}) {
  if (!key) return false
  if (key.length === 1) return allowSingleChar
  if (isWeakMatchKey(key)) return false
  if (isNoiseKey(key)) return false
  return true
}

function uniqueById(patterns) {
  const found = new Map()
  patterns.forEach((pattern) => {
    if (pattern?.id != null) found.set(pattern.id, pattern)
  })
  return [...found.values()]
}

function normalizeAuthor(author) {
  return toHalfWidth(author)
}

function stripCopySuffix(stem) {
  return String(stem || '').replace(/\s*\(\d+\)\s*$/, '').trim()
}

/** 去掉文件名中间的序号，如「七夕 (1) ：月亮之上」→「七夕 月亮之上」 */
function stripInlineIndexes(stem) {
  return String(stem || '').replace(/[（(]\s*\d+\s*[)）]/g, ' ')
}

function normalizeFileStem(stem) {
  return stripCopySuffix(stripInlineIndexes(toHalfWidth(stripEmojis(stem))))
}

/** 去掉「名字Dora大表姐」里的系列尾巴；保留「Dora小红帽」里的名字 */
function stripSeriesBrandTags(stem) {
  return normalizeFileStem(stem).replace(
    new RegExp(
      `([\\u3400-\\u9fffA-Za-z0-9]+)${SERIES_BRAND_PATTERN}[\\s_\\-·．.]*[\\u3400-\\u9fff]+`,
      'gi',
    ),
    '$1',
  )
}

function matchHaystack(stem) {
  return compactMatchKey(stripSeriesBrandTags(stem))
}

/**
 * 小红书导出名：名称_序号_作者
 * 例：Dora小红帽_1_MM、Nami | 荷瑶渡 拼豆图纸_1_叮叮咚
 */
export function extractDownloadMeta(stem) {
  let text = normalizeFileStem(stem)
  text = text.replace(/来自小红书.*$/i, '').replace(/来自\S*网页版.*$/i, '')
  text = text.replace(/[（(][^)）]*[)）]/g, ' ')
  text = text.replace(/^(拼豆图纸|公开图纸|联名图纸)\s*[|｜]?\s*/i, '').trim()
  text = text.replace(/\s+/g, ' ').trim()

  const matched = text.match(/^(.+?)_(\d+)_(.+)$/)
  if (!matched) return null

  let title = matched[1].trim()
  let author = matched[3].trim().split(/[_\s]+/)[0]
  author = author.replace(/[（(].*$/, '').trim()
  if (!title || !author) return null

  // 去掉末尾「拼豆图纸」等噪音
  title = title.replace(/\s*(拼豆图纸|公开图纸|联名图纸|拼豆版|拼豆)\s*$/i, '').trim()

  // 小雏菊Dora大表姐 → 取品牌前的名字
  const nameBeforeBrand = title.match(new RegExp(`^(.*?)${SERIES_BRAND_PATTERN}(.*)$`, 'i'))
  if (nameBeforeBrand && compactMatchKey(nameBeforeBrand[1])) {
    title = nameBeforeBrand[1].trim()
  } else {
    // Dora | 璃水樱落 / Nami | 荷瑶渡 / Dora小红帽 → 去掉品牌前缀
    title = title
      .replace(new RegExp(`^${SERIES_BRAND_PATTERN}(\\s*[|｜]\\s*|\\s*[·．.\\-_]?\\s*)`, 'i'), '')
      .trim()
  }

  title = title.replace(/^[|｜]\s*/, '').trim()
  title = title.replace(/^[-_—–~·．.\s|｜]+|[-_—–~·．.\s|｜]+$/g, '').trim()
  if (!title || !author) return null
  return { name: title, author, index: matched[2] }
}

/**
 * 作者模糊相等：
 * - 白榆 ↔ 白榆不是树（前缀）
 * - 奶糖 ↔ 穗穗奶糖（后缀）
 * 不用 includes，避免 MM-Nami 误匹配文件名里的 Nami
 */
function authorLooseEquals(a, b) {
  const left = compactMatchKey(a)
  const right = compactMatchKey(b)
  if (!left || !right) return false
  if (left === right) return true

  const isShortLatin = (value) => /^[a-z0-9]+$/.test(value) && value.length <= 8
  // 纯英文短名（Nami / MM 等）只允许全等，避免品牌词串作者
  if (isShortLatin(left) || isShortLatin(right)) return false

  const shorter = left.length <= right.length ? left : right
  if (shorter.length < 2) return false

  return (
    left.startsWith(right)
    || right.startsWith(left)
    || left.endsWith(right)
    || right.endsWith(left)
  )
}

/** 文件名里能否模糊命中作者（白榆 ↔ 白榆不是树） */
function authorFuzzyHit(stem, author) {
  const authorKey = compactMatchKey(author)
  if (!authorKey) return false

  const meta = extractDownloadMeta(stem)
  if (meta?.author) {
    return authorLooseEquals(author, meta.author)
  }

  const haystack = compactMatchKey(normalizeFileStem(stem))
  if (haystack.includes(authorKey)) return true
  return tokenizeFileStem(stem).some((token) => authorLooseEquals(author, token))
}

function findPatternsByDownloadMeta(stem, patterns) {
  const meta = extractDownloadMeta(stem)
  if (!meta || !patterns?.length) return []

  // 只用解析出的标题匹配图纸名，避免文件名里的 Dora 误伤「铃兰-Dora」
  const metaNameHaystack = compactMatchKey(meta.name)
  if (!metaNameHaystack) return []

  const scored = []
  patterns.forEach((pattern) => {
    const patternKeys = patternNameKeys(pattern, { allowSingleChar: true })
      .filter((key) => isUsableNameKey(key, { allowSingleChar: true }))
      .sort((a, b) => b.length - a.length)

    const hitKey = patternKeys.find((key) => metaNameHaystack.includes(key))
    if (!hitKey) return

    const authorHit = authorLooseEquals(pattern.author, meta.author)
    scored.push({
      pattern,
      keyLen: hitKey.length,
      authorHit,
    })
  })

  if (!scored.length) return []

  // 小红书格式带作者时，作者必须模糊对上，不能回退到无关作者
  const withAuthor = scored.filter((item) => item.authorHit)
  if (meta.author) {
    if (!withAuthor.length) return []
    return pickLongestKeyMatches(withAuthor)
  }

  return pickLongestKeyMatches(scored)
}

const TYPE_HINTS = [
  { pattern: /付费/, type: 'paid' },
  { pattern: /免费/, type: 'free' },
  { pattern: /会员/, type: 'member' },
]

/** 去掉文件名中名称与作者之间的常见分隔符 */
function stripNameAuthorSeparators(text) {
  return String(text || '')
    .replace(/^[-_—–~·．.。、（）()【】\[\]\s]+/, '')
    .replace(/[-_—–~·．.。、（）()【】\[\]\s]+$/, '')
    .trim()
}

/** 生成可用于匹配的名称变体（原名称、去 *数字、去末尾数字） */
export function nameMatchKeys(name) {
  const normalized = toHalfWidth(name)
  if (!normalized) return []

  const keys = new Set([normalized])

  const withoutStarQty = normalized.replace(/\*\d+$/, '').trim()
  if (withoutStarQty) keys.add(withoutStarQty)

  const base = withoutStarQty || normalized
  const withoutTrailingDigits = base.replace(/\d+$/, '').trim()
  if (withoutTrailingDigits && withoutTrailingDigits !== base) {
    keys.add(withoutTrailingDigits)
  }

  return [...keys]
}

function patternNameKeys(pattern, { allowSingleChar = false } = {}) {
  const keys = new Set(
    nameMatchKeys(pattern?.name)
      .map(compactMatchKey)
      .filter((key) => isUsableNameKey(key, { allowSingleChar })),
  )

  const parts = toHalfWidth(pattern?.name || '')
    .split(/[-_—–~·．.。、：:|]/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length > 1) {
    const last = compactMatchKey(parts[parts.length - 1])
    if (isUsableNameKey(last, { allowSingleChar })) {
      keys.add(last)
    }
    // 铃兰-Dora → 也保留去品牌后的「铃兰」
    const first = compactMatchKey(parts[0])
    if (isUsableNameKey(first, { allowSingleChar })) {
      keys.add(first)
    }
  }

  return [...keys]
}

/** 仅当「名字 + Dora + 系列词」时，Dora 后的词才当系列词跳过 */
function isSeriesFollowerToken(tokens, index) {
  if (index <= 0) return false
  const prev = compactMatchKey(tokens[index - 1])
  if (!SERIES_BRANDS.has(prev)) return false
  return tokens.slice(0, index - 1).some((token) => {
    const key = compactMatchKey(token)
    return key && !SERIES_BRANDS.has(key) && !isNoiseKey(key) && !/^\d+$/.test(key)
  })
}

function isSubMatchOfLongerTitleToken(matchedKey, tokens) {
  return tokens.some((token, index) => {
    if (isSeriesFollowerToken(tokens, index)) return false
    const tokenKey = compactMatchKey(token)
    if (!tokenKey || SERIES_BRANDS.has(tokenKey) || isNoiseKey(tokenKey)) return false
    return tokenKey.length > matchedKey.length && tokenKey.includes(matchedKey)
  })
}

function disambiguateByType(candidates, stem) {
  if (candidates.length <= 1) return candidates
  const folded = foldMatchText(stem)
  const hintedTypes = TYPE_HINTS.filter((item) => item.pattern.test(folded)).map((item) => item.type)
  if (!hintedTypes.length) return candidates
  const matched = candidates.filter((pattern) => hintedTypes.includes(pattern.type))
  return matched.length ? matched : candidates
}

function authorMatchesRest(author, rest) {
  const normalizedAuthor = foldMatchText(stripNameAuthorSeparators(author))
  const normalizedRest = foldMatchText(stripNameAuthorSeparators(rest))
  if (!normalizedAuthor || !normalizedRest) return false

  const authorKey = compactMatchKey(normalizedAuthor)
  const restKey = compactMatchKey(normalizedRest)
  if (authorKey && restKey && (restKey.includes(authorKey) || authorKey.includes(restKey))) {
    return true
  }

  return (
    normalizedRest === normalizedAuthor ||
    normalizedAuthor.startsWith(normalizedRest) ||
    normalizedRest.startsWith(normalizedAuthor) ||
    normalizedAuthor.includes(normalizedRest) ||
    normalizedRest.includes(normalizedAuthor)
  )
}

function pickLongestKeyMatches(scored) {
  if (!scored.length) return []
  const maxLen = Math.max(...scored.map((item) => item.keyLen))
  return uniqueById(scored.filter((item) => item.keyLen === maxLen).map((item) => item.pattern))
}

/** 去掉噪音后的文件名标题（用于精确对比） */
function titleHaystackFromStem(stem) {
  const meta = extractDownloadMeta(stem)
  if (meta?.name) return compactMatchKey(meta.name)

  let text = normalizeFileStem(stem)
  text = text.replace(/来自小红书.*$/i, '').replace(/来自\S*网页版.*$/i, '')
  text = text.replace(/^(拼豆图纸|公开图纸|联名图纸)\s*[|｜_\-]?/i, '')
  return compactMatchKey(text)
}

function leftoverAfterRemovingName(haystack, nameKey) {
  const idx = haystack.indexOf(nameKey)
  if (idx === -1) return null
  return haystack.slice(0, idx) + haystack.slice(idx + nameKey.length)
}

/**
 * 文件名比图纸名多出一段标题（如 梵星·星月夜 vs 星月夜）→ 不算完整匹配
 */
function hasUnacceptableTitleLeftover(stem, pattern, matchedNameKey) {
  const haystack = compactMatchKey(normalizeFileStem(stem))
  const nameKey = matchedNameKey || compactMatchKey(pattern.name)
  if (!nameKey || !haystack.includes(nameKey)) return true

  let leftover = leftoverAfterRemovingName(haystack, nameKey)
  if (leftover == null) return true
  if (!leftover) return false

  const authorKey = compactMatchKey(pattern.author)
  if (authorKey && leftover.includes(authorKey)) {
    leftover = leftover.split(authorKey).join('')
  }

  NOISE_TOKENS.forEach((noise) => {
    const noiseKey = compactMatchKey(noise)
    if (noiseKey && leftover.includes(noiseKey)) {
      leftover = leftover.split(noiseKey).join('')
    }
  })
  SERIES_BRANDS.forEach((brand) => {
    if (leftover.includes(brand)) leftover = leftover.split(brand).join('')
  })
  leftover = leftover.replace(/\d+/g, '')

  const cjkLeft = leftover.replace(/[a-z]/gi, '')
  return cjkLeft.length >= 2
}

/** 去掉间隔符后文件名与图纸名完全一致 */
function findPatternsByExactCompactName(stem, patterns) {
  if (!stem || !patterns?.length) return []

  const titleKey = titleHaystackFromStem(stem)
  const fullKey = compactMatchKey(normalizeFileStem(stem))
  const scored = []

  patterns.forEach((pattern) => {
    const nameKey = compactMatchKey(pattern.name)
    if (!nameKey || nameKey.length < 2) return
    if (nameKey !== titleKey && nameKey !== fullKey) return
    scored.push({ pattern, keyLen: nameKey.length })
  })

  return pickLongestKeyMatches(scored)
}

function splitScriptRuns(token) {
  return String(token || '').match(/[a-z0-9]+|[\u3400-\u9fff]+/gi) || []
}

function tokenizeFileStem(stem) {
  const cleaned = foldMatchText(normalizeFileStem(stem))
  const rawTokens = cleaned
    .split(/[-_—–~·．.。、：:|（）()【】[\]\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)

  const tokens = []
  rawTokens.forEach((token) => {
    const runs = splitScriptRuns(token)
    if (runs.length > 1) tokens.push(...runs)
    else tokens.push(token)
  })
  return tokens.filter(Boolean)
}

/**
 * 模糊匹配：文件名包含图纸名；有作者时按作者消歧，纯文件名则要求标题完整匹配
 */
export function findPatternsByFuzzyNameAndAuthor(stem, patterns) {
  const haystack = compactMatchKey(normalizeFileStem(stem))
  if (!haystack || !patterns?.length) return []

  const meta = extractDownloadMeta(stem)
  const titleHaystack = meta?.name ? compactMatchKey(meta.name) : titleHaystackFromStem(stem)
  const hasAuthorHint = Boolean(meta?.author)

  const scored = []
  patterns.forEach((pattern) => {
    if (hasAuthorHint) {
      if (!authorFuzzyHit(stem, pattern.author)) return
    }

    const nameKeys = patternNameKeys(pattern, { allowSingleChar: false })
      .filter((key) => isUsableNameKey(key))
      .sort((a, b) => b.length - a.length)

    const fullKey = compactMatchKey(pattern.name)
    if (fullKey && (fullKey === titleHaystack || fullKey === haystack)) {
      scored.push({ pattern, keyLen: fullKey.length + 100 })
      return
    }

    const titleHitKey = titleHaystack
      ? nameKeys.find((key) => titleHaystack.includes(key))
      : null
    if (titleHitKey) {
      if (hasUnacceptableTitleLeftover(stem, pattern, titleHitKey)) return
      scored.push({
        pattern,
        keyLen: Math.max(titleHitKey.length, fullKey.length) + (hasAuthorHint ? 50 : 0),
      })
      return
    }

    if (!hasAuthorHint) return
    if (!authorFuzzyHit(stem, pattern.author)) return

    const hitKey = nameKeys.find((key) => haystack.includes(key))
    if (!hitKey) return
    if (/^[a-z0-9]+$/.test(hitKey)) return
    if (hasUnacceptableTitleLeftover(stem, pattern, hitKey)) return

    scored.push({ pattern, keyLen: Math.max(hitKey.length, fullKey.length) })
  })

  return pickLongestKeyMatches(scored)
}

/**
 * 文件名带作者时的匹配：如「彩虹雪糕酸奶」「彩虹雪糕-酸奶」
 * 名称可出现在文件名任意位置
 */
export function findPatternsByNameAndAuthor(stem, patterns) {
  const normalizedStem = normalizeFileStem(stem)
  if (!normalizedStem || !patterns?.length) return []

  const foldedStem = foldMatchText(normalizedStem)
  const scored = []

  patterns.forEach((pattern) => {
    const author = normalizeAuthor(pattern.author)
    if (!author) return

    const nameKeys = nameMatchKeys(pattern.name)
      .filter((key) => key && key.length >= 2)
      .sort((a, b) => b.length - a.length)

    for (const nameKey of nameKeys) {
      const foldedKey = foldMatchText(nameKey)
      const index = foldedStem.indexOf(foldedKey)
      if (index === -1) continue
      if (normalizedStem.length <= nameKey.length) continue

      const before = normalizedStem.slice(0, index)
      const after = normalizedStem.slice(index + nameKey.length)
      if (!authorMatchesRest(author, after) && !authorMatchesRest(author, before)) continue

      scored.push({ pattern, keyLen: nameKey.length })
      break
    }
  })

  return pickLongestKeyMatches(scored)
}

function buildPatternLookup(patterns) {
  const map = new Map()

  for (const pattern of patterns) {
    const keys = new Set(nameMatchKeys(pattern.name))
    const compact = compactMatchKey(pattern.name)
    if (compact) keys.add(compact)
    keys.forEach((key) => {
      if (!key || map.has(key)) return
      map.set(key, pattern)
    })
  }

  return map
}

function buildPatternLookupMulti(patterns) {
  const map = new Map()

  for (const pattern of patterns) {
    const keys = new Set(nameMatchKeys(pattern.name))
    const compact = compactMatchKey(pattern.name)
    if (compact) keys.add(compact)
    keys.forEach((key) => {
      if (!key) return
      if (!map.has(key)) map.set(key, [])
      const list = map.get(key)
      if (!list.some((item) => item.id === pattern.id)) {
        list.push(pattern)
      }
    })
  }

  return map
}

/** 按文件名匹配图纸名称，支持数量后缀的双向匹配（取第一条） */
export function findPatternByStem(stem, map) {
  if (!map?.size) return null

  for (const key of nameMatchKeys(stem)) {
    if (map.has(key)) return map.get(key)
    const compact = compactMatchKey(key)
    if (compact && map.has(compact)) return map.get(compact)
  }

  const stemCompact = compactMatchKey(stem)
  if (stemCompact && map.has(stemCompact)) return map.get(stemCompact)

  return null
}

function pickAuthorVariantGroup(candidates, stem) {
  const unique = uniqueById(candidates)
  if (unique.length <= 1) return unique

  const authorKey = (pattern) => String(pattern.author || '').trim() || '__empty__'
  const byAuthor = new Map()
  unique.forEach((pattern) => {
    const key = authorKey(pattern)
    if (!byAuthor.has(key)) byAuthor.set(key, [])
    byAuthor.get(key).push(pattern)
  })

  const exactStem = toHalfWidth(stem)
  const exactCompact = compactMatchKey(stem)
  const exactMatches = unique.filter((pattern) => {
    const name = toHalfWidth(pattern.name)
    return name === exactStem || compactMatchKey(pattern.name) === exactCompact
  })
  if (exactMatches.length) {
    const withFileAuthor = exactMatches.filter((pattern) => authorFuzzyHit(stem, pattern.author))
    if (withFileAuthor.length) return uniqueById(withFileAuthor)
    return exactMatches
  }

  let best = unique
  byAuthor.forEach((group) => {
    if (group.length > best.length) best = group
  })
  return best
}

function disambiguateByAuthor(candidates, stem) {
  if (candidates.length <= 1) return candidates

  const haystack = compactMatchKey(stem)
  const withAuthor = candidates.filter((pattern) => {
    const author = compactMatchKey(pattern.author)
    return author && (haystack.includes(author) || authorFuzzyHit(stem, pattern.author))
  })
  // 文件名能识别到作者时，只保留作者对得上的，避免 Dora 误匹配到其他作者
  if (withAuthor.length) return pickAuthorVariantGroup(withAuthor, stem)

  const meta = extractDownloadMeta(stem)
  if (meta?.author) {
    const metaAuthorHits = candidates.filter((pattern) =>
      authorLooseEquals(pattern.author, meta.author),
    )
    if (metaAuthorHits.length) return pickAuthorVariantGroup(metaAuthorHits, stem)
    // 带明确作者却对不上 → 不算匹配
    return []
  }

  return pickAuthorVariantGroup(candidates, stem)
}

function disambiguateMatches(candidates, stem) {
  return disambiguateByType(disambiguateByAuthor(candidates, stem), stem)
}

/** 按文件名匹配全部相关图纸；同作者变体（如 xxx1/xxx2 对 xxx）会一并返回 */
export function findPatternsByStem(stem, map) {
  if (!map?.size) return []

  const found = new Map()
  const tryAdd = (key) => {
    if (!key || !map.has(key)) return
    const list = map.get(key)
    const items = Array.isArray(list) ? list : [list]
    items.forEach((pattern) => {
      if (pattern?.id != null) found.set(pattern.id, pattern)
    })
  }

  for (const key of nameMatchKeys(stem)) {
    tryAdd(key)
    tryAdd(compactMatchKey(key))
  }
  tryAdd(compactMatchKey(stem))

  return pickAuthorVariantGroup([...found.values()], stem)
}

function remainderIsNoise(tokenKey, matchedKey) {
  const index = tokenKey.indexOf(matchedKey)
  if (index === -1) return false
  const before = tokenKey.slice(0, index)
  const after = tokenKey.slice(index + matchedKey.length)
  return isNoiseKey(before) && isNoiseKey(after)
}

function collectTokenMatches(stem, patterns) {
  const tokens = tokenizeFileStem(stem)
  const haystack = matchHaystack(stem)
  const matches = []

  tokens.forEach((token, tokenIndex) => {
    if (isSeriesFollowerToken(tokens, tokenIndex)) return
    const tokenKey = compactMatchKey(token)
    if (!tokenKey || /^\d+$/.test(tokenKey)) return
    if (isNoiseKey(tokenKey) && tokenKey.length !== 1) return

    patterns.forEach((pattern) => {
      const authorKey = compactMatchKey(pattern.author)
      const authorHit = Boolean(authorKey) && haystack.includes(authorKey)
      const keys = patternNameKeys(pattern, { allowSingleChar: authorHit })
        .sort((a, b) => b.length - a.length)
      const fullKey = compactMatchKey(pattern.name)
      const exact = keys.find((key) => key === tokenKey)
        if (exact) {
        if (exact.length < 2 && !authorHit) return
        if (isSubMatchOfLongerTitleToken(exact, tokens)) return
        if (hasUnacceptableTitleLeftover(stem, pattern, exact)) return

        const isFullName = exact === fullKey
        const isProperSuffix = !isFullName && fullKey.endsWith(exact)
        if (isProperSuffix) {
          const prefix = fullKey.slice(0, -exact.length)
          if (!prefix || !haystack.includes(prefix)) return
        }

        matches.push({
          pattern,
          keyLen: Math.max(exact.length, fullKey.length),
          tokenIndex,
          authorHit,
          score:
            Math.max(exact.length, fullKey.length) * 10 +
            (isFullName || haystack.includes(fullKey) ? 80 : 3) +
            (authorHit ? 50 : 0),
        })
        return
      }

      const contained = keys.find((key) => key.length >= 2 && remainderIsNoise(tokenKey, key))
      if (contained) {
        if (isSubMatchOfLongerTitleToken(contained, tokens)) return
        if (hasUnacceptableTitleLeftover(stem, pattern, contained)) return
        matches.push({
          pattern,
          keyLen: Math.max(contained.length, fullKey.length),
          tokenIndex,
          authorHit,
          score: Math.max(contained.length, fullKey.length) * 10 + (authorHit ? 50 : 0),
        })
      }
    })
  })

  return matches
}

function findLetterSetPatterns(stem, patterns) {
  const tokens = tokenizeFileStem(stem)
  const letterTokens = tokens
    .map((token, index) => ({ token, index, key: compactMatchKey(token) }))
    .filter((item) => /^[a-z]{2,8}$/i.test(item.key) && !isNoiseKey(item.key))
  if (!letterTokens.length) return []

  const stemKey = compactMatchKey(stem)
  const scored = []

  letterTokens.forEach((letterToken) => {
    const letters = letterToken.key.split('')
    const groups = new Map()

    patterns.forEach((pattern) => {
      const nameKey = compactMatchKey(pattern.name)
      if (nameKey.length < 2) return
      const last = nameKey.slice(-1)
      if (!letters.includes(last)) return
      const prefix = nameKey.slice(0, -1)
      if (!prefix) return
      const author = String(pattern.author || '').trim()
      const groupKey = `${author}|${prefix}`
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { author, prefix, byLetter: new Map() })
      }
      const group = groups.get(groupKey)
      if (!group.byLetter.has(last)) group.byLetter.set(last, [])
      group.byLetter.get(last).push(pattern)
    })

    const complete = []
    groups.forEach((group) => {
      if (letters.some((letter) => !group.byLetter.has(letter))) return
      const authorKey = compactMatchKey(group.author)
      const authorHit = Boolean(authorKey) && stemKey.includes(authorKey)
      complete.push({
        ...group,
        authorHit,
        patterns: uniqueById(letters.flatMap((letter) => group.byLetter.get(letter) || [])),
      })
    })

    if (!complete.length) return

    complete.sort((a, b) => {
      if (a.authorHit !== b.authorHit) return a.authorHit ? -1 : 1
      return b.prefix.length - a.prefix.length
    })

    const best = complete[0]
    best.patterns.forEach((pattern) => {
      scored.push({
        pattern,
        keyLen: compactMatchKey(pattern.name).length,
        tokenIndex: letterToken.index,
        score: letters.length * 10 + best.prefix.length + (best.authorHit ? 20 : 0),
      })
    })
  })

  return scored
}

function pickBestScoredMatches(scored) {
  if (!scored.length) return []

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (Boolean(b.authorHit) !== Boolean(a.authorHit)) return a.authorHit ? -1 : 1
    if (b.tokenIndex !== a.tokenIndex) return a.tokenIndex - b.tokenIndex
    return b.keyLen - a.keyLen
  })

  const bestScore = scored[0].score
  const top = scored.filter((item) => item.score === bestScore)
  return uniqueById(top.map((item) => item.pattern))
}

/** 文件名包含数据库图纸名则匹配；优先完整更长的名字，避免短名截胡 */
export function findPatternsByContainedName(stem, patterns) {
  if (!stem || !patterns?.length) return []

  const haystack = matchHaystack(stem)
  if (!haystack) return []

  const titleKey = titleHaystackFromStem(stem)
  const fullMatches = []
  patterns.forEach((pattern) => {
    const fullKey = compactMatchKey(pattern.name)
    if (!fullKey || fullKey.length < 2) return
    if (!haystack.includes(fullKey) && titleKey !== fullKey) return
    if (hasUnacceptableTitleLeftover(stem, pattern, fullKey)) return

    const authorKey = compactMatchKey(pattern.author)
    const authorHit = Boolean(authorKey) && haystack.includes(authorKey)
    const exact = fullKey === titleKey || fullKey === haystack
    fullMatches.push({
      pattern,
      keyLen: fullKey.length,
      tokenIndex: 0,
      authorHit,
      score: fullKey.length * 10 + (exact ? 200 : 80) + (authorHit ? 50 : 0),
    })
  })

  const tokenMatches = collectTokenMatches(stem, patterns)
  const letterMatches = findLetterSetPatterns(stem, patterns)
  const picked = pickBestScoredMatches([...fullMatches, ...tokenMatches, ...letterMatches])
  if (picked.length) return disambiguateMatches(picked, stem)

  const tokens = tokenizeFileStem(stem)
  const scored = []
  patterns.forEach((pattern) => {
    const fullKey = compactMatchKey(pattern.name)
    const authorKey = compactMatchKey(pattern.author)
    const authorHit = Boolean(authorKey) && haystack.includes(authorKey)
    if (!fullKey) return
    if (fullKey.length < 2 && !authorHit) return
    if (isSubMatchOfLongerTitleToken(fullKey, tokens)) return
    if (hasUnacceptableTitleLeftover(stem, pattern, fullKey)) return

    if (haystack.includes(fullKey)) {
      scored.push({
        pattern,
        keyLen: fullKey.length + 2 + (authorHit ? 20 : 0),
      })
      return
    }

    const suffixKeys = patternNameKeys(pattern, { allowSingleChar: authorHit })
      .filter((key) => key !== fullKey && key.length >= 2 && isUsableNameKey(key))
      .sort((a, b) => b.length - a.length)
    const matchedKey = suffixKeys.find((key) => haystack.includes(key))
    if (!matchedKey) return
    if (isSubMatchOfLongerTitleToken(matchedKey, tokens)) return
    if (hasUnacceptableTitleLeftover(stem, pattern, matchedKey)) return
    const prefix = fullKey.endsWith(matchedKey) ? fullKey.slice(0, -matchedKey.length) : ''
    if (!prefix || !haystack.includes(prefix)) return
    scored.push({
      pattern,
      keyLen: fullKey.length + (authorHit ? 20 : 0),
    })
  })

  const best = pickLongestKeyMatches(scored)
  if (!best.length) return []
  return disambiguateMatches(best, stem)
}

/** 仅收录尚无图片的图纸，同名取第一条 */
export function buildPatternNameMap(patterns) {
  return buildPatternLookup(patterns.filter((pattern) => !patternHasImage(pattern)))
}

/**
 * 文件名整段等于图纸名「-」前的系列前缀时，匹配该系列下全部图纸
 * 例：像素画展卖馆.jpg → 像素画展卖馆-小格里 / 潮汐二 / 富士山 …
 */
export function findPatternsByExactSeriesPrefix(stem, patterns) {
  const haystack = matchHaystack(stem)
  if (!haystack || haystack.length < 2 || !patterns?.length) return []

  const hits = []
  patterns.forEach((pattern) => {
    const parts = toHalfWidth(pattern?.name || '')
      .split(/[-_—–~·．.。、：:|]/)
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length < 2) return
    const seriesKey = compactMatchKey(parts[0])
    if (!seriesKey || seriesKey.length < 2) return
    if (seriesKey === haystack) hits.push(pattern)
  })

  return uniqueById(hits)
}

/**
 * 按策略优先级解析候选；优先返回「尚无图片」的图纸。
 * 例：麦麦.jpg 不应卡在已有图的「麦麦」，而应落到「麦麦-枫糖原味」等无图项。
 */
function resolveMatchCandidates(stem, patterns, nameMap) {
  const strategies = [
    // 1. 去掉间隔符后文件名与图纸名完全一致（梵星·星月夜 ≡ 梵星星月夜）
    () => disambiguateByType(findPatternsByExactCompactName(stem, patterns), stem),
    // 2. 原始文件名键精确匹配
    () => disambiguateByType(findPatternsByStem(stem, nameMap), stem),
    // 3. 文件名恰好是「系列前缀」（如 麦麦.jpg → 麦麦-xxx）
    () => findPatternsByExactSeriesPrefix(stem, patterns),
    // 4. 图纸名 + 作者 都在文件名里
    () => disambiguateByType(findPatternsByFuzzyNameAndAuthor(stem, patterns), stem),
    () => disambiguateByType(findPatternsByDownloadMeta(stem, patterns), stem),
    () => disambiguateByType(findPatternsByNameAndAuthor(stem, patterns), stem),
    // 5. 包含匹配：优先更长完整名，拒绝「梵星·星月夜 → 星月夜」这类截胡
    () => findPatternsByContainedName(stem, patterns),
  ]

  let firstWithImageOnly = null

  for (const strategy of strategies) {
    const candidates = strategy()
    if (!candidates?.length) continue

    const noImage = candidates.filter((pattern) => !patternHasImage(pattern))
    if (noImage.length) return noImage

    if (!firstWithImageOnly) firstWithImageOnly = candidates
  }

  return firstWithImageOnly || []
}

function formatMatchMessage(prefix, patterns) {
  if (patterns.length > 1) return `${prefix} ${patterns.length} 张图纸`
  const first = patterns[0]
  if (!first?.name) return prefix
  const author = String(first.author || '').trim()
  return author ? `${prefix}（${first.name} · ${author}）` : `${prefix}（${first.name}）`
}

function isWindowsCopyName(filename) {
  return /\(\d+\)\s*$/.test(stemFromFileName(filename))
}

function matchOneFile(file, patterns, allMap, usedPatternIds) {
  const stem = stemFromFileName(file.name)
  let status = 'matched'
  let message = '可更新'
  let matchedPatterns = []

  if (!stem) {
    status = 'error'
    message = '文件名为空'
  } else {
    const resolved = resolveMatchCandidates(stem, patterns, allMap)
    const unused = resolved.filter((pattern) => !usedPatternIds.has(pattern.id))
    const noImage = unused.filter((pattern) => !patternHasImage(pattern))
    const withImage = unused.filter((pattern) => patternHasImage(pattern))

    if (noImage.length) {
      matchedPatterns = noImage
      resolved.forEach((pattern) => usedPatternIds.add(pattern.id))
      message = formatMatchMessage('可更新', matchedPatterns)
    } else if (resolved.length && unused.length === 0) {
      status = 'skipped'
      matchedPatterns = resolved
      message = formatMatchMessage('该图纸已由其他图片匹配', resolved)
    } else if (withImage.length) {
      status = 'skipped'
      matchedPatterns = withImage
      message = formatMatchMessage('图纸已有图片，跳过', withImage)
    } else {
      status = 'unmatched'
      message = '未找到对应图纸'
    }
  }

  return {
    file,
    stem,
    pattern: matchedPatterns[0] || null,
    patterns: matchedPatterns,
    status,
    message,
  }
}

/** 将图片文件按文件名与图纸名称匹配；文件名包含图纸名即可 */
export function matchImagesToPatterns(files, patterns) {
  const allMap = buildPatternLookupMulti(patterns)
  const usedPatternIds = new Set()
  const results = new Array(files.length)
  const order = files
    .map((file, index) => ({ file, index }))
    .sort((a, b) => {
      const copyDiff = Number(isWindowsCopyName(a.file.name)) - Number(isWindowsCopyName(b.file.name))
      return copyDiff || a.index - b.index
    })

  order.forEach(({ file, index }) => {
    results[index] = matchOneFile(file, patterns, allMap, usedPatternIds)
  })

  return results
}
