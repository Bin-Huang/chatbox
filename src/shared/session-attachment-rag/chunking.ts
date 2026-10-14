// Recursive text chunking without external runtime dependencies (avoids Node stream/web bundler issues in renderer)

// Sizes are CHARACTER counts. Mastra's `recursive` chunker uses `text.length` as its
// default length function, so `maxSize` is in chars, not tokens. Earlier `_TOKENS`
// names were a misnomer — actual chunks were ~1/4 of the implied tokens. Values kept
// because retrieval evals showed they recall well at this size.
// `tokenEstimate` (length / 4) is preserved for DB metadata only.
export const PARENT_TARGET_CHARS = 1600 // ≈ 400 tokens
export const PARENT_HARD_CAP_CHARS = 2400 // ≈ 600 tokens
export const CHILD_SIZE_CHARS = 448 // ≈ 112 tokens
export const CHILD_OVERLAP_CHARS = 64 // ≈ 16 tokens
export const PLAIN_PARENT_OVERLAP_CHARS = 0

export interface ParentBlock {
  parentOrder: number
  sectionPath?: string
  text: string
  tokenEstimate: number
  charCount: number
}

export interface ChildChunk {
  parentOrder: number
  chunkOrder: number
  sectionPath?: string
  rawText: string
  tokenEstimate: number
  entities?: string[]
  keywords?: string[]
  chapterOrder?: number
  storyTime?: string
  priorityRank?: number
  kind?: string
  metadata?: Record<string, unknown>
}

export interface StructuralSegment {
  text: string
  sectionPath?: string
}

export type AttachmentChunkingPipeline = 'structured' | 'plain'

export interface AttachmentChunkingResult {
  parents: ParentBlock[]
  children: ChildChunk[]
}

const STRUCTURED_CHUNKING_EXTENSIONS = new Set(['md', 'mdx', 'json', 'jsonl', 'ts', 'tsx', 'js', 'jsx', 'py', 'go'])

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

export function getFileExtension(filename?: string): string | undefined {
  if (!filename) {
    return undefined
  }
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts.at(-1) : undefined
}

export function isStructuredChunkingType(filename?: string): boolean {
  const extension = getFileExtension(filename)
  return extension ? STRUCTURED_CHUNKING_EXTENSIONS.has(extension) : false
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim()
  return /^#{1,6}\s+/.test(trimmed) || /^(\d+(\.\d+)*[.)])\s+\S+/.test(trimmed)
}

function extractHeading(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/^(\d+(\.\d+)*[.)])\s+/, '')
    .trim()
}

function isListLine(line: string): boolean {
  return /^(\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(line)
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.includes('|') && trimmed.length > 2
}

function flushBlock(blocks: StructuralSegment[], lines: string[], sectionPath?: string) {
  const text = lines.join('\n').trim()
  if (text) {
    blocks.push({ text, sectionPath })
  }
}

export function splitIntoStructuralSegments(content: string): StructuralSegment[] {
  const normalized = content.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const blocks: StructuralSegment[] = []

  let currentLines: string[] = []
  let currentSectionPath: string | undefined
  let inCodeBlock = false
  let currentMode: 'default' | 'list' | 'table' = 'default'

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (!inCodeBlock && currentLines.length > 0) {
        flushBlock(blocks, currentLines, currentSectionPath)
        currentLines = []
      }
      currentLines.push(line)
      inCodeBlock = !inCodeBlock
      if (!inCodeBlock) {
        flushBlock(blocks, currentLines, currentSectionPath)
        currentLines = []
      }
      currentMode = 'default'
      continue
    }

    if (inCodeBlock) {
      currentLines.push(line)
      continue
    }

    if (isHeadingLine(line)) {
      if (currentLines.length > 0) {
        flushBlock(blocks, currentLines, currentSectionPath)
        currentLines = []
      }
      currentSectionPath = extractHeading(line)
      currentLines.push(line)
      currentMode = 'default'
      continue
    }

    if (!trimmed) {
      if (currentLines.length > 0) {
        flushBlock(blocks, currentLines, currentSectionPath)
        currentLines = []
      }
      currentMode = 'default'
      continue
    }

    const nextMode: 'default' | 'list' | 'table' = isTableLine(line) ? 'table' : isListLine(line) ? 'list' : 'default'
    if (currentLines.length > 0 && currentMode !== 'default' && nextMode !== currentMode) {
      flushBlock(blocks, currentLines, currentSectionPath)
      currentLines = []
    }

    currentLines.push(line)
    currentMode = nextMode
  }

  if (currentLines.length > 0) {
    flushBlock(blocks, currentLines, currentSectionPath)
  }

  return blocks
}

