import { describe, expect, it } from 'vitest'
import {
  buildAnswerAnnouncement,
  buildCorrectGuessAnnouncement,
  buildGuessFailureAnnouncement,
  buildLimitReachedAnnouncement,
  buildStartAnnouncement,
  buildStartFailureAnnouncement,
  buildSubmitGuessFailureAnnouncement,
  buildSubmitQuestionFailureAnnouncement,
} from './gameAnnouncements'

describe('gameAnnouncements', () => {
  it('builds mode-specific start announcements', () => {
    expect(buildStartAnnouncement('local')).toBe(
      '欢迎来到历史人物猜谜，我是你的主持人。人物已经准备好了，请开始提出只能回答是或不是的问题。',
    )
    expect(buildStartAnnouncement('ai')).toBe(
      '欢迎来到历史人物猜谜，我是你的主持人。AI 已经选好人物，请开始提出只能回答是或不是的问题。',
    )
  })

  it('builds the spoken answer announcement', () => {
    expect(buildAnswerAnnouncement('是')).toBe('是。')
    expect(buildAnswerAnnouncement('不是')).toBe('不是。')
  })

  it('builds a limit-reached announcement with the revealed name', () => {
    expect(buildLimitReachedAnnouncement('秦始皇')).toBe(
      '本轮提问次数已经用完。现在公布答案，这位人物正是秦始皇。',
    )
  })

  it('builds win and loss guess announcements', () => {
    expect(buildCorrectGuessAnnouncement('李白')).toBe('回答正确！这位人物正是李白。恭喜你猜中了。')
    expect(buildGuessFailureAnnouncement('杜甫', '李白')).toBe(
      '这次没有猜中。你的答案是杜甫。正确答案是李白。下次再接再厉。',
    )
  })

  it('builds the generic failure prompts', () => {
    expect(buildStartFailureAnnouncement()).toBe('启动失败，请检查网络或设置。')
    expect(buildSubmitQuestionFailureAnnouncement()).toBe('提问失败，请重试。')
    expect(buildSubmitGuessFailureAnnouncement()).toBe('猜测提交失败，请重试。')
  })
})
