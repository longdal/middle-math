import assert from 'node:assert/strict'
import test from 'node:test'
import { GoogleDriveLearningStore, LEARNING_STATE_FILENAME } from '../src/services/GoogleDriveLearningStore.ts'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('Drive에 저장 파일이 없으면 appDataFolder에 새 JSON 파일을 만든다', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, init })
    if (url.includes('/upload/drive/v3/files?')) return jsonResponse({ id: 'file-1', name: LEARNING_STATE_FILENAME })
    if (url.includes('/drive/v3/files?')) return jsonResponse({ files: [] })
    throw new Error(`unexpected URL: ${url}`)
  }

  const store = new GoogleDriveLearningStore(() => 'access-token', fetchMock)
  const result = await store.save({ version: 1, idx: 3 })

  assert.equal(result.id, 'file-1')
  assert.equal(calls.length, 2)
  assert.match(calls[0].url, /spaces=appDataFolder/)
  assert.equal(calls[0].init?.headers && (calls[0].init.headers as Record<string, string>).Authorization, 'Bearer access-token')
  assert.equal(calls[1].init?.method, 'POST')
  assert.match(String(calls[1].init?.body), /appDataFolder/)
  assert.match(String(calls[1].init?.body), /"idx":3/)
})

test('기존 저장 파일이 있으면 PATCH로 갱신한다', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, init })
    if (url.includes('/drive/v3/files?')) return jsonResponse({ files: [{ id: 'existing', name: LEARNING_STATE_FILENAME }] })
    if (url.includes('/upload/drive/v3/files/existing')) return jsonResponse({ id: 'existing', name: LEARNING_STATE_FILENAME })
    throw new Error(`unexpected URL: ${url}`)
  }

  const store = new GoogleDriveLearningStore(() => 'token', fetchMock)
  await store.save({ view: 'review' })

  assert.equal(calls[1].init?.method, 'PATCH')
  assert.match(calls[1].url, /files\/existing/)
})

test('저장된 학습 상태를 불러온다', async () => {
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input)
    if (url.includes('/drive/v3/files?')) return jsonResponse({ files: [{ id: 'state-file', name: LEARNING_STATE_FILENAME }] })
    if (url.includes('/drive/v3/files/state-file?alt=media')) {
      return jsonResponse({ schemaVersion: 1, savedAt: '2026-08-31T00:00:00.000Z', app: 'middle-math', state: { idx: 5 } })
    }
    throw new Error(`unexpected URL: ${url}`)
  }

  const store = new GoogleDriveLearningStore(() => 'token', fetchMock)
  const snapshot = await store.load()
  assert.deepEqual(snapshot?.state, { idx: 5 })
})

test('저장 파일이 없으면 load는 null을 반환한다', async () => {
  const fetchMock: typeof fetch = async () => jsonResponse({ files: [] })
  const store = new GoogleDriveLearningStore(() => 'token', fetchMock)
  assert.equal(await store.load(), null)
})
