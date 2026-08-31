import type { Difficulty } from '../../types/learning'

export type VertexName = 'A' | 'B' | 'C' | 'D' | 'O' | 'I'

export interface GeometryDiagram {
  shape: string
  equalSides?: string[]
  givenAngles?: Partial<Record<VertexName, number>>
  unknownAngles?: VertexName[]
}

export interface Problem {
  id: string
  grade: 2
  semester: 2
  unit: string
  concept: string
  difficulty: Difficulty
  question: string
  answers: string[]
  diagram?: GeometryDiagram | string
}
