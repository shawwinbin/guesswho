import { View, Text, Image } from '@tarojs/components'
import { Dialog, Toast } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { storage } from '../../lib/storage'
import { clearLevelProgress } from '../../lib/levelProgress'
import { platform } from '../../utils/platform'
import { GameSettings } from '../../lib/types'
import './settings.scss'

const SETTINGS_STORAGE_KEY = 'game-settings'
const SESSION_STORAGE_KEY = 'history-figure-guess-session'
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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState<{ nickName?: string; avatarUrl?: string } | null>(null)

  useEffect(() => {
    const saved = storage.get<GameSettings>(SETTINGS_STORAGE_KEY)
    if (saved) setSettings(saved)

    const openid = storage.get<string>(WECHAT_OPENID_STORAGE_KEY)
    if (!openid) return

    setIsLoggedIn(true)
    const savedUser = storage.get<{ nickName?: string; avatarUrl?: string }>(WECHAT_USERINFO_STORAGE_KEY)
    if (savedUser) setUserInfo(savedUser)
  }, [])

  const clearSessionOnly = () => {
    storage.remove(SESSION_STORAGE_KEY)
    Toast.show('当前对局缓存已清除')
  }

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    storage.set(SETTINGS_STORAGE_KEY, newSettings)
    Toast.show('设置已保存')
  }

  const handleLogin = async () => {
    if (!platform.isWeapp) {
      Toast.show('仅小程序支持微信登录')
      return
    }

    try {
      await Taro.login()
      const userInfoRes = await Taro.getUserInfo()
      setUserInfo(userInfoRes.userInfo)
      storage.set(WECHAT_USERINFO_STORAGE_KEY, userInfoRes.userInfo)
      setIsLoggedIn(true)
      Toast.show('登录成功')
    } catch {
      Toast.show('登录失败')
    }
  }

  const handleLogout = () => {
    Dialog.confirm({
      title: '退出登录',
      content: '确定要退出登录吗？',
      onConfirm: () => {
        storage.remove(WECHAT_OPENID_STORAGE_KEY)
        storage.remove(WECHAT_USERINFO_STORAGE_KEY)
        setIsLoggedIn(false)
        setUserInfo(null)
        Toast.show('已退出登录')
      }
    })
  }

  const handleClearData = () => {
    Dialog.confirm({
      title: '清除数据',
      content: '确定要清除设置、登录信息、当前对局和关卡进度吗？',
      onConfirm: () => {
        storage.remove(SETTINGS_STORAGE_KEY)
        storage.remove(WECHAT_OPENID_STORAGE_KEY)
        storage.remove(WECHAT_USERINFO_STORAGE_KEY)
        storage.remove(SESSION_STORAGE_KEY)
        clearLevelProgress()
        setSettings(DEFAULT_SETTINGS)
        setIsLoggedIn(false)
        setUserInfo(null)
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

        <View className="settings-row">
          <View className="settings-row__meta">
            <View className="settings-row__badge settings-row__badge--pink">◉</View>
            <Text className="settings-row__label">语音播报</Text>
          </View>
          <View className={`settings-switch ${settings.voiceMode ? 'is-on' : ''}`} onClick={() => updateSetting('voiceMode', !settings.voiceMode)}>
            <View className="settings-switch__thumb" />
          </View>
        </View>
      </View>

      <View className="settings-group mg-card">
        <View className="settings-group__title-row">
          <Text className="settings-group__title-icon">◉</Text>
          <Text className="settings-group__title">账户与安全</Text>
        </View>

        <View className="account-card">
          <View className="account-card__left">
            {userInfo?.avatarUrl ? (
              <Image className="account-card__avatar" src={userInfo.avatarUrl} />
            ) : (
              <View className="account-card__avatar account-card__avatar--placeholder">
                <Text className="account-card__avatar-text">人</Text>
              </View>
            )}
            <View>
              <Text className="account-card__name">微信登录</Text>
              <Text className="account-card__status">
                {isLoggedIn ? '● 已绑定' : platform.isWeapp ? '● 未绑定' : '● 仅小程序支持'}
              </Text>
            </View>
          </View>
          <View className="account-card__action" onClick={isLoggedIn ? handleLogout : handleLogin}>
            <Text className="account-card__action-text">{isLoggedIn ? '解绑' : '登录'}</Text>
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
          <Text className="settings-big-button__text">重置数据（设置/登录/关卡）</Text>
        </View>
      </View>

      <View className="mg-bottom-dock">
        {[
          { key: 'home', label: 'HOME', icon: '⌂' },
          { key: 'riddles', label: 'RIDDLES', icon: '⌘' },
          { key: 'shop', label: 'SHOP', icon: '▤' },
          { key: 'settings', label: 'SETTING', icon: '⚙', active: true }
        ].map((item) => (
          <View key={item.key} className={`mg-dock-item ${item.active ? 'mg-dock-item--active' : ''}`}>
            <Text className="mg-dock-item__icon">{item.icon}</Text>
            <Text className="mg-dock-item__label">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
