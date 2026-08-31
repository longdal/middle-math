export type DrivePhotoResult = {
  id: string
  name: string
  mimeType?: string
  webViewLink?: string
  webContentLink?: string
  createdTime?: string
  modifiedTime?: string
}

export type AttemptPhotoUpload = {
  attemptId: string
  problemId: string
  file: Blob
  originalName?: string
}

type DriveFile = DrivePhotoResult

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
export const ATTEMPT_FOLDER_NAME = 'Middle Math - 풀이 사진'

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function safeExtension(name: string | undefined, mimeType: string): string {
  const fromName = name?.match(/\.([A-Za-z0-9]{1,8})$/)?.[1]
  if (fromName) return fromName.toLowerCase()
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic'
  return 'jpg'
}

export class GoogleDriveAttemptStore {
  private readonly tokenProvider: () => string
  private readonly fetchImpl: typeof fetch
  private folderId = ''

  constructor(tokenProvider: () => string, fetchImpl: typeof fetch = fetch) {
    this.tokenProvider = tokenProvider
    this.fetchImpl = fetchImpl
  }

  async uploadPhoto(input: AttemptPhotoUpload): Promise<DrivePhotoResult> {
    if (!input.file || input.file.size === 0) throw new Error('업로드할 풀이 사진이 없습니다.')
    const folderId = await this.ensureFolder()
    const mimeType = input.file.type || 'image/jpeg'
    const extension = safeExtension(input.originalName, mimeType)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
    const fileName = `${timestamp}_${input.problemId}_${input.attemptId}.${extension}`

    const metadataResponse = await this.fetchImpl(
      `${DRIVE_API}/files?fields=id,name,mimeType,webViewLink,createdTime,modifiedTime`,
      {
        method: 'POST',
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
          mimeType,
          appProperties: {
            app: 'middle-math',
            attemptId: input.attemptId,
            problemId: input.problemId,
          },
        }),
      },
    )
    await this.ensureOk(metadataResponse, 'Google Drive 풀이 사진 파일 생성')
    const created = (await metadataResponse.json()) as DriveFile

    const uploadResponse = await this.fetchImpl(
      `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(created.id)}?uploadType=media&fields=id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          ...this.authHeaders(),
          'Content-Type': mimeType,
        },
        body: input.file,
      },
    )
    if (!uploadResponse.ok) {
      await this.fetchImpl(`${DRIVE_API}/files/${encodeURIComponent(created.id)}`, {
        method: 'DELETE',
        headers: this.authHeaders(),
      }).catch(() => undefined)
      await this.ensureOk(uploadResponse, 'Google Drive 풀이 사진 업로드')
    }
    return uploadResponse.json() as Promise<DrivePhotoResult>
  }

  async ensureFolder(): Promise<string> {
    if (this.folderId) return this.folderId
    const q = `name='${escapeDriveQuery(ATTEMPT_FOLDER_NAME)}' and mimeType='${FOLDER_MIME}' and trashed=false`
    const params = new URLSearchParams({
      q,
      fields: 'files(id,name,mimeType,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: '1',
      spaces: 'drive',
    })
    const findResponse = await this.fetchImpl(`${DRIVE_API}/files?${params.toString()}`, {
      headers: this.authHeaders(),
    })
    await this.ensureOk(findResponse, 'Google Drive 풀이 사진 폴더 검색')
    const found = (await findResponse.json()) as { files?: DriveFile[] }
    if (found.files?.[0]?.id) {
      this.folderId = found.files[0].id
      return this.folderId
    }

    const createResponse = await this.fetchImpl(`${DRIVE_API}/files?fields=id,name,mimeType`, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: ATTEMPT_FOLDER_NAME, mimeType: FOLDER_MIME }),
    })
    await this.ensureOk(createResponse, 'Google Drive 풀이 사진 폴더 생성')
    const folder = (await createResponse.json()) as DriveFile
    this.folderId = folder.id
    return folder.id
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
