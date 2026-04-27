import { useEffect, useState } from 'react'
import type { SpeechState } from './useSpeechSynthesis'
import type { UseVoiceInputResult } from './useVoiceInput'

export type VoiceTarget = 'question' | 'guess' | null
export type VoiceGamePhase = 'idle' | 'loading' | 'playing' | 'ended'

interface UseVoiceGameControllerParams {
  voiceModeEnabled: boolean
  continuousVoiceModeEnabled: boolean
  gamePhase: VoiceGamePhase
  isLoading: boolean
  speechState: SpeechState
  pendingAutoListenTarget: VoiceTarget
  setPendingAutoListenTarget: (target: VoiceTarget) => void
  questionVoice: UseVoiceInputResult
  guessVoice: UseVoiceInputResult
}

export function useVoiceGameController({
  voiceModeEnabled,
  continuousVoiceModeEnabled,
  gamePhase,
  isLoading,
  speechState,
  pendingAutoListenTarget,
  setPendingAutoListenTarget,
  questionVoice,
  guessVoice,
}: UseVoiceGameControllerParams) {
  const [voiceTarget, setVoiceTarget] = useState<VoiceTarget>(null)

  const activeVoice =
    voiceTarget === 'question'
      ? questionVoice
      : voiceTarget === 'guess'
        ? guessVoice
        : null

  useEffect(() => {
    if (!voiceModeEnabled || !continuousVoiceModeEnabled) {
      setPendingAutoListenTarget(null)
      return
    }

    if (gamePhase !== 'playing' || isLoading || speechState !== 'idle' || !pendingAutoListenTarget) {
      return
    }

    const targetVoice = pendingAutoListenTarget === 'question' ? questionVoice : guessVoice

    if (!targetVoice.isSupported || targetVoice.state === 'listening') {
      return
    }

    if (targetVoice.state === 'error') {
      setPendingAutoListenTarget(null)
      return
    }

    setVoiceTarget(pendingAutoListenTarget)
    setPendingAutoListenTarget(null)
    targetVoice.resetTranscript()
    targetVoice.startListening()
  }, [
    voiceModeEnabled,
    continuousVoiceModeEnabled,
    gamePhase,
    isLoading,
    speechState,
    pendingAutoListenTarget,
    setPendingAutoListenTarget,
    questionVoice,
    guessVoice,
  ])

  return {
    voiceTarget,
    setVoiceTarget,
    activeVoice,
  }
}
