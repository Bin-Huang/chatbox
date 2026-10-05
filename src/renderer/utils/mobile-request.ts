import { CapacitorHttp } from '@capacitor/core'
import { createNativeReadableStream, type StartStreamOptions } from '@/native/stream-http'
import { ApiError } from '../../shared/models/errors'

// Mobile keeps losing streams it could recover: the OS suspends the app while a
// slow model is still thinking, the socket dies, and the turn is reported as a
// network error even though nothing had been received yet (#1887).
//
// Reissuing the request is only safe while no bytes have reached the consumer —
// after that a second attempt would append a fresh answer to a partial one — so
// the retry is deliberately limited to that window. It still covers the common
// failure, which is the connection dropping during the wait before the first
// token.
const STREAM_RETRY_LIMIT = 1

function isAbort(signal: AbortSignal | undefined, error: unknown): boolean {
  if (signal?.aborted) return true
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError'
}

function createRecoverableStream(
  options: StartStreamOptions,
  { signal }: { signal?: AbortSignal }
): ReadableStream<Uint8Array> {
  let reader = createNativeReadableStream(options, { signal }).getReader()
  let attempts = 0
  let delivered = 0

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Loops only to pick the retried stream back up; each pull still emits at
      // most one chunk, so backpressure behaves as it did before.
      for (;;) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            return
          }
          if (value?.byteLength) {
            delivered += value.byteLength
            controller.enqueue(value)
          }
          return
        } catch (error) {
          if (isAbort(signal, error) || delivered > 0 || attempts >= STREAM_RETRY_LIMIT) {
            throw error
          }
          attempts += 1
          reader = createNativeReadableStream(options, { signal }).getReader()
        }
      }
    },
    cancel(reason) {
      return reader.cancel(reason)
    },
  })
}

export async function handleMobileRequest(
  url: string,
  method: string,
  headers: Headers,
  body?: RequestInit['body'],
  signal?: AbortSignal
): Promise<Response> {
  // Fix: Convert Headers to plain object without using .entries()
  const headerObj: Record<string, string> = {}
  headers.forEach((value, key) => {
    headerObj[key] = value
  })
  const isStreaming = body && typeof body === 'string' && JSON.parse(body).stream === true

  if (isStreaming) {
    try {
      // Add SSE Accept header for proper content negotiation
      const streamHeaders = {
        ...headerObj,
        Accept: 'text/event-stream',
      }

      const stream = createRecoverableStream(
        {
          url,
          method,
          headers: streamHeaders,
          body: body as string,
        },
        { signal }
      )

      // TODO: Once native plugin supports returning status/headers,
      // use them instead of hardcoded values
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    } catch (err) {
      console.warn('Native streaming unavailable, falling back', err)
    }
  }

  const response = await CapacitorHttp.request({
    url,
    method,
    headers: headerObj,
    data: body,
    responseType: 'text',
  })

  const rawData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
  // Treat status 0 or < 200 as errors, in addition to >= 400
  if (response.status === 0 || response.status < 200 || response.status >= 400) {
    throw new ApiError(`Status Code ${response.status}`, rawData, response.status)
  }
  const responseData = rawData

  if (isStreaming) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(responseData))
        controller.close()
      },
    })
    return new Response(stream, {
      status: response.status,
      headers: { ...response.headers, 'Content-Type': 'text/event-stream' },
    })
  }

  return new Response(responseData, {
    status: response.status,
    headers: response.headers,
  })
}
