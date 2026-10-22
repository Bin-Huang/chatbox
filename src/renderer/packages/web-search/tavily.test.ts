import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTEXTFETCH_API_HOST, TavilySearch } from './tavily'

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('TavilySearch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses api.tavily.com by default', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ results: [] }))
    await new TavilySearch('test-key').search('chatbox')
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.tavily.com/search')
  })

  it('sends search and extract requests to a custom host', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ title: 'One', url: 'https://one.test', content: 'first snippet' }] })
      )
      .mockResolvedValueOnce(jsonResponse({ results: [{ url: 'https://one.test/page', raw_content: 'page text' }] }))
    const search = new TavilySearch('cf-key', CONTEXTFETCH_API_HOST)

    const result = await search.search('chatbox')
    expect(result.items).toEqual([{ title: 'One', link: 'https://one.test', snippet: 'first snippet' }])
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.contextfetch.dev/tavily/search')

    const page = await search.parseLink('https://one.test/page')
    expect(page).toEqual({ url: 'https://one.test/page', title: 'one.test', content: 'page text' })
    expect(String(fetchSpy.mock.calls[1]?.[0])).toBe('https://api.contextfetch.dev/tavily/extract')
  })
})
