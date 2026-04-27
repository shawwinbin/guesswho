import { View, Text } from '@tarojs/components'
import { Dialog, Toast } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { storage } from '../../lib/storage'
import { clearLevelProgress } from '../../lib/levelProgress'
import { GameSettings } from '../../lib/types'
import './settings.scss'

const SETTINGS_STORAGE_KEY = 'game-settings'
const SESSION_STORAGE_KEY = 'history-figure-guess-session'
const SESSION_SAVED_AT_KEY = 'history-figure-guess-session-saved-at'
const RESET_DATA_AT_KEY = 'history-figure-guess-reset-data-at'
const WECHAT_OPENID_STORAGE_KEY = 'wechat-openid'
const WECHAT_USERINFO_STORAGE_KEY = 'wechat-userinfo'

const DEFAULT_SETTINGS: GameSettings = {
  questionLimit: 20,
  figureScope: 'all',
  voiceMode: false,
  continuousVoiceMode: false,
  autoStartContinuousVoice: false
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const saved = storage.get<GameSettings>(SETTINGS_STORAGE_KEY)
    if (saved) setSettings(saved)
  }, [])

  const clearSessionOnly = () => {
    storage.remove(SESSION_STORAGE_KEY)
    storage.remove(SESSION_SAVED_AT_KEY)
    Toast.show('当前对局缓存已清除')
  }

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    storage.set(SETTINGS_STORAGE_KEY, newSettings)
    Toast.show('设置已保存')
  }

  const handleClearData = () => {
    Dialog.confirm({
      title: '清除数据',
      content: '确定要清除设置和关卡进度吗？',
      onConfirm: () => {
        storage.remove(SETTINGS_STORAGE_KEY)
        storage.remove(WECHAT_OPENID_STORAGE_KEY)
        storage.remove(WECHAT_USERINFO_STORAGE_KEY)
        clearLevelProgress()
        storage.set(RESET_DATA_AT_KEY, Date.now())
        setSettings(DEFAULT_SETTINGS)
        Toast.show('数据已清除')
      }
    })
  }

  return (
    <View className="settings-page mini-game-page">
      <View className="settings-header">
        <View className="settings-back" onClick={() => Taro.navigateBack()}>
          <Text className="settings-back__icon">←</Text>
        </View>
        <Text className="settings-header__title">设置</Text>
        <View className="settings-header__spacer" />
      </View>

      <View className="settings-group mg-card">
        <View className="settings-group__title-row">
          <Text className="settings-group__title-icon">☞</Text>
          <Text className="settings-group__title">游戏设置</Text>
        </View>

        <View className="settings-row">
          <View className="settings-row__meta">
            <View className="settings-row__badge">≣</View>
            <Text className="settings-row__label">提问上限</Text>
          </View>
          <View className="settings-segmented">
            {[20, 30].map((count) => (
              <View
                key={count}
                className={`settings-segmented__item ${settings.questionLimit === count ? 'is-active' : ''}`}
                onClick={() => updateSetting('questionLimit', count)}
              >
                <Text className="settings-segmented__text">{`${count}次`}</Text>
              </View>
            ))}
          </View>
        </View>

      </View>

      <View className="settings-group mg-card">
        <View className="settings-group__title-row">
          <Text className="settings-group__title-icon">▣</Text>
          <Text className="settings-group__title">数据管理</Text>
        </View>

        <View className="settings-big-button settings-big-button--gold" onClick={clearSessionOnly}>
          <Text className="settings-big-button__icon">🗑</Text>
          <Text className="settings-big-button__text">清除缓存（仅当前对局）</Text>
        </View>

        <View className="settings-big-button settings-big-button--danger" onClick={handleClearData}>
          <Text className="settings-big-button__icon">✖</Text>
          <Text className="settings-big-button__text">重置数据（设置/关卡）</Text>
        </View>
      </View>
    </View>
  )
}