function splitTextWithSeparator(text: string, separator: string): string[] {
  if (!separator) {
    return Array.from(text)
  }
  return text.split(separator).filter((s) => s.length > 0)
}

function mergeSplits(splits: string[], separator: string, maxSize: number, overlap: number): string[] {
  const docs: string[] = []
  let currentDoc: string[] = []
  let total = 0
  const separatorLen = separator.length

  for (const piece of splits) {
    const pieceLen = piece.length
    if (total + pieceLen + (currentDoc.length > 0 ? separatorLen : 0) > maxSize) {
      if (currentDoc.length > 0) {
        const doc = currentDoc.join(separator).trim()
        if (doc) {
          docs.push(doc)
        }
        if (overlap > 0) {
          const overlapContent: string[] = []
          let overlapSize = 0
          for (let i = currentDoc.length - 1; i >= 0; i--) {
            const p = currentDoc[i]!
            if (overlapSize + p.length > overlap) {
              break
            }
            overlapContent.unshift(p)
            overlapSize += p.length + (overlapContent.length > 1 ? separatorLen : 0)
          }
          currentDoc = overlapContent
          total = overlapSize
        } else {
          currentDoc = []
          total = 0
        }
      }
    }
    currentDoc.push(piece)
    total += pieceLen + (currentDoc.length > 1 ? separatorLen : 0)
  }

  if (currentDoc.length > 0) {
    const doc = currentDoc.join(separator).trim()
    if (doc) {
      docs.push(doc)
    }
  }

  return docs
}

export function recursiveSplitText(
  text: string,
  options: { maxSize: number; overlap?: number; separators?: string[] }
): string[] {
  const { maxSize, overlap = 0, separators = ['\n\n', '\n', ' ', ''] } = options
  if (!text) return []
  if (text.length <= maxSize) return [text.trim()].filter(Boolean)

  function recurse(currentText: string, seps: string[]): string[] {
    const finalChunks: string[] = []
    let separator = seps[seps.length - 1] ?? ''
    let newSeparators: string[] = []

    for (let i = 0; i < seps.length; i++) {
      const s = seps[i]!
      if (s === '') {
        separator = s
        break
      }
      if (currentText.includes(s)) {
        separator = s
        newSeparators = seps.slice(i + 1)
        break
      }
    }

    const splits = splitTextWithSeparator(currentText, separator)
    const goodSplits: string[] = []

    for (const s of splits) {
      if (s.length <= maxSize) {
        goodSplits.push(s)
      } else {
        if (goodSplits.length > 0) {
          finalChunks.push(...mergeSplits(goodSplits, separator, maxSize, overlap))
          goodSplits.length = 0
        }
        if (newSeparators.length === 0) {
          finalChunks.push(s)
        } else {
          finalChunks.push(...recurse(s, newSeparators))
        }
      }
    }

    if (goodSplits.length > 0) {
      finalChunks.push(...mergeSplits(goodSplits, separator, maxSize, overlap))
    }

    return finalChunks
  }

  return recurse(text, separators)
}

async function splitOversizedSegment(segment: StructuralSegment): Promise<StructuralSegment[]> {
  if (segment.text.length <= PARENT_HARD_CAP_CHARS) {
    return [segment]
  }

  const parts = recursiveSplitText(segment.text, {
    maxSize: PARENT_HARD_CAP_CHARS,
    overlap: 0,
  })

  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text) => ({ text, sectionPath: segment.sectionPath }))
}

export async function buildStructuredSegments(content: string): Promise<StructuralSegment[]> {
  const rawSegments = splitIntoStructuralSegments(content)
  const expandedSegments: StructuralSegment[] = []
  for (const segment of rawSegments) {
    const parts = await splitOversizedSegment(segment)
    expandedSegments.push(...parts)
  }
  return expandedSegments
}

