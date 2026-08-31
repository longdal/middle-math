import assert from 'node:assert/strict'
import test from 'node:test'
import { GoogleOAuthSession, GOOGLE_DRIVE_APPDATA_SCOPE, GOOGLE_DRIVE_FILE_SCOPE } from '../src/services/googleIdentity.ts'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

test('Google client id가 없으면 연결을 거부한다', async () => {
  const session = new GoogleOAuthSession('', fetch, () => undefined)
  await assert.rejects(() => session.connect(), /VITE_GOOGLE_CLIENT_ID/)
})

test('OAuth token client는 drive.appdata scope를 요청하고 계정 정보를 조회한다', async () => {
  let requestedScope = ''
  let requestedPrompt: string | undefined
  let userInfoAuth = ''
  const fakeGoogle = {
    accounts: {
      oauth2: {
        initTokenClient(config: { scope: string; callback: (response: { access_token: string; expires_in: number }) => void }) {
          requestedScope = config.scope
          return {
            requestAccessToken(options?: { prompt?: string }) {
              requestedPrompt = options?.prompt
              config.callback({ access_token: 'oauth-token', expires_in: 3600 })
            },
          }
        },
      },
    },
  }
  const fetchMock: typeof fetch = async (_input, init) => {
    userInfoAuth = String((init?.headers as Record<string, string>).Authorization)
    return jsonResponse({ email: 'student@example.com', name: 'Student' })
  }

  const session = new GoogleOAuthSession('client-id', fetchMock, () => fakeGoogle)
  const account = await session.connect()
  assert.match(requestedScope, new RegExp(GOOGLE_DRIVE_APPDATA_SCOPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(requestedScope, new RegExp(GOOGLE_DRIVE_FILE_SCOPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.equal(requestedPrompt, '')
  assert.equal(userInfoAuth, 'Bearer oauth-token')
  assert.equal(account?.email, 'student@example.com')
  assert.equal(session.isConnected(), true)
})
