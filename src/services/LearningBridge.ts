import type { LearningState } from './GoogleDriveLearningStore'
import type { DrivePhotoResult } from './GoogleDriveAttemptStore'

export type PrototypeAttempt = {
  attemptId: string
  problemId: string
  answer: string
  correct: boolean
  concept?: string
  difficulty?: string
  question?: string
  createdAt: string
  photoFile?: File
}

type PrototypeApi = {
  exportState: () => LearningState
  importState: (state: LearningState) => void
  attachAttemptPhoto: (attemptId: string, photo: DrivePhotoResult) => void
  attachAttemptAnalysis?: (attemptId: string, analysis: unknown) => void
}

type PrototypeWindow = Window & {
  middleMathApp?: PrototypeApi
}

export type MiddleMathHostApi = {
  onAttempt: (attempt: PrototypeAttempt) => Promise<DrivePhotoResult | null>
}

declare global {
  interface Window {
    middleMathHost?: MiddleMathHostApi
  }
}

export function getLearningBridge(): PrototypeApi {
  const frame = document.getElementById('learning-prototype-frame') as HTMLIFrameElement | null
  const api = (frame?.contentWindow as PrototypeWindow | null)?.middleMathApp
  if (!api) throw new Error('학습 화면이 아직 준비되지 않았습니다.')
  return api
}
