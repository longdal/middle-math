export const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash'

export class GeminiSession {
  private apiKey = ''
  private readonly fetchImpl: typeof fetch

  constructor(fetchImpl: typeof fetch = fetch) {
    this.fetchImpl = fetchImpl
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey.trim()
  }

  clear(): void {
    this.apiKey = ''
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey)
  }

  async testConnection(model = DEFAULT_GEMINI_MODEL): Promise<string> {
    const key = this.requireKey()
    const response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
      { headers: { 'x-goog-api-key': key } },
    )
    if (!response.ok) throw new Error(await this.formatError(response, 'Gemini API 연결 테스트'))
    const data = (await response.json()) as { displayName?: string; name?: string }
    return data.displayName || data.name || model
  }

  async generate(input: string, model = DEFAULT_GEMINI_MODEL): Promise<string> {
    const key = this.requireKey()
    const response = await this.fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({ model, input }),
    })
    if (!response.ok) throw new Error(await this.formatError(response, 'Gemini API 호출'))
    const data = (await response.json()) as { output_text?: string; outputText?: string }
    return data.output_text || data.outputText || ''
  }

  private requireKey(): string {
    if (!this.apiKey) throw new Error('Gemini API 키를 입력해 주세요.')
    return this.apiKey
  }

  private async formatError(response: Response, action: string): Promise<string> {
    let detail = ''
    try {
      const data = (await response.json()) as { error?: { message?: string } }
      detail = data.error?.message || ''
    } catch {
      detail = await response.text().catch(() => '')
    }
    return `${action} 실패 (${response.status})${detail ? `: ${detail}` : ''}`
  }
}