export async function buildStructuredParentBlocks(content: string): Promise<ParentBlock[]> {
  const expandedSegments = await buildStructuredSegments(content)
  const parents: ParentBlock[] = []
  let currentTextParts: string[] = []
  let currentSectionPath: string | undefined
  let currentChars = 0

  const flushParent = () => {
    const text = currentTextParts.join('\n\n').trim()
    if (!text) {
      return
    }
    parents.push({
      parentOrder: parents.length,
      sectionPath: currentSectionPath,
      text,
      tokenEstimate: estimateTokenCount(text),
      charCount: text.length,
    })
    currentTextParts = []
    currentSectionPath = undefined
    currentChars = 0
  }

  for (const segment of expandedSegments) {
    const segmentChars = segment.text.length
    const shouldFlush = currentTextParts.length > 0 && currentChars + segmentChars > PARENT_HARD_CAP_CHARS
    if (shouldFlush) {
      flushParent()
    }

    if (currentTextParts.length === 0) {
      currentSectionPath = segment.sectionPath
    }

    currentTextParts.push(segment.text)
    currentChars += segmentChars

    if (currentChars >= PARENT_TARGET_CHARS) {
      flushParent()
    }
  }

  flushParent()
  return parents
}

export async function buildPlainParentBlocks(content: string): Promise<ParentBlock[]> {
  const parts = recursiveSplitText(content, {
    maxSize: PARENT_TARGET_CHARS,
    overlap: PLAIN_PARENT_OVERLAP_CHARS,
  })

  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text, index) => ({
      parentOrder: index,
      sectionPath: undefined,
      text,
      tokenEstimate: estimateTokenCount(text),
      charCount: text.length,
    }))
}

export async function buildChildChunks(parents: ParentBlock[]): Promise<ChildChunk[]> {
  const children: ChildChunk[] = []

  for (const parent of parents) {
    const chunks = recursiveSplitText(parent.text, {
      maxSize: CHILD_SIZE_CHARS,
      overlap: CHILD_OVERLAP_CHARS,
    })

    for (const chunk of chunks) {
      const text = chunk.trim()
      if (!text) {
        continue
      }
      children.push({
        parentOrder: parent.parentOrder,
        chunkOrder: children.length,
        sectionPath: parent.sectionPath,
        rawText: text,
        tokenEstimate: estimateTokenCount(text),
      })
    }
  }

  return children
}

export async function buildChunkingResult(parents: ParentBlock[]): Promise<AttachmentChunkingResult> {
  const children = await buildChildChunks(parents)
  return { parents, children }
}

export async function chunkStructuredDocument(content: string): Promise<AttachmentChunkingResult> {
  const parents = await buildStructuredParentBlocks(content)
  return buildChunkingResult(parents)
}

export async function chunkPlainDocument(content: string): Promise<AttachmentChunkingResult> {
  const parents = await buildPlainParentBlocks(content)
  return buildChunkingResult(parents)
}

export function isStoryKbFormat(content: string): boolean {
  if (!content || typeof content !== 'string') return false
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('{')) return false
  return (
    trimmed.includes('"GUR-KB-SINGLE-2.0-COMPACT"') ||
    trimmed.includes('"mobile_card_catalog"') ||
    trimmed.includes('"mobile_router"')
  )
}

function parseChapterNumberFromId(rawId: unknown): number | undefined {
  if (typeof rawId === 'number' && Number.isFinite(rawId) && rawId > 0 && rawId <= 2500) {
    return Math.floor(rawId)
  }
  if (typeof rawId !== 'string') return undefined
  const m = rawId.match(/(?:^|[:_])(?:ch0*|CH_0*|第\s*)(\d{1,4})(?!\d)/i)
  if (!m) return undefined
  const num = parseInt(m[1], 10)
  return Number.isFinite(num) && num > 0 && num <= 2500 ? num : undefined
}

function isSubstantiveStoryCard(name: string, cardText: string, explicitSubstantive?: boolean): boolean {
  if (explicitSubstantive === false) return false
  if (!cardText) return false
  if (name.startsWith('****') || cardText.startsWith('****')) return false
  if (
    cardText.includes('同源事实') ||
    cardText.includes('未在本 chunk 说明') ||
    cardText.includes('本chunk未写') ||
    cardText.includes('record_type:mention') ||
    cardText.includes('record_id:mention:') ||
    cardText.includes('candidate_entity:') ||
    cardText.includes('record_type:info_reveal_clue')
  ) {
    return false
  }
  const normalizedName = name.trim()
  const stripped = cardText
    .replace(/^[^：:]+[：:]\s*/, '')
    .replace(/[。.;；!！?？\s]+$/g, '')
    .trim()
  if (!stripped || stripped === normalizedName) return false
  return true
}

