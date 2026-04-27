import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { DEFAULT_GAME_SETTINGS, normalizeGameSettings } from '../../lib/gameRules'
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS)

  useEffect(() => {
    const saved = storage.get<GameSettings>(SETTINGS_STORAGE_KEY)
    if (saved) {
      const normalizedSettings = normalizeGameSettings(saved)
      setSettings(normalizedSettings)
      if (saved.questionLimit !== normalizedSettings.questionLimit) {
        storage.set(SETTINGS_STORAGE_KEY, normalizedSettings)
      }
    }
  }, [])

  const clearSessionOnly = () => {
    storage.remove(SESSION_STORAGE_KEY)
    storage.remove(SESSION_SAVED_AT_KEY)
    Taro.showToast({ title: '当前对局缓存已清除', icon: 'none' })
  }

  const handleClearData = () => {
    Taro.showModal({
      title: '清除数据',
      content: '确定要清除设置和关卡进度吗？',
      confirmText: '清除',
      success: result => {
        if (!result.confirm) return

        storage.remove(SETTINGS_STORAGE_KEY)
        storage.remove(WECHAT_OPENID_STORAGE_KEY)
        storage.remove(WECHAT_USERINFO_STORAGE_KEY)
        clearLevelProgress()
        storage.set(RESET_DATA_AT_KEY, Date.now())
        setSettings(DEFAULT_GAME_SETTINGS)
        Taro.showToast({ title: '数据已清除', icon: 'none' })
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
          <View className="settings-fixed-rule">
            <Text className="settings-fixed-rule__value">{`固定 ${settings.questionLimit} 次`}</Text>
            <Text className="settings-fixed-rule__hint">所有关卡提问次数一致，难度只由人物池递进。</Text>
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
