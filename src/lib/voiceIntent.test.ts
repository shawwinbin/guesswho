import { describe, expect, it } from 'vitest'
import { parseVoiceIntent } from './voiceIntent'

describe('voiceIntent', () => {
  it('treats a pure figure name as a final guess', () => {
    expect(parseVoiceIntent('李白')).toEqual({
      type: 'guess',
      guess: '李白',
      matchedName: '李白',
    })
  })

  it('treats aliases and named yes-no questions as final guesses', () => {
    expect(parseVoiceIntent('李太白')).toEqual({
      type: 'guess',
      guess: '李太白',
      matchedName: '李白',
    })

    expect(parseVoiceIntent('他是武则天吗？')).toEqual({
      type: 'guess',
      guess: '武则天',
      matchedName: '武则天',
    })
  })

  it('fuzzily matches likely speech-recognition mistakes inside guess-like utterances', () => {
    expect(parseVoiceIntent('李百')).toEqual({
      type: 'guess',
      guess: '李白',
      matchedName: '李白',
    })

    expect(parseVoiceIntent('他是武测天吗？')).toEqual({
      type: 'guess',
      guess: '武则天',
      matchedName: '武则天',
    })
  })

  it('treats regular utterances as questions', () => {
    expect(parseVoiceIntent('他是唐朝的人吗？')).toEqual({
      type: 'question',
      question: '他是唐朝的人吗？',
    })

    expect(parseVoiceIntent('李')).toEqual({
      type: 'question',
      question: '李',
    })
  })

  it('recognizes local control commands', () => {
    expect(parseVoiceIntent('重新开始')).toEqual({
      type: 'control',
      command: 'restart',
    })

    expect(parseVoiceIntent('再说一遍')).toEqual({
      type: 'control',
      command: 'repeat',
    })

    expect(parseVoiceIntent('退出语音模式')).toEqual({
      type: 'control',
      command: 'exit-continuous-mode',
    })
  })
})
