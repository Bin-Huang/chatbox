import type { EmbeddingModel } from 'ai'
import {
  dedupeByParent,
  normalizeQueryPlan,
} from '@shared/session-attachment-rag/query-plan'
import { MobileRagDatabase } from './db'
import {
  embedManyWithRetry,
  getMobileEmbeddingModelString,
  resolveMobileEmbeddingProvider,
} from './embedding'
import { type IndexerDependencies, MobileRagIndexer } from './indexer'
import type {
  CreateSessionAttachmentParams,
  SessionAttachment,
  SessionAttachmentParent,
  SessionAttachmentQueryPlan,
  SessionAttachmentRagDebugSnapshot,
  SessionAttachmentRagMaintenanceResult,
  SessionAttachmentRagMaintenanceScope,
  SessionAttachmentRecord,
  SessionAttachmentSearchResult,
} from './types'
import { SQLiteBlobVectorStore } from './vector-store'

export interface MobileRagQueryTrace {
  timestamp: number
  query: string
  extractedKeywords: string[]
  currentChapter?: number
  activeEntities: string[]
  vectorHitCount: number
  keywordHitCount: number
  candidateCount: number
  durationMs: number
  topResults: Array<{
    parentId: number
    sectionPath?: string
    score: number
  }>
}

export interface MobileEngineDependencies {
  database?: MobileRagDatabase
  vectorStore?: SQLiteBlobVectorStore
  indexer?: MobileRagIndexer
  indexerDeps?: IndexerDependencies
  resolveEmbeddingProvider?: (modelString?: string) => Promise<{ provider: EmbeddingModel; modelString: string }>
  embedValues?: (model: EmbeddingModel, values: string[]) => Promise<number[][]>
}

const QUERY_STOPWORDS = new Set([
  '什么', '怎么', '如何', '为什么', '为何', '哪些', '哪个', '哪里', '何处', '何时',
  '现在', '目前', '当前', '多少', '是否', '能否', '可以', '能够', '一个', '一些',
  '这个', '那个', '这些', '那些', '他们', '她们', '它们', '我们', '你们', '自己',
  '身上', '手里', '之中', '之后', '之前', '时候', '事情', '情况', '表现', '来历',
  '威力', '作用', '效果', '关系', '有什么', '是什么', '怎么样', '厉害', '奇异',
  '或者', '以及', '并且', '但是', '因为', '所以', '如果', '虽然', '进行', '使用',
  '拥有', '获得', '关于', '请问', '告诉', '介绍一下', '介绍', '分别', '等级', '区别',
  '划分', '特点', '隐患', '结果', '最后', '关头', '终于', '出现',
])

const GENERIC_STORY_TERMS = new Set([
  '方源', '古月方源', '蛊师', '蛊虫', '仙蛊', '杀招', '仙道杀招', '仙道',
  '仙尊', '魔尊', '尊者', '名号', '底蕴', '流派', '境界', '功法', '能力',
])

