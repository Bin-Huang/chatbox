import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createNativeReadableStream } from '@/native/stream-http'
import { handleMobileRequest } from './mobile-request'

vi.mock('@/native/stream-http', () => ({
  createNativeReadableStream: vi.fn(),
}))

describe('mobile request native streaming', () => {
  beforeEach(() => {
    vi.mocked(createNativeReadableStream).mockReset()
    vi.mocked(createNativeReadableStream).mockReturnValue(new ReadableStream<Uint8Array>())
  })

  test('passes the request signal directly to the native stream', async () => {
    const abortController = new AbortController()

    await handleMobileRequest(
      'https://example.com/stream',
      'POST',
      new Headers({ Authorization: 'Bearer test' }),
      JSON.stringify({ stream: true }),
      abortController.signal
    )

    expect(createNativeReadableStream).toHaveBeenCalledWith(
      {
        url: 'https://example.com/stream',
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          authorization: 'Bearer test',
        },
        body: JSON.stringify({ stream: true }),
      },
      { signal: abortController.signal }
    )
  })

  test('passes an already-aborted signal to native stream setup', async () => {
    const abortController = new AbortController()
    abortController.abort(123_456)

    await handleMobileRequest(
      'https://example.com/stream',
      'POST',
      new Headers(),
      JSON.stringify({ stream: true }),
      abortController.signal
    )

    expect(createNativeReadableStream).toHaveBeenCalledWith(expect.any(Object), {
      signal: abortController.signal,
    })
  })

  test('passes an explicit undefined signal to native stream setup', async () => {
    await handleMobileRequest('https://example.com/stream', 'POST', new Headers(), JSON.stringify({ stream: true }))

    expect(createNativeReadableStream).toHaveBeenCalledWith(expect.any(Object), { signal: undefined })
  })

  test('retries once when the stream fails before delivering anything', async () => {
    const encoder = new TextEncoder()
    vi.mocked(createNativeReadableStream)
      .mockReturnValueOnce(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            controller.error(new TypeError('Load failed'))
          },
        })
      )
      .mockReturnValueOnce(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode('recovered'))
            controller.close()
          },
        })
      )

    const response = await handleMobileRequest(
      'https://example.com/stream',
      'POST',
      new Headers(),
      JSON.stringify({ stream: true })
    )

    await expect(response.text()).resolves.toBe('recovered')
    expect(createNativeReadableStream).toHaveBeenCalledTimes(2)
  })

  test('does not retry once bytes have reached the consumer', async () => {
    const encoder = new TextEncoder()
    let pulls = 0
    vi.mocked(createNativeReadableStream).mockReturnValue(
      new ReadableStream<Uint8Array>({
        // One chunk, then a failure. Queued chunks are dropped by
        // controller.error(), so this has to be handed over a pull at a time.
        pull(controller) {
          if (pulls++ === 0) {
            controller.enqueue(encoder.encode('partial'))
            return
          }
          controller.error(new TypeError('Load failed'))
        },
      })
    )

    const response = await handleMobileRequest(
      'https://example.com/stream',
      'POST',
      new Headers(),
      JSON.stringify({ stream: true })
    )

    // Retrying here would append a second answer to a half-written one.
    await expect(response.text()).rejects.toThrow('Load failed')
    expect(createNativeReadableStream).toHaveBeenCalledTimes(1)
  })

  test('does not retry a stream the caller aborted', async () => {
    const abortController = new AbortController()
    abortController.abort()
    vi.mocked(createNativeReadableStream).mockReturnValue(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.error(new DOMException('The operation was aborted.', 'AbortError'))
        },
      })
    )

    const response = await handleMobileRequest(
      'https://example.com/stream',
      'POST',
      new Headers(),
      JSON.stringify({ stream: true }),
      abortController.signal
    )

    await expect(response.text()).rejects.toThrow()
    expect(createNativeReadableStream).toHaveBeenCalledTimes(1)
  })
})
