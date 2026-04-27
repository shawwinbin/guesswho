import { useState } from 'react'
import { FIGURE_SCOPE_OPTIONS } from '../lib/gameContent'
import type { FigureScope, GameSettings } from '../lib/types'

interface SettingsPanelProps {
  settings: GameSettings
  onSettingsChange: (settings: GameSettings) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  const [local, setLocal] = useState(settings)

  const handleSave = () => {
    onSettingsChange(local)
    onClose()
  }

  const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  const recognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  const voiceSupported = speechSupported && recognitionSupported

  return (
    <div className="settings-panel">
      <h3>设置</h3>
      <div className="setting-row">
        <label htmlFor="figure-scope">人物范围</label>
        <select id="figure-scope" value={local.figureScope} onChange={event => setLocal(prev => ({ ...prev, figureScope: event.target.value as FigureScope }))}>
          {FIGURE_SCOPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="setting-row">
        <label htmlFor="question-limit">提问次数上限</label>
        <input
          id="question-limit"
          type="number"
          min={0}
          max={100}
          value={local.questionLimit}
          onChange={event => setLocal(prev => ({ ...prev, questionLimit: Number.parseInt(event.target.value, 10) || 0 }))}
        />
        <span className="setting-note">0 表示不限制</span>
      </div>

      <div className="setting-row voice-mode-setting">
        <label htmlFor="voice-mode">
          语音模式
          {!voiceSupported && <span className="unsupported-note">（浏览器不支持）</span>}
        </label>
        <div className="toggle-row">
          <input
            id="voice-mode"
            type="checkbox"
            checked={local.voiceMode}
            onChange={event => setLocal(prev => ({
              ...prev,
              voiceMode: event.target.checked,
              continuousVoiceMode: event.target.checked ? prev.continuousVoiceMode : false,
            }))}
            disabled={!voiceSupported}
          />
          <span className="toggle-label">
            {local.voiceMode ? '开启' : '关闭'}
          </span>
        </div>
        <span className="setting-note">
          开启后：说出问题/猜测自动提交，答案语音播报
        </span>
      </div>

      <div className="setting-row voice-mode-setting">
        <label htmlFor="continuous-voice-mode">
          连续语音对话
          {!voiceSupported && <span className="unsupported-note">（浏览器不支持）</span>}
        </label>
        <div className="toggle-row">
          <input
            id="continuous-voice-mode"
            type="checkbox"
            checked={local.continuousVoiceMode}
            onChange={event => setLocal(prev => ({ ...prev, continuousVoiceMode: event.target.checked }))}
            disabled={!voiceSupported || !local.voiceMode}
          />
          <span className="toggle-label">
            {local.continuousVoiceMode ? '开启' : '关闭'}
          </span>
        </div>
        <span className="setting-note">
          开启后：点一次开始即可持续听你提问，直接说人名会立即作为最终猜测
        </span>
      </div>

      <div className="settings-actions">
        <button className="btn-secondary" onClick={onClose}>取消</button>
        <button className="btn-primary" onClick={handleSave}>保存</button>
      </div>
    </div>
  )
}
