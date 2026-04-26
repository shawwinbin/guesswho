export interface HistoricalFigure {
  id: string
  name: string
  aliases: string[]
  era: string
  role: string
  gender: string
  region: string
  keywords: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
  isAlive: boolean
  isChinese: boolean
  isMilitaryLeader: boolean
  isPhilosopher: boolean
  isArtist: boolean
  isScientist: boolean
  isPolitician: boolean
  bornYear?: number
  diedYear?: number
}

export type FigureScope = 'all' | 'poet' | 'emperor' | 'military' | 'philosopher' | 'female' | 'tang-song'
