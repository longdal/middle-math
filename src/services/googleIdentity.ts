export const GOOGLE_DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const GOOGLE_IDENTITY_SCOPES = `openid email profile ${GOOGLE_DRIVE_APPDATA_SCOPE} ${GOOGLE_DRIVE_FILE_SCOPE}`

export type GoogleAccountInfo = {
  email?: string
  name?: string
  picture?: string
}

type TokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

type TokenClient = {
  requestAccessToken: (config?: { prompt?: string }) => void
}

type GoogleOAuth2Api = {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: unknown) => void
  }) => TokenClient
  revoke?: (token: string, callback?: () => void) => void
}

type GoogleIdentityApi = {
  accounts?: {
    oauth2?: GoogleOAuth2Api
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityApi
  }
}

export class GoogleOAuthSession {
  private accessToken = ''
  private expiresAt = 0
  private account: GoogleAccountInfo | null = null
  private readonly clientId: string
  private readonly fetchImpl: typeof fetch
  private readonly googleProvider: () => GoogleIdentityApi | undefined

  constructor(
    clientId: string,
    fetchImpl: typeof fetch = fetch,
    googleProvider: () => GoogleIdentityApi | undefined = () => window.google,
  ) {
    this.clientId = clientId
    this.fetchImpl = fetchImpl
    this.googleProvider = googleProvider
  }

  isConfigured(): boolean {
    return Boolean(this.clientId)
  }

  isConnected(): boolean {
    return Boolean(this.accessToken) && Date.now() < this.expiresAt
  }

  getAccount(): GoogleAccountInfo | null {
    return this.account
  }

  getAccessToken(): string {
    if (!this.isConnected()) {
      throw new Error('Google OAuth 연결이 필요하거나 액세스 토큰이 만료되었습니다.')
    }
    return this.accessToken
  }

  async connect(): Promise<GoogleAccountInfo | null> {
    if (!this.clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID가 설정되지 않았습니다.')
    }

    const oauth2 = this.googleProvider()?.accounts?.oauth2
    if (!oauth2) {
      throw new Error('Google Identity Services 스크립트를 불러오지 못했습니다.')
    }

    const response = await new Promise<TokenResponse>((resolve, reject) => {
      const client = oauth2.initTokenClient({
        client_id: this.clientId,
        scope: GOOGLE_IDENTITY_SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google OAuth 인증에 실패했습니다.'))
            return
          }
          resolve(tokenResponse)
        },
        error_callback: (error) => reject(new Error(`Google OAuth 오류: ${String(error)}`)),
      })
      client.requestAccessToken({ prompt: '' })
    })

    this.accessToken = response.access_token || ''
    const expiresInMs = Math.max(60, response.expires_in || 3600) * 1000
    this.expiresAt = Date.now() + expiresInMs - 30_000
    this.account = await this.fetchAccountInfo().catch(() => null)
    return this.account
  }

  async disconnect(): Promise<void> {
    const token = this.accessToken
    this.accessToken = ''
    this.expiresAt = 0
    this.account = null
    const revoke = this.googleProvider()?.accounts?.oauth2?.revoke
    if (token && revoke) {
      await new Promise<void>((resolve) => revoke(token, resolve))
    }
  }

  private async fetchAccountInfo(): Promise<GoogleAccountInfo> {
    const response = await this.fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${this.getAccessToken()}` },
    })
    if (!response.ok) throw new Error(`Google 사용자 정보 조회 실패 (${response.status})`)
    return response.json() as Promise<GoogleAccountInfo>
  }
}
