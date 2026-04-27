import type { YesNoAnswer } from './types'

export function buildStartAnnouncement(mode: 'local' | 'ai'): string {
  return mode === 'ai'
    ? '欢迎来到历史人物猜谜，我是你的主持人。AI 已经选好人物，请开始提出只能回答是或不是的问题。'
    : '欢迎来到历史人物猜谜，我是你的主持人。人物已经准备好了，请开始提出只能回答是或不是的问题。'
}

export function buildStartFailureAnnouncement(): string {
  return '启动失败，请检查网络或设置。'
}

export function buildAnswerAnnouncement(answer: YesNoAnswer): string {
  return `${answer}。`
}

export function buildLimitReachedAnnouncement(revealedName: string): string {
  return `本轮提问次数已经用完。现在公布答案，这位人物正是${revealedName}。`
}

export function buildCorrectGuessAnnouncement(revealedName: string): string {
  return `回答正确！这位人物正是${revealedName}。恭喜你猜中了。`
}

export function buildGuessFailureAnnouncement(guess: string, revealedName: string): string {
  return `这次没有猜中。你的答案是${guess}。正确答案是${revealedName}。下次再接再厉。`
}

export function buildSubmitQuestionFailureAnnouncement(): string {
  return '提问失败，请重试。'
}

export function buildSubmitGuessFailureAnnouncement(): string {
  return '猜测提交失败，请重试。'
}
