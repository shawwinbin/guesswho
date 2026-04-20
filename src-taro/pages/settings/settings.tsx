import { View, Text } from '@tarojs/components'
import { Cell, CellGroup, Switch, Input, Button, Dialog, Toast } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { storage } from '../../lib/storage'
import { platform } from '../../utils/platform'
import type { GameSettings } from '../../lib/types'
import './settings.scss'

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
    const saved = storage.get<GameSettings>('game-settings')
    if (saved) setSettings(saved)
    const openid = storage.get<string>('wechat-openid')
    if (openid) {
      setIsLoggedIn(true)
      const savedUser = storage.get<{ nickName?: string; avatarUrl?: string }>('wechat-userinfo')
      if (savedUser) setUserInfo(savedUser)
    }
  }, [])

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    storage.set('game-settings', newSettings)
    Toast.show('设置已保存')
  }

  const handleLogin = async () => {
    if (!platform.isWeapp) { Toast.show('仅小程序支持微信登录'); return }
    try {
      const { code } = await Taro.login()
      // TODO: call backend /v1/auth/wechat
      const userInfoRes = await Taro.getUserInfo()
      setUserInfo(userInfoRes.userInfo)
      storage.set('wechat-userinfo', userInfoRes.userInfo)
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
        storage.remove('wechat-openid')
        storage.remove('wechat-userinfo')
        setIsLoggedIn(false)
        setUserInfo(null)
        Toast.show('已退出登录')
      }
    })
  }

  const handleClearData = () => {
    Dialog.confirm({
      title: '清除数据',
      content: '确定要清除所有本地数据吗？',
      onConfirm: () => {
        storage.clear()
        setSettings(DEFAULT_SETTINGS)
        setIsLoggedIn(false)
        setUserInfo(null)
        Toast.show('数据已清除')
      }
    })
  }

  return (
    <View className="settings-page">
      <CellGroup title="游戏设置">
        <Cell title="提问次数上限" extra={
          <Input
            value={settings.questionLimit.toString()}
            type="number"
            style={{ width: '100px' }}
            onChange={(val) => updateSetting('questionLimit', parseInt(val, 10) || 20)}
          />
        } />
        <Cell
          title="语音播报"
          extra={<Switch checked={settings.voiceMode} onChange={(val) => updateSetting('voiceMode', val)} />}
        />
      </CellGroup>
      {platform.isWeapp && (
        <CellGroup title="微信登录">
          {isLoggedIn && userInfo ? (
            <Cell title={userInfo.nickName || '已登录'} />
          ) : (
            <Cell title="点击登录" onClick={handleLogin} />
          )}
          {isLoggedIn && <Cell title="退出登录" onClick={handleLogout} />}
        </CellGroup>
      )}
      <CellGroup title="其他">
        <Cell title="清除本地数据" onClick={handleClearData} />
      </CellGroup>
      <View className="settings-footer">
        <Button type="default" onClick={() => Taro.navigateBack()}>返回</Button>
      </View>
    </View>
  )
}