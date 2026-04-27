import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as gameApi from './lib/gameApi'
import * as llmClient from './lib/llmClient'

function createVoiceMock() {
  return {
    state: 'idle',
    transcript: '',
    error: null,
    errorCode: null,
    isSupported: true,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    resetTranscript: vi.fn(),
  }
}

const questionVoiceMock = createVoiceMock()
const guessVoiceMock = createVoiceMock()
let voiceCallIndex = 0

const speechMock = {
  state: 'idle',
  isSupported: true,
  speak: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
}

function mockPointerMode(mode: 'fine' | 'coarse') {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    value: mode === 'coarse' ? 5 : 0,
    configurable: true,
  })
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)' ? mode === 'coarse' : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    configurable: true,
    writable: true,
  })
}

vi.mock('./lib/gameApi', () => ({
  createSession: vi.fn(),
  fetchSession: vi.fn(),
  submitQuestion: vi.fn(),
  submitGuess: vi.fn(),
}))

vi.mock('./lib/llmClient', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}))

vi.mock('./lib/useVoiceInput', () => ({
  useVoiceInput: vi.fn(() => [questionVoiceMock, guessVoiceMock][voiceCallIndex++ % 2]),
}))

vi.mock('./lib/useSpeechSynthesis', () => ({
  useSpeechSynthesis: vi.fn(() => speechMock),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    voiceCallIndex = 0
    Object.assign(questionVoiceMock, createVoiceMock())
    Object.assign(guessVoiceMock, createVoiceMock())
    Object.assign(speechMock, {
      state: 'idle',
      isSupported: true,
      speak: vi.fn(),
      stop: vi.fn(),
      cancel: vi.fn(),
    })
    mockPointerMode('fine')
    vi.mocked(llmClient.loadSettings).mockReturnValue({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: false,
      continuousVoiceMode: false,
    })
    vi.mocked(gameApi.fetchSession).mockRejectedValue(new Error('not found'))
    vi.mocked(gameApi.createSession).mockResolvedValue({
      sessionId: 'session-1',
      status: 'playing',
      questionCount: 0,
      questionLimit: 20,
      remainingQuestions: 20,
      history: [],
      guesses: [],
    })
  })

  it('routes a spoken figure name to final guess in continuous voice mode', async () => {
    vi.mocked(llmClient.loadSettings).mockReturnValue({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: true,
      continuousVoiceMode: true,
    })
    vi.mocked(gameApi.submitGuess).mockResolvedValue({
      isCorrect: true,
      revealedName: '李白',
      status: 'ended',
    })

    const view = render(<App />)
    fireEvent.click(screen.getByText('开始游戏'))

    await waitFor(() => {
      expect(questionVoiceMock.startListening).toHaveBeenCalled()
    })

    questionVoiceMock.transcript = '李白'
    view.rerender(<App />)

    await waitFor(() => {
      expect(gameApi.submitGuess).toHaveBeenCalledWith('session-1', '李白')
      expect(screen.getByText(/你猜对了/)).toBeInTheDocument()
    })
  })

  it('requires a manual start button before continuous voice begins on coarse-pointer devices', async () => {
    mockPointerMode('coarse')
    vi.mocked(llmClient.loadSettings).mockReturnValue({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: true,
      continuousVoiceMode: true,
    })

    render(<App />)
    fireEvent.click(screen.getByText('开始游戏'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始连续语音对话' })).toBeInTheDocument()
    })

    expect(screen.getByText('等待点击开始连续语音对话')).toBeInTheDocument()
    expect(questionVoiceMock.startListening).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '开始连续语音对话' }))

    expect(questionVoiceMock.startListening).toHaveBeenCalledTimes(1)
  })

  it('shows a speaking status hint while ai voice playback is active', async () => {
    vi.mocked(llmClient.loadSettings).mockReturnValue({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: true,
      continuousVoiceMode: true,
    })
    speechMock.state = 'speaking'

    render(<App />)
    fireEvent.click(screen.getByText('开始游戏'))

    await waitFor(() => {
      expect(screen.getByText('AI 正在语音回答，播报结束后会继续收听')).toBeInTheDocument()
    })
  })

  it('shows microphone permission recovery guidance in continuous voice mode', async () => {
    mockPointerMode('coarse')
    vi.mocked(llmClient.loadSettings).mockReturnValue({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: true,
      continuousVoiceMode: true,
    })
    Object.assign(questionVoiceMock, {
      state: 'error',
      error: '麦克风权限未开启，请先允许浏览器和系统麦克风后重试',
      errorCode: 'permission-denied',
    })

    render(<App />)
    fireEvent.click(screen.getByText('开始游戏'))

    await waitFor(() => {
      expect(screen.getByText(/请先在浏览器地址栏或系统设置里允许麦克风/)).toBeInTheDocument()
    })
  })

  it('exits continuous mode when the local exit command is spoken', async () => {
    vi.mocked(llmClient.loadSettings).mockReturnValue({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: true,
      continuousVoiceMode: true,
    })

    const view = render(<App />)
    fireEvent.click(screen.getByText('开始游戏'))

    await waitFor(() => {
      expect(screen.getByText(/连续语音对话已开启/)).toBeInTheDocument()
    })

    questionVoiceMock.transcript = '退出语音模式'
    view.rerender(<App />)

    await waitFor(() => {
      expect(screen.queryByText(/连续语音对话已开启/)).not.toBeInTheDocument()
      expect(speechMock.speak).toHaveBeenCalledWith('已退出连续语音对话。')
    })
  })

  it('renders the backend-ai start screen', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '历史人物猜谜' })).toBeInTheDocument()
    expect(screen.getByText(/后端 AI 会秘密选择一位历史人物/)).toBeInTheDocument()
    expect(screen.getByText(/当前模式: 后端AI主持模式/)).toBeInTheDocument()
  })

  it('starts a session and records question history from backend answers', async () => {
    vi.mocked(gameApi.submitQuestion).mockResolvedValue({
      answer: '是',
      status: 'playing',
      questionCount: 1,
      questionLimit: 20,
      remainingQuestions: 19,
    })

    render(<App />)
    fireEvent.click(screen.getByText('开始游戏'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/输入你的问题/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/输入你的问题/), {
      target: { value: '他是皇帝吗？' },
    })
    fireEvent.click(screen.getByText('提问'))

    await waitFor(() => {
      expect(gameApi.submitQuestion).toHaveBeenCalledWith('session-1', '他是皇帝吗？')
      expect(screen.getByText(/答: 是/)).toBeInTheDocument()
    })
  })

  it('shows the result screen after a final guess', async () => {
    vi.mocked(gameApi.submitGuess).mockResolvedValue({
      isCorrect: false,
      revealedName: '李白',
      status: 'ended',
    })

    render(<App />)
    fireEvent.click(screen.getByText('开始游戏'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/输入你猜测的历史人物名字/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/输入你猜测的历史人物名字/), {
      target: { value: '杜甫' },
    })
    fireEvent.click(screen.getByText('最终猜测'))

    await waitFor(() => {
      expect(gameApi.submitGuess).toHaveBeenCalledWith('session-1', '杜甫')
      expect(screen.getByText(/答错了/)).toBeInTheDocument()
      expect(screen.getByText('李白')).toBeInTheDocument()
    })
  })

  it('opens and closes the simplified settings panel', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument()
      expect(screen.getByLabelText('人物范围')).toBeInTheDocument()
      expect(screen.getByLabelText('提问次数上限')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('取消'))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '设置' })).not.toBeInTheDocument()
    })
  })
})