export function chunkStoryKbDocument(content: string): AttachmentChunkingResult {
  const data = JSON.parse(content)
  const catalog = data.mobile_card_catalog as Array<unknown[]> | undefined
  const catalogMap = new Map<string, { kind: string; priorityRank: number; substantive: boolean; ordinal?: number }>()
  const ordinalToCardId = new Map<number, string>()

  if (Array.isArray(catalog)) {
    for (let idx = 0; idx < catalog.length; idx++) {
      const entry = catalog[idx]
      if (!Array.isArray(entry) || entry.length < 3) continue
      // Support both GUR-MOBILE-CARD-2 5-tuple: [ordinal, card_id, kind, priority_rank, substantive]
      // and legacy GUR-MOBILE-CARD-1 3-tuple: [card_id, kind, priority_rank]
      if (typeof entry[0] === 'number' && entry.length >= 4) {
        const ordinal = Number(entry[0])
        const cardId = String(entry[1])
        const kind = String(entry[2])
        const rawRank = Number(entry[3])
        const priorityRank = Number.isFinite(rawRank) ? rawRank : 2
        const substantive = entry.length >= 5 ? Number(entry[4]) !== 0 : true
        catalogMap.set(cardId, { kind, priorityRank, substantive, ordinal })
        ordinalToCardId.set(ordinal, cardId)
      } else {
        const cardId = String(entry[0])
        const kind = String(entry[1])
        const rawRank = Number(entry[2])
        const priorityRank = Number.isFinite(rawRank) ? rawRank : 2
        const substantive = entry.length >= 4 ? Number(entry[3]) !== 0 : true
        catalogMap.set(cardId, { kind, priorityRank, substantive, ordinal: idx })
        ordinalToCardId.set(idx, cardId)
      }
    }
  }

  // Build chapter ordinal -> actual 1-based chapter number map
  // In GUR mobile KB, card.ch stores chapter_catalog ordinals (e.g., ordinal 1038 -> "ch0001" -> chapter 1)
  const chapterOrdinalToNumber = new Map<number, number>()
  if (Array.isArray(data.chapter_catalog)) {
    for (const entry of data.chapter_catalog) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const ordinal = Number(entry[0])
        const chrono = typeof entry[2] === 'number' && entry[2] > 0 ? entry[2] : parseChapterNumberFromId(entry[1])
        if (Number.isFinite(ordinal) && chrono !== undefined) {
          chapterOrdinalToNumber.set(ordinal, chrono)
        }
      }
    }
  }
  if (Array.isArray(data.anchors)) {
    for (const anchor of data.anchors) {
      if (!anchor || typeof anchor !== 'object') continue
      const aid = String(anchor._id || '')
      if (aid.startsWith('anchor:chapter:')) {
        const ordinal = parseInt(aid.slice('anchor:chapter:'.length), 10)
        const chNum = parseChapterNumberFromId(anchor.name)
        if (Number.isFinite(ordinal) && chNum !== undefined && !chapterOrdinalToNumber.has(ordinal)) {
          chapterOrdinalToNumber.set(ordinal, chNum)
        }
      }
    }
  }

  // Build reverse alias map from mobile_router.aliases (supports both alias -> ordinal[] and name -> alias_string[])
  const routerAliasesByCardId = new Map<string, string[]>()
  const routerAliasesByName = new Map<string, string[]>()
  const routerAliases = data.mobile_router?.aliases
  if (routerAliases && typeof routerAliases === 'object') {
    for (const [aliasOrName, postings] of Object.entries(routerAliases)) {
      if (!aliasOrName || !Array.isArray(postings)) continue
      for (const item of postings) {
        if (typeof item === 'number' || (typeof item === 'string' && /^\d+$/.test(item))) {
          const cid = ordinalToCardId.get(Number(item))
          if (cid) {
            let list = routerAliasesByCardId.get(cid)
            if (!list) {
              list = []
              routerAliasesByCardId.set(cid, list)
            }
            if (!list.includes(aliasOrName)) list.push(aliasOrName)
          }
        } else if (typeof item === 'string' && item.trim()) {
          let list = routerAliasesByName.get(aliasOrName)
          if (!list) {
            list = []
            routerAliasesByName.set(aliasOrName, list)
          }
          if (!list.includes(item.trim())) list.push(item.trim())
        }
      }
    }
  }

  // Optional evidence catalog lookup for verbatim novel quotes
  const evidenceCatalog = Array.isArray(data.evidence_catalog) ? data.evidence_catalog : undefined

  const sections = [
    'calibrated_cards',
    'entities',
    'character_states',
    'items_and_gu',
    'events',
    'rules',
    'factions',
    'locations',
    'relationships',
    'terms',
    'claims',
    'foreshadows',
    'conflicts',
    'timeline',
  ]

  const parents: ParentBlock[] = []
  const children: ChildChunk[] = []

  let currentParentCards: string[] = []
  let currentParentOrder = 0
  let currentSection = ''

  const flushParent = () => {
    if (currentParentCards.length === 0) return
    const text = currentParentCards.join('\n\n')
    parents.push({
      parentOrder: currentParentOrder,
      sectionPath: currentSection,
      text,
      tokenEstimate: estimateTokenCount(text),
      charCount: text.length,
    })
    currentParentOrder++
    currentParentCards = []
  }

  const resolveCardChapterOrder = (card: Record<string, unknown>): number | undefined => {
    const resolvedChapters: number[] = []
    if (Array.isArray(card.ch)) {
      for (const rawCh of card.ch) {
        if (typeof rawCh !== 'number' || !Number.isFinite(rawCh)) continue
        if (chapterOrdinalToNumber.size > 0) {
          const mapped = chapterOrdinalToNumber.get(rawCh)
          if (mapped !== undefined) resolvedChapters.push(mapped)
        } else if (rawCh > 0) {
          resolvedChapters.push(rawCh)
        }
      }
    }
    if (resolvedChapters.length === 0 && typeof card.chapter_order === 'number' && card.chapter_order > 0) {
      resolvedChapters.push(card.chapter_order)
    }
    if (resolvedChapters.length === 0 && Array.isArray(card.src_ids)) {
      for (const sid of card.src_ids) {
        const parsed = parseChapterNumberFromId(sid)
        if (parsed !== undefined) {
          resolvedChapters.push(parsed)
        }
      }
    }
    return resolvedChapters.length > 0 ? Math.min(...resolvedChapters) : undefined
  }

  for (const sectionName of sections) {
    const list = data[sectionName]
    if (!Array.isArray(list) || list.length === 0) continue

    currentSection = sectionName
    for (const card of list) {
      if (!card || typeof card !== 'object') continue
      const id = String(card._id || '')
      const name = String(card.name || '')
      const cardText = String(card.card || card.name || '').trim()
      if (!cardText) continue

      const catInfo = catalogMap.get(id)
      const substantive = isSubstantiveStoryCard(name, cardText, catInfo?.substantive)
      const kind = catInfo?.kind || sectionName
      let priorityRank =
        catInfo?.priorityRank ??
        (sectionName === 'calibrated_cards'
          ? 5
          : sectionName === 'entities' || sectionName === 'events' || sectionName === 'items_and_gu'
            ? 3
            : 2)
      if (!substantive) {
        priorityRank = 0
      }

      const rawKeys = Array.isArray(card.keys) ? card.keys.map(String) : []
      const cardAliases = Array.isArray(card.aliases) ? card.aliases.map(String) : []
      const routerAliasesForCard = routerAliasesByCardId.get(id) ?? []
      const routerAliasesForName = routerAliasesByName.get(name) ?? []
      const mergedAliases = [...new Set([...cardAliases, ...routerAliasesForCard, ...routerAliasesForName])].filter(Boolean)
      const keys = [...new Set([...rawKeys, ...mergedAliases])].filter(Boolean)
      const entities = [...new Set([name, ...mergedAliases, ...rawKeys].filter(Boolean))]
      const chapterOrder = resolveCardChapterOrder(card as Record<string, unknown>)
      const storyTime = typeof card.story_time === 'string' ? card.story_time : undefined

      let quoteSuffix = ''
      if (evidenceCatalog && Array.isArray(card.ev) && substantive) {
        const quotes: string[] = []
        for (const evOrd of card.ev.slice(0, 2)) {
          const evEntry = evidenceCatalog[Number(evOrd)]
          if (Array.isArray(evEntry)) {
            const quoteStr = typeof evEntry[4] === 'string' ? evEntry[4] : typeof evEntry[3] === 'string' ? evEntry[3] : ''
            if (quoteStr.trim()) {
              quotes.push(quoteStr.trim())
            }
          }
        }
        if (quotes.length > 0) {
          quoteSuffix = `\n【原文印证】${quotes.join(' ｜ ')}`
        }
      }

      const aliasLabel = mergedAliases.length > 0 ? ` (别名: ${mergedAliases.join('、')})` : ''
      const chapterLabel = chapterOrder !== undefined ? ` [第${chapterOrder}章]` : ''
      const fullChildText = `${cardText}${quoteSuffix}`
      const cardRepresentation = `[${kind}: ${id}] ${name}${aliasLabel}${chapterLabel}\n${fullChildText}`
      if (currentParentCards.join('\n\n').length + cardRepresentation.length > PARENT_TARGET_CHARS) {
        flushParent()
      }
      currentParentCards.push(cardRepresentation)

      children.push({
        parentOrder: currentParentOrder,
        chunkOrder: children.length,
        sectionPath: `${sectionName}:${name || id}`,
        rawText: fullChildText,
        tokenEstimate: estimateTokenCount(cardText),
        entities,
        keywords: keys,
        chapterOrder,
        storyTime,
        priorityRank,
        kind,
        metadata: {
          id,
          substantive,
          aliases: mergedAliases.length > 0 ? mergedAliases : undefined,
          refs: card.refs,
          ev: card.ev,
          src_ids: card.src_ids,
          risk_categories: card.risk_categories,
        },
      })
    }
    flushParent()
  }

  // Include runtime_core if present (world/cultivation rules)
  if (data.runtime_core && typeof data.runtime_core === 'object') {
    currentSection = 'runtime_core'
    for (const [coreKey, coreVal] of Object.entries(data.runtime_core)) {
      if (Array.isArray(coreVal)) {
        for (const item of coreVal) {
          if (item && typeof item === 'object' && 'statement' in item) {
            const ruleObj = item as Record<string, unknown>
            const ruleId = String(ruleObj.rule_id || coreKey)
            const category = String(ruleObj.category || coreKey)
            const statement = String(ruleObj.statement || '').trim()
            if (!statement) continue
            const ruleText = `[${coreKey}: ${ruleId}] (${category}) ${statement}`
            if (currentParentCards.join('\n\n').length + ruleText.length > PARENT_TARGET_CHARS) {
              flushParent()
            }
            currentParentCards.push(ruleText)
            children.push({
              parentOrder: currentParentOrder,
              chunkOrder: children.length,
              sectionPath: `runtime_core:${ruleId}`,
              rawText: ruleText,
              tokenEstimate: estimateTokenCount(ruleText),
              entities: ['世界规则', '修炼规则', category],
              keywords: ['世界规则', '修炼规则', category, ruleId],
              priorityRank: 4,
              kind: 'rule',
            })
          }
        }
        flushParent()
      } else if (typeof coreVal === 'string' && coreVal.trim()) {
        const ruleText = `### [rule] ${coreKey}\n${coreVal.trim()}`
        parents.push({
          parentOrder: currentParentOrder,
          sectionPath: 'runtime_core',
          text: ruleText,
          tokenEstimate: estimateTokenCount(ruleText),
          charCount: ruleText.length,
        })
        children.push({
          parentOrder: currentParentOrder,
          chunkOrder: children.length,
          sectionPath: 'runtime_core',
          rawText: ruleText,
          tokenEstimate: estimateTokenCount(ruleText),
          entities: ['世界规则', '修炼规则'],
          keywords: ['世界规则', '修炼规则', '剧透策略'],
          priorityRank: 4,
          kind: 'rule',
        })
        currentParentOrder++
      }
    }
    flushParent()
  }

  return { parents, children }
}

export function selectAttachmentChunkingPipeline(filename?: string): AttachmentChunkingPipeline {
  return isStructuredChunkingType(filename) ? 'structured' : 'plain'
}

export async function buildAttachmentChunks(content: string, filename?: string): Promise<AttachmentChunkingResult> {
  if (isStoryKbFormat(content)) {
    return chunkStoryKbDocument(content)
  }
  const pipeline = selectAttachmentChunkingPipeline(filename)
  return pipeline === 'structured' ? chunkStructuredDocument(content) : chunkPlainDocument(content)
}

export function buildEmbeddedText(params: {
  filename: string
  sectionPath?: string
  pageRange?: string
  text: string
}): string {
  const prefixParts = [params.filename]
  if (params.sectionPath) {
    prefixParts.push(params.sectionPath)
  }
  if (params.pageRange) {
    prefixParts.push(params.pageRange)
  }
  return `[${prefixParts.join(' > ')}]\n${params.text}`
}
