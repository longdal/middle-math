import assert from 'node:assert/strict'
import test from 'node:test'
import { GeminiSession } from '../src/services/GeminiSession.ts'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

test('Gemini 키가 없으면 요청하지 않는다', async () => {
  let called = false
  const session = new GeminiSession(async () => {
    called = true
    return jsonResponse({})
  })
  await assert.rejects(() => session.testConnection(), /API 키를 입력/)
  assert.equal(called, false)
})

test('Gemini 연결 테스트는 x-goog-api-key 헤더로 현재 메모리 키를 보낸다', async () => {
  let capturedHeader = ''
  const session = new GeminiSession(async (_input, init) => {
    capturedHeader = String((init?.headers as Record<string, string>)['x-goog-api-key'])
    return jsonResponse({ displayName: 'Gemini Test' })
  })
  session.setApiKey(' temporary-key ')
  const modelName = await session.testConnection()
  assert.equal(capturedHeader, 'temporary-key')
  assert.equal(modelName, 'Gemini Test')
})

test('clear 후 Gemini 키는 메모리에서 제거된다', async () => {
  const session = new GeminiSession(async () => jsonResponse({ displayName: 'Gemini' }))
  session.setApiKey('temporary-key')
  assert.equal(session.hasApiKey(), true)
  session.clear()
  assert.equal(session.hasApiKey(), false)
  await assert.rejects(() => session.testConnection(), /API 키를 입력/)
})