export function extractQueryKeywords(query: string): string[] {
  const highPriorityTerms: string[] = []
  const standardTerms: string[] = []
  const ngramTerms: string[] = []
  const genericTerms: string[] = []

  const pushTerm = (bucket: string[], raw: string) => {
    const clean = raw
      .replace(/^(?:什么|怎么|如何|哪些|哪个|哪里|为何)+/, '')
      .replace(/(?:什么|怎么|如何|哪些|哪个|哪里|为何)+$/, '')
      .trim()
    if (!clean || clean.length < 2 || QUERY_STOPWORDS.has(clean)) return
    if (GENERIC_STORY_TERMS.has(clean)) {
      genericTerms.push(clean)
    } else {
      bucket.push(clean)
    }
  }

  const quoted = query.match(/["“「『【](.+?)["”」』】]/g)
  if (quoted) {
    for (const q of quoted) {
      pushTerm(highPriorityTerms, q.slice(1, -1))
    }
  }

  // 1. Split query by punctuation and Chinese grammatical particles into clean phrase chunks
  const phraseChunks = query
    .split(/[，。？！、；：“”‘’「」『』【】（）()《》\s的在用是了回到去有和与或及把将被让给从向对时后前里中上下吗呢吧啊呀么之其此彼他她它我你]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)

  for (const chunk of phraseChunks) {
    // Direct short noun phrase (2-5 chars) after particle splitting
    if (/^[\u4e00-\u9fa5]{2,5}$/.test(chunk) && !QUERY_STOPWORDS.has(chunk)) {
      pushTerm(highPriorityTerms, chunk)
    }

    // Domain suffix compounds within clean phrase chunk
    const suffixMatches = chunk.match(
      /[\u4e00-\u9fa5]{1,4}(?:仙尊|魔尊|尊者|仙蛊|蛊虫|蛊师|本命蛊|蛊|福地|洞天|山寨|山|城|寨|河|川|原|谷|海|楼|阁|殿|体|真传|传承|杀招|大典|狼潮|王庭|天庭|长生天)/g
    )
    if (suffixMatches) {
      for (const m of suffixMatches) {
        pushTerm(highPriorityTerms, m)
      }
    }

    // Domain prefix compounds within clean phrase chunk
    const prefixMatches = chunk.match(
      /(?:古月|白家|熊家|太白|黑楼|凤九|巨阳|星宿|红莲|无极|元莲|盗天|狂蛮|幽魂|乐土|大爱|大梦|青茅|三王|义天|狐仙|琅琊|八十八角|逆流|至尊|春秋|月光|酒虫|白豕|血颅|天元宝|定仙|宿命|智慧|北冥|花酒|商量|白骨|荡魂|石莲|雷冠)[\u4e00-\u9fa5]{1,3}/g
    )
    if (prefixMatches) {
      for (const m of prefixMatches) {
        pushTerm(highPriorityTerms, m)
      }
    }
  }

  // 2. English / Latin alphanumeric tokens
  const latinWords = query.match(/[a-zA-Z0-9_-]{2,}/g)
  if (latinWords) {
    highPriorityTerms.push(...latinWords)
  }

  // 3. CJK word segmentation using Intl.Segmenter on each clean phrase chunk
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter('zh-CN', { granularity: 'word' })
      for (const chunk of phraseChunks) {
        for (const { segment, isWordLike } of segmenter.segment(chunk)) {
          const clean = segment.trim()
          if (isWordLike && clean.length >= 2 && clean.length <= 8 && !QUERY_STOPWORDS.has(clean)) {
            if (clean.length >= 3) {
              pushTerm(highPriorityTerms, clean)
            } else {
              pushTerm(standardTerms, clean)
            }
          }
        }
      }
    } catch {
      // Fallback below
    }
  }

  // 4. CJK 2-3 char n-grams inside clean phrase chunks for recall resilience
  for (const seg of phraseChunks) {
    if (!/^[\u4e00-\u9fa5]+$/.test(seg)) continue
    for (let i = 0; i <= seg.length - 3; i++) {
      pushTerm(ngramTerms, seg.slice(i, i + 3))
    }
    for (let i = 0; i <= seg.length - 2; i++) {
      pushTerm(ngramTerms, seg.slice(i, i + 2))
    }
  }

  return [...new Set([...highPriorityTerms, ...standardTerms, ...ngramTerms, ...genericTerms])].filter(Boolean)
}

