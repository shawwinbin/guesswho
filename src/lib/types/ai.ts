export interface AiSecretFigure {
  name: string
  aliases?: string[]
  era?: string
}

export interface AiGuessVerdict {
  isCorrect: boolean
  revealedName: string
}
