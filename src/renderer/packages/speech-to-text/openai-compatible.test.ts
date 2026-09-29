import { describe, expect, it, vi } from 'vitest'
import { transcribeOpenAICompatibleAudio } from './openai-compatible'

describe('transcribeOpenAICompatibleAudio', () => {
  it('posts an OpenAI-compatible multipart request without forcing a JSON content type', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ text: 'recognized text' }), { status: 200 }))
    const audio = new File(['audio'], 'meeting.webm', { type: 'audio/webm' })

    await expect(
      transcribeOpenAICompatibleAudio(
        {
          baseUrl: 'http://127.0.0.1:8000/v1/',
          model: 'FunAudioLLM/SenseVoiceSmall',
          apiKey: ' local-token ',
        },
        audio,
        request
      )
    ).resolves.toBe('recognized text')

    const [url, init] = request.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:8000/v1/audio/transcriptions')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ Authorization: 'Bearer local-token' })
    expect(init.headers).not.toHaveProperty('Content-Type')
    expect(init.body.get('model')).toBe('FunAudioLLM/SenseVoiceSmall')
    expect(init.body.get('file')).toBeInstanceOf(File)
  })

  it.each([
    [' http://127.0.0.1:8000/v1/ ', 'http://127.0.0.1:8000/v1/audio/transcriptions'],
    ['\nhttps://asr.example/api/\t', 'https://asr.example/api/v1/audio/transcriptions'],
    ['https://asr.example/api/v1', 'https://asr.example/api/v1/audio/transcriptions'],
  ])('normalizes the configured base URL %j', async (baseUrl, expectedUrl) => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: 'transcript' })))
    await transcribeOpenAICompatibleAudio(
      { baseUrl, model: ' local-model ', apiKey: ' ' },
      new File(['audio'], 'recording.wav'),
      request
    )
    const [url, init] = request.mock.calls[0]
    expect(url).toBe(expectedUrl)
    expect(init.headers).toEqual({})
    expect(init.body.get('model')).toBe('local-model')
  })

  it.each([
    [401, { error: { message: 'Invalid API key' } }, 'Audio transcription failed (HTTP 401): Invalid API key'],
    [400, { detail: 'Unsupported audio format' }, 'Audio transcription failed (HTTP 400): Unsupported audio format'],
    [422, { detail: [{ msg: 'Field required' }] }, 'Audio transcription failed (HTTP 422)'],
    [500, { error: { message: ' ' } }, 'Audio transcription failed (HTTP 500)'],
  ])('reports HTTP %i without losing the service error', async (status, payload, message) => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status }))
    await expect(
      transcribeOpenAICompatibleAudio(
        { baseUrl: 'http://localhost:8000', model: 'local-model' },
        new File(['audio'], 'recording.wav'),
        request
      )
    ).rejects.toThrow(message)
  })

  it.each([
    [413, '<html>Request body too large</html>'],
    [502, ''],
  ])('reports HTTP %i even when the gateway does not return JSON', async (status, body) => {
    const request = vi.fn().mockResolvedValue(new Response(body, { status }))
    await expect(
      transcribeOpenAICompatibleAudio(
        { baseUrl: 'http://localhost:8000', model: 'local-model' },
        new File(['audio'], 'recording.wav'),
        request
      )
    ).rejects.toThrow(`Audio transcription failed (HTTP ${status})`)
  })

  it('distinguishes malformed successful responses from HTTP failures', async () => {
    const request = vi.fn().mockResolvedValue(new Response('<html>Gateway login</html>'))
    await expect(
      transcribeOpenAICompatibleAudio(
        { baseUrl: 'http://localhost:8000', model: 'local-model' },
        new File(['audio'], 'recording.wav'),
        request
      )
    ).rejects.toThrow('The transcription service returned invalid JSON')
  })

  it.each([null, {}, { text: '' }, { text: ' \n\t' }, { text: 42 }])(
    'rejects a successful response without usable text: %j',
    async (payload) => {
      const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)))
      await expect(
        transcribeOpenAICompatibleAudio(
          { baseUrl: 'http://localhost:8000', model: 'local-model' },
          new File(['audio'], 'recording.wav'),
          request
        )
      ).rejects.toThrow('The transcription service returned no text')
    }
  )

  it.each([200, 502])('preserves response body transport errors for HTTP %i', async (status) => {
    for (const error of [new TypeError('Connection terminated'), new DOMException('Aborted', 'AbortError')]) {
      const response = new Response('', { status })
      vi.spyOn(response, 'json').mockRejectedValue(error)
      const request = vi.fn().mockResolvedValue(response)
      await expect(
        transcribeOpenAICompatibleAudio(
          { baseUrl: 'http://localhost:8000', model: 'local-model' },
          new File(['audio'], 'recording.wav'),
          request
        )
      ).rejects.toBe(error)
    }
  })
})