export function detectChapterFromQuery(query: string): number | undefined {
  const match = query.match(/第\s*(\d+)\s*章/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return undefined
}

export class MobileLocalRagEngine {
  public readonly database: MobileRagDatabase
  public readonly vectorStore: SQLiteBlobVectorStore
  public readonly indexer: MobileRagIndexer
  private queue: Promise<void> = Promise.resolve()
  private resolveEmbedding: (modelString?: string) => Promise<{ provider: EmbeddingModel; modelString: string }>
  private embedValues: (model: EmbeddingModel, values: string[]) => Promise<number[][]>
  private queryTraces: MobileRagQueryTrace[] = []

  constructor(dependencies: MobileEngineDependencies = {}) {
    this.database = dependencies.database ?? new MobileRagDatabase()
    this.vectorStore = dependencies.vectorStore ?? new SQLiteBlobVectorStore(this.database)
    this.indexer =
      dependencies.indexer ??
      new MobileRagIndexer(this.database, this.vectorStore, dependencies.indexerDeps)
    this.resolveEmbedding = dependencies.resolveEmbeddingProvider ?? resolveMobileEmbeddingProvider
    this.embedValues = dependencies.embedValues ?? embedManyWithRetry
  }

  public async initialize(): Promise<void> {
    await this.database.initialize()
  }

  public enqueueIndexing(attachmentId: number): void {
    this.queue = this.queue
      .then(async () => {
        try {
          await this.indexer.indexAttachment(attachmentId)
        } catch (error) {
          console.warn(`[MobileLocalRagEngine] Failed to index attachment ${attachmentId}:`, error)
        }
      })
      .catch(() => undefined)
  }

  public async createAttachment(params: CreateSessionAttachmentParams): Promise<SessionAttachment> {
    await this.initialize()
    const id = await this.database.createAttachment(params)
    this.enqueueIndexing(id)

    const record = await this.database.getAttachment(id)
    return this.toSessionAttachment(record ?? {
      id,
      sessionId: params.sessionId,
      messageId: params.messageId,
      attachmentStorageKey: params.attachmentStorageKey,
      filename: params.filename,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      tokenEstimate: params.tokenEstimate,
      status: 'pending',
      indexingStage: 'queued',
      createdAt: String(Date.now()),
    })
  }

  public async getAttachments(ids: number[]): Promise<SessionAttachment[]> {
    await this.initialize()
    const records = await this.database.getAttachments(ids)
    const currentModel = getMobileEmbeddingModelString()

    return Promise.all(
      records.map(async (record) => {
        const resumable =
          record.status === 'failed' && currentModel
            ? await this.indexer.isCheckpointResumable(record, currentModel)
            : false
        return this.toSessionAttachment(record, resumable)
      })
    )
  }

  public async retryAttachment(attachmentId: number): Promise<void> {
    await this.initialize()
    await this.database.markAttachmentStatus(attachmentId, 'pending')
    this.enqueueIndexing(attachmentId)
  }

  public async rebindAttachment(params: {
    attachmentId: number
    sessionId: string
    messageId: string
  }): Promise<void> {
    await this.initialize()
    await this.database.rebindAttachment(params.attachmentId, params.sessionId, params.messageId)
  }

  public async deleteAttachment(attachmentId: number): Promise<void> {
    await this.initialize()
    this.indexer.cancel(attachmentId)
    await this.database.deleteAttachment(attachmentId)
  }

  public async deleteMessageAttachments(messageId: string): Promise<number[]> {
    await this.initialize()
    const rows = await this.database.getDatabase().query('SELECT id FROM session_attachment WHERE message_id = ?', [messageId])
    const ids = (rows.values ?? []).map((r) => Number(r.id))
    for (const id of ids) {
      this.indexer.cancel(id)
    }
    return this.database.deleteMessageAttachments(messageId)
  }

  public async deleteSessionAttachments(sessionId: string): Promise<number[]> {
    await this.initialize()
    const rows = await this.database.getDatabase().query('SELECT id FROM session_attachment WHERE session_id = ?', [sessionId])
    const ids = (rows.values ?? []).map((r) => Number(r.id))
    for (const id of ids) {
      this.indexer.cancel(id)
    }
    return this.database.deleteSessionAttachments(sessionId)
  }

  public async cleanupOrphans(params: {
    sessionIds: string[]
    messageIds: string[]
  }): Promise<number[]> {
    await this.initialize()
    return this.database.cleanupOrphans(params.sessionIds, params.messageIds)
  }

  public getQueryTraces(): MobileRagQueryTrace[] {
    return [...this.queryTraces]
  }

  public clearQueryTraces(): void {
    this.queryTraces = []
  }

  public async getDebugSnapshot(): Promise<SessionAttachmentRagDebugSnapshot> {
    await this.initialize()
    const snapshot = await this.database.getDebugSnapshot()
    return {
      ...snapshot,
      ...(this.queryTraces.length > 0 ? { recentQueries: this.getQueryTraces() } : {}),
    } as SessionAttachmentRagDebugSnapshot
  }

  public async clearAll(): Promise<number> {
    await this.initialize()
    return this.database.clearAll()
  }

  public async runMaintenance(
    params: SessionAttachmentRagMaintenanceScope
  ): Promise<SessionAttachmentRagMaintenanceResult> {
    await this.initialize()
    const interruptedFailedCount = await this.database.cleanupInterruptedIndexingAttachments()
    const orphanDeletedIds = await this.database.cleanupOrphans(
      params.sessionIds ?? [],
      params.messageIds ?? [],
      params.attachmentReferences ?? []
    )
    return {
      interruptedFailedCount,
      canceledPurgedCount: 0,
      orphanDeletedIds,
    }
  }

  public async query(params: {
    attachmentIds: number[]
    query: string
    plan: SessionAttachmentQueryPlan
  }): Promise<SessionAttachmentSearchResult[]> {
    const startMs = Date.now()
    const attachmentIds = [...new Set((params.attachmentIds ?? []).filter((id) => Number.isFinite(id)))]
    if (!params.query?.trim() || attachmentIds.length === 0) {
      return []
    }

    await this.initialize()
    const attachments = await this.database.getAttachments(attachmentIds)
    const readyAttachments = attachments.filter((a) => a.status === 'ready')
    if (readyAttachments.length === 0) {
      return []
    }

    const readyIds = readyAttachments.map((a) => a.id)
    const plan = normalizeQueryPlan(params.plan)
    const rawQuery = params.query.trim()
    const storyFilter = plan.storyFilter

    const currentChapter = storyFilter?.currentChapter ?? detectChapterFromQuery(rawQuery)
    const currentTime = storyFilter?.currentTime
    const activeEntities = new Set((storyFilter?.activeEntities ?? []).map((e) => e.toLowerCase()))
    const extractedKeywords = extractQueryKeywords(rawQuery)

    // 1. Multi-source recall (30-50 candidates) with fault-tolerant Vector Search
    const recallLimit = Math.max(plan.recallTopK, 35)
    let vectorHits: Array<{ chunkId: number; attachmentId: number; score: number }> = []
    try {
      const { provider } = await this.resolveEmbedding()
      const embeddings = await this.embedValues(provider, [rawQuery])
      const queryVector = embeddings[0]
      if (Array.isArray(queryVector) && queryVector.length > 0) {
        vectorHits = await this.vectorStore.query({
          attachmentIds: readyIds,
          queryVector,
          topK: recallLimit,
        })
      }
    } catch {
      // Fault-tolerant fallback: when no embedding model is configured or offline,
      // rely on hybrid structured keyword + entity + metadata retrieval.
      vectorHits = []
    }

    const keywordHits = await this.database.searchKeywordChunks(readyIds, {
      keywords: extractedKeywords,
      entities: storyFilter?.activeEntities ?? [],
      maxChapter: currentChapter,
      limit: recallLimit,
    })

    const candidateChunkIds = new Set<number>()
    for (const h of vectorHits) candidateChunkIds.add(h.chunkId)
    for (const h of keywordHits) candidateChunkIds.add(h.id)

    if (candidateChunkIds.size === 0) {
      this.recordQueryTrace({
        timestamp: startMs,
        query: rawQuery,
        extractedKeywords,
        currentChapter,
        activeEntities: storyFilter?.activeEntities ?? [],
        vectorHitCount: vectorHits.length,
        keywordHitCount: keywordHits.length,
        candidateCount: 0,
        durationMs: Date.now() - startMs,
        topResults: [],
      })
      return []
    }

    // 2. Fetch candidate chunk details
    const chunks = await this.database.listChunksWithDetails(Array.from(candidateChunkIds))
    const vectorHitMap = new Map(vectorHits.map((h) => [h.chunkId, h.score]))
    const keywordHitMap = new Map(keywordHits.map((h) => [h.id, h.matchScore]))

    const lowerQuery = rawQuery.toLowerCase()

    const hasSpecificTarget =
      extractedKeywords.some((k) => !GENERIC_STORY_TERMS.has(k)) ||
      Array.from(activeEntities).some((e) => !GENERIC_STORY_TERMS.has(e))

    // 3. Hybrid Scoring & Timeline/State Filtering
    const scoredCandidates = chunks
      .map((chunk) => {
        const rawVectorScore = vectorHitMap.get(chunk.id) ?? 0
        const sVec = Math.max(0, Math.min(1, rawVectorScore))
        const sKw = keywordHitMap.get(chunk.id) ?? 0

        let sEntity = 0
        let specificMatchedCount = 0
        let primaryEntityMatched = false
        const chunkEntities = (chunk.entities ?? []).map((e) => e.toLowerCase()).filter(Boolean)
        if (chunkEntities.length > 0) {
          for (let idx = 0; idx < chunkEntities.length; idx++) {
            const ent = chunkEntities[idx]
            const inQuery = ent.length >= 2 && lowerQuery.includes(ent)
            const inActive = activeEntities.has(ent)
            if (inQuery || inActive) {
              const isGeneric = hasSpecificTarget && GENERIC_STORY_TERMS.has(ent)
              if (isGeneric) {
                sEntity = Math.max(sEntity, 0.35)
              } else {
                sEntity = 1.0
                specificMatchedCount++
                if (idx === 0) {
                  primaryEntityMatched = true
                }
              }
            }
          }
        }

        const priorityRank = chunk.priorityRank ?? 2
        let sPriority = 0
        if (priorityRank >= 4) sPriority = 0.15
        else if (priorityRank === 3) sPriority = 0.08
        else if (priorityRank === 1) sPriority = -0.05
        else if (priorityRank === 0) sPriority = -0.35

        if (primaryEntityMatched) {
          sPriority += 0.14
        }
        if (specificMatchedCount >= 2) {
          sPriority += 0.08 * Math.min(2, specificMatchedCount - 1)
        }

        let timelineMultiplier = 1.0
        if (currentChapter !== undefined && Number.isFinite(currentChapter)) {
          if (chunk.chapterOrder !== undefined) {
            if (chunk.chapterOrder > currentChapter) {
              timelineMultiplier = 0.05
            } else if (chunk.chapterOrder === currentChapter) {
              sPriority += 0.10
            }
          }
        }

        if (currentTime && chunk.storyTime) {
          if (chunk.storyTime.includes(currentTime)) {
            sPriority += 0.10
          }
        }

        // Hybrid fusion:
        // Combine vector similarity and keyword overlap so fuzzy semantic
        // matches aren't penalized when keywords are absent, and dual matches reinforce.
        let baseScore = Math.max(sVec, sKw)
        if (sVec > 0 && sKw > 0) {
          baseScore += 0.15 * Math.min(sVec, sKw)
        }

        if (sEntity > 0) {
          baseScore = Math.min(1, baseScore + 0.15 * sEntity)
        }

        baseScore += sPriority
        const finalScore = Math.max(0, Math.min(1, baseScore * timelineMultiplier))

        return {
          attachmentId: chunk.attachmentId,
          parentId: chunk.parentId,
          filename: chunk.filename,
          sectionPath: chunk.sectionPath,
          chunkOrder: chunk.chunkOrder,
          text: chunk.rawText,
          score: finalScore,
        }
      })
      .filter((r) => r.score > 0.01)
      .sort((a, b) => b.score - a.score)

    // 4. Dedupe by parent ID and diversify card titles so generic protagonist cards don't monopolize Top K
    const parentDeduped = dedupeByParent(scoredCandidates)
    const finalResults: SessionAttachmentSearchResult[] = []
    const overflowResults: SessionAttachmentSearchResult[] = []
    const titleCounts = new Map<string, number>()

    for (const item of parentDeduped) {
      if (finalResults.length >= plan.finalTopK) break
      const rawSection = item.sectionPath ?? ''
      const colonIdx = rawSection.indexOf(':')
      const titleKey = (colonIdx >= 0 ? rawSection.slice(colonIdx + 1) : rawSection).trim().toLowerCase()
      const maxPerTitle = GENERIC_STORY_TERMS.has(titleKey) ? 1 : 2
      const count = titleCounts.get(titleKey) ?? 0
      if (titleKey && count >= maxPerTitle) {
        overflowResults.push(item)
        continue
      }
      if (titleKey) {
        titleCounts.set(titleKey, count + 1)
      }
      finalResults.push(item)
    }

    for (const item of overflowResults) {
      if (finalResults.length >= plan.finalTopK) break
      finalResults.push(item)
    }

    this.recordQueryTrace({
      timestamp: startMs,
      query: rawQuery,
      extractedKeywords,
      currentChapter,
      activeEntities: storyFilter?.activeEntities ?? [],
      vectorHitCount: vectorHits.length,
      keywordHitCount: keywordHits.length,
      candidateCount: candidateChunkIds.size,
      durationMs: Date.now() - startMs,
      topResults: finalResults.slice(0, 5).map((r) => ({
        parentId: r.parentId,
        sectionPath: r.sectionPath,
        score: Number(r.score.toFixed(4)),
      })),
    })

    return finalResults
  }

  private recordQueryTrace(trace: MobileRagQueryTrace): void {
    this.queryTraces.push(trace)
    if (this.queryTraces.length > 50) {
      this.queryTraces.shift()
    }
  }

  public async readParents(params: {
    parentIds: number[]
    attachmentIds: number[]
  }): Promise<SessionAttachmentParent[]> {
    const parentIds = [...new Set((params.parentIds ?? []).filter((id) => Number.isFinite(id)))]
    const allowedAttachmentIds = [
      ...new Set((params.attachmentIds ?? []).filter((id) => Number.isFinite(id))),
    ]
    if (parentIds.length === 0 || allowedAttachmentIds.length === 0) {
      return []
    }

    await this.initialize()
    const parents = await this.database.readParents(parentIds, allowedAttachmentIds)

    return parents.map((p) => ({
      id: p.id,
      attachmentId: p.attachmentId,
      filename: (p as { filename?: string }).filename ?? '',
      sectionPath: p.sectionPath,
      docType: p.docType,
      pageStart: p.pageStart,
      pageEnd: p.pageEnd,
      parentOrder: p.parentOrder,
      text: p.text,
      tokenEstimate: p.tokenEstimate,
      charCount: p.charCount,
    }))
  }

  private toSessionAttachment(
    record: SessionAttachmentRecord,
    resumable = false
  ): SessionAttachment {
    return {
      id: record.id,
      sessionId: record.sessionId,
      messageId: record.messageId,
      attachmentStorageKey: record.attachmentStorageKey,
      filename: record.filename,
      mimeType: record.mimeType,
      fileSize: record.fileSize,
      tokenEstimate: record.tokenEstimate,
      chunkCount: record.totalChunks ?? 0,
      totalChunks: record.totalChunks ?? 0,
      embeddedChunks: record.embeddedChunks ?? 0,
      embeddingModel: record.embeddingModel,
      embeddingDimension: record.embeddingDimension,
      indexingStage: record.indexingStage,
      parserType: record.parserType,
      availability: 'allowed',
      indexStatus: record.status === 'canceled' ? 'failed' : record.status,
      status: record.status === 'canceled' ? 'failed' : record.status,
      resumable,
      error: record.error,
      createdAt: record.createdAt ? Number(record.createdAt) : undefined,
      processingStartedAt: record.processingStartedAt ? Number(record.processingStartedAt) : undefined,
      completedAt: record.completedAt ? Number(record.completedAt) : undefined,
    }
  }
}
