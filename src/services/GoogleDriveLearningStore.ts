export type LearningState = Record<string, unknown>

export type LearningSnapshot = {
  schemaVersion: 1
  savedAt: string
  app: 'middle-math'
  state: LearningState
}

export type DriveSaveResult = {
  id: string
  name: string
  modifiedTime?: string
}

type DriveFile = DriveSaveResult

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
export const LEARNING_STATE_FILENAME = 'middle-math-learning-state.json'

export class GoogleDriveLearningStore {
  private readonly tokenProvider: () => string
  private readonly fetchImpl: typeof fetch

  constructor(tokenProvider: () => string, fetchImpl: typeof fetch = fetch) {
    this.tokenProvider = tokenProvider
    this.fetchImpl = fetchImpl
  }

  async save(state: LearningState): Promise<DriveSaveResult> {
    const snapshot: LearningSnapshot = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      app: 'middle-math',
      state,
    }

    const existing = await this.findStateFile()
    return existing ? this.updateFile(existing.id, snapshot) : this.createFile(snapshot)
  }

  async load(): Promise<LearningSnapshot | null> {
    const existing = await this.findStateFile()
    if (!existing) return null

    const response = await this.fetchImpl(`${DRIVE_API}/files/${encodeURIComponent(existing.id)}?alt=media`, {
      headers: this.authHeaders(),
    })
    await this.ensureOk(response, 'Google Drive 학습 데이터 불러오기')
    const snapshot = (await response.json()) as LearningSnapshot
    if (snapshot.schemaVersion !== 1 || snapshot.app !== 'middle-math' || !snapshot.state) {
      throw new Error('저장된 학습 데이터 형식을 확인할 수 없습니다.')
    }
    return snapshot
  }

  private async findStateFile(): Promise<DriveFile | null> {
    const q = `name='${LEARNING_STATE_FILENAME}' and trashed=false`
    const params = new URLSearchParams({
      q,
      spaces: 'appDataFolder',
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: '1',
    })
    const response = await this.fetchImpl(`${DRIVE_API}/files?${params.toString()}`, {
      headers: this.authHeaders(),
    })
    await this.ensureOk(response, 'Google Drive 학습 데이터 검색')
    const body = (await response.json()) as { files?: DriveFile[] }
    return body.files?.[0] || null
  }

  private async createFile(snapshot: LearningSnapshot): Promise<DriveSaveResult> {
    const metadata = { name: LEARNING_STATE_FILENAME, parents: ['appDataFolder'], mimeType: 'application/json' }
    return this.multipartRequest(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,modifiedTime`, 'POST', metadata, snapshot)
  }

  private async updateFile(id: string, snapshot: LearningSnapshot): Promise<DriveSaveResult> {
    const metadata = { name: LEARNING_STATE_FILENAME, mimeType: 'application/json' }
    return this.multipartRequest(`${DRIVE_UPLOAD_API}/files/${encodeURIComponent(id)}?uploadType=multipart&fields=id,name,modifiedTime`, 'PATCH', metadata, snapshot)
  }

  private async multipartRequest(
    url: string,
    method: 'POST' | 'PATCH',
    metadata: Record<string, unknown>,
    snapshot: LearningSnapshot,
  ): Promise<DriveSaveResult> {
    const boundary = `middle_math_${Math.random().toString(36).slice(2)}`
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      JSON.stringify(snapshot),
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const response = await this.fetchImpl(url, {
      method,
      headers: {
        ...this.authHeaders(),
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })
    await this.ensureOk(response, 'Google Drive 학습 데이터 저장')
    return response.json() as Promise<DriveSaveResult>
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.tokenProvider()}` }
  }

  private async ensureOk(response: Response, action: string): Promise<void> {
    if (response.ok) return
    let detail = ''
    try {
      const data = (await response.json()) as { error?: { message?: string } }
      detail = data.error?.message || ''
    } catch {
      detail = await response.text().catch(() => '')
    }
    throw new Error(`${action} 실패 (${response.status})${detail ? `: ${detail}` : ''}`)
  }
}
