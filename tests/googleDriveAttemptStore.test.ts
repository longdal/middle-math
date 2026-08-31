import assert from 'node:assert/strict'
import test from 'node:test'
import { ATTEMPT_FOLDER_NAME, GoogleDriveAttemptStore } from '../src/services/GoogleDriveAttemptStore.ts'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

test('풀이 사진 폴더가 없으면 생성하고 사진 바이너리를 업로드한다', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, init })
    if (url.includes('/drive/v3/files?') && (!init?.method || init.method === 'GET')) return jsonResponse({ files: [] })
    if (url.includes('/drive/v3/files?fields=id,name,mimeType') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { name: string; mimeType: string }
      if (body.name === ATTEMPT_FOLDER_NAME) return jsonResponse({ id: 'folder-1', name: body.name, mimeType: body.mimeType })
      return jsonResponse({ id: 'photo-1', name: body.name, mimeType: body.mimeType })
    }
    if (url.includes('/upload/drive/v3/files/photo-1')) {
      return jsonResponse({ id: 'photo-1', name: 'photo.jpg', mimeType: 'image/jpeg', webViewLink: 'https://drive.google.com/file/d/photo-1/view' })
    }
    throw new Error(`unexpected URL: ${url}`)
  }

  const store = new GoogleDriveAttemptStore(() => 'access-token', fetchMock)
  const photo = new Blob(['image-bytes'], { type: 'image/jpeg' })
  const result = await store.uploadPhoto({ attemptId: 'A1', problemId: 'P1', file: photo, originalName: 'solve.jpg' })

  assert.equal(result.id, 'photo-1')
  assert.equal(calls.length, 4)
  assert.match(calls[0].url, /Middle\+Math/)
  assert.equal(calls[1].init?.method, 'POST')
  assert.match(String(calls[1].init?.body), new RegExp(ATTEMPT_FOLDER_NAME))
  assert.equal(calls[2].init?.method, 'POST')
  assert.match(String(calls[2].init?.body), /"attemptId":"A1"/)
  assert.equal(calls[3].init?.method, 'PATCH')
  assert.equal(calls[3].init?.body, photo)
})

test('기존 풀이 사진 폴더가 있으면 재사용한다', async () => {
  let folderCreateCount = 0
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input)
    if (url.includes('/drive/v3/files?') && (!init?.method || init.method === 'GET')) {
      return jsonResponse({ files: [{ id: 'existing-folder', name: ATTEMPT_FOLDER_NAME }] })
    }
    if (url.includes('/drive/v3/files?fields=id,name,mimeType') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { parents?: string[] }
      if (!body.parents) folderCreateCount++
      return jsonResponse({ id: 'photo-2', name: 'photo.png', mimeType: 'image/png' })
    }
    if (url.includes('/upload/drive/v3/files/photo-2')) return jsonResponse({ id: 'photo-2', name: 'photo.png' })
    throw new Error(`unexpected URL: ${url}`)
  }
  const store = new GoogleDriveAttemptStore(() => 'token', fetchMock)
  await store.uploadPhoto({ attemptId: 'A2', problemId: 'P2', file: new Blob(['x'], { type: 'image/png' }) })
  assert.equal(folderCreateCount, 0)
})
