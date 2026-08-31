export type Difficulty = 1 | 2 | 3 | 4 | 5

export type LearningStage =
  | 'diagnostic'
  | 'remediation'
  | 'mastery-check'
  | 'advanced'

export interface ConceptStatus {
  conceptId: string
  conceptName: string
  score: number
  attempts: number
  updatedAt: string
}

export interface Attempt {
  attemptId: string
  studentId: string
  problemId: string
  answer: string
  correct: boolean
  score: number
  photoUrl?: string
  createdAt: string
}
