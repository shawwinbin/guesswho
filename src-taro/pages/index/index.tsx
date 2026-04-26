import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { buildVisibleLevels, getLevelHint, getLevelTitle, readLevelProgress, setCurrentLevel } from '../../lib/levelProgress'
import type { LevelProgress } from '../../lib/types'
import './index.scss'

const DOCK_ITEMS = [
  { key: 'home', label: 'Home', icon: '⌂', active: true },
  { key: 'history', label: 'History', icon: '⌘' },
  { key: 'honor', label: 'Honor', icon: '✦' },
  { key: 'vault', label: 'Vault', icon: '▣' }
]

function buildRibbonLevels(progress: LevelProgress): number[] {
  const visibleUnlocked = buildVisibleLevels(progress, 2)
  const ribbonLevels = [...visibleUnlocked]
  let nextLevel = (visibleUnlocked[visibleUnlocked.length - 1] ?? progress.currentLevel) + 1

  while (ribbonLevels.length < 5) {
    ribbonLevels.push(nextLevel)
    nextLevel += 1
  }

  return ribbonLevels
}

export default function IndexPage() {
  const [progress, setProgress] = useState(() => readLevelProgress())

  const handleStart = () => Taro.navigateTo({ url: '/pages/game/game' })
  const handleSettings = () => Taro.navigateTo({ url: '/pages/settings/settings' })
  const handleLevelSelect = (level: number) => {
    if (level > progress.highestUnlockedLevel) return
    setProgress(setCurrentLevel(level))
  }

  const levelTitle = getLevelTitle(progress.currentLevel)
  const levelHint = getLevelHint(progress.currentLevel)
  const ribbonLevels = buildRibbonLevels(progress)

  return (
    <View className="index-page mini-game-page">
      <View className="index-topbar">
        <View className="profile-chip">
          <Text className="profile-chip__icon">◎</Text>
          <Text className="profile-chip__label">Scholar Profile</Text>
        </View>
        <Text className="index-brand">
          <Text className="index-brand__main">GUOFENG</Text>
          <Text className="index-brand__sub"> PLAY</Text>
        </Text>
        <View className="mg-icon-button" onClick={handleSettings}>
          <Text className="index-gear">⚙</Text>
        </View>
      </View>

      <View className="hero-stack">
        <View className="hero-cloud hero-cloud--left">
          <Text>☁</Text>
          <Text>☁</Text>
        </View>
        <View className="hero-cloud hero-cloud--right">
          <Text>☁</Text>
          <Text>☁</Text>
        </View>

        <View className="hero-seal">
          <Text className="hero-seal__prefix">那些年</Text>
          <Text className="hero-seal__text">秘藏</Text>
        </View>

        <View className="hero-card mg-card">
          <View className="hero-card__pins">
            <Text>•</Text>
            <Text>•</Text>
          </View>
          <View className="hero-card__paper">
            <View className="hero-card__corners hero-card__corners--lt" />
            <View className="hero-card__corners hero-card__corners--rt" />
            <View className="hero-card__corners hero-card__corners--lb" />
            <View className="hero-card__corners hero-card__corners--rb" />
            <Text className="hero-card__question hero-card__question--lt">?</Text>
            <Text className="hero-card__question hero-card__question--rt">?</Text>
            <Text className="hero-card__question hero-card__question--rb">?</Text>
            <View className="hero-card__stage">
              <View className="hero-card__lantern hero-card__lantern--left" />
              <View className="hero-card__lantern hero-card__lantern--right" />
              <View className="hero-card__portrait">
                <View className="hero-card__halo" />
                <View className="hero-card__silhouette hero-card__silhouette--hat" />
                <View className="hero-card__silhouette hero-card__silhouette--head" />
                <View className="hero-card__silhouette hero-card__silhouette--body" />
                <View className="hero-card__silhouette hero-card__silhouette--base" />
              </View>
            </View>
            <Text className="hero-card__title">{levelTitle}阶段</Text>
            <Text className="hero-card__hint">{levelHint}</Text>
            <View className="hero-card__badge">
              <Text className="hero-card__badge-text">第{progress.currentLevel}关</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="level-progress-card mg-card">
        <View className="level-progress-card__summary">
          <View className="level-progress-card__pill level-progress-card__pill--warm">
            <Text className="level-progress-card__label">已通关</Text>
            <Text className="level-progress-card__value">{progress.highestClearedLevel} 关</Text>
          </View>
          <View className="level-progress-card__pill">
            <Text className="level-progress-card__label">已解锁</Text>
            <Text className="level-progress-card__value">{progress.highestUnlockedLevel} 关</Text>
          </View>
        </View>
        <View className="level-ribbon">
          {ribbonLevels.map((level) => {
            const isUnlocked = level <= progress.highestUnlockedLevel
            const isActive = level === progress.currentLevel
            const isCleared = level <= progress.highestClearedLevel

            return (
              <View
                key={level}
                className={[
                  'level-ribbon__item',
                  isUnlocked ? 'level-ribbon__item--unlocked' : 'level-ribbon__item--locked',
                  isActive ? 'level-ribbon__item--active' : '',
                  isCleared ? 'level-ribbon__item--cleared' : '',
                ].filter(Boolean).join(' ')}
                onClick={isUnlocked ? () => handleLevelSelect(level) : undefined}
              >
                <Text className="level-ribbon__level">第{level}关</Text>
                <Text className="level-ribbon__state">
                  {isActive ? '当前' : isUnlocked ? (isCleared ? '已通关' : '可重玩') : '未解锁'}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      <View className="mg-primary-button index-start-button" onClick={handleStart}>
        <Text className="index-start-button__spark index-start-button__spark--left">✦</Text>
        <Text className="index-start-button__arrow">▶</Text>
        <Text className="index-start-button__text">继续第{progress.currentLevel}关</Text>
        <Text className="index-start-button__spark index-start-button__spark--right">✦</Text>
      </View>

      <View className="index-secondary-row">
        <View className="mg-secondary-button index-secondary-card">
          <Text className="index-secondary-card__icon">👥</Text>
          <Text className="index-secondary-card__text">邀请好友</Text>
        </View>
        <View className="mg-icon-button index-secondary-settings" onClick={handleSettings}>
          <Text className="index-gear">⚙</Text>
        </View>
      </View>

      <View className="challenge-card mg-card mg-card--gold">
        <View className="challenge-card__left">
          <View className="challenge-card__coin">Q</View>
          <View>
            <Text className="challenge-card__title">今日挑战</Text>
            <Text className="challenge-card__desc">纵横史册仅仅 4 次</Text>
          </View>
        </View>
        <View className="challenge-card__action" onClick={handleStart}>
          <Text className="challenge-card__action-text">去挑战</Text>
        </View>
      </View>

      <View className="index-stats">
        <View className="stat-card mg-card">
          <Text className="stat-card__label">连胜记录</Text>
          <Text className="stat-card__value stat-card__value--hot">5</Text>
          <Text className="stat-card__suffix">次</Text>
        </View>
        <View className="stat-card mg-card">
          <Text className="stat-card__label">我的图鉴</Text>
          <Text className="stat-card__value">12/108</Text>
        </View>
      </View>

      <View className="mg-bottom-dock">
        {DOCK_ITEMS.map((item) => (
          <View key={item.key} className={`mg-dock-item ${item.active ? 'mg-dock-item--active' : ''}`}>
            <View className="mg-dock-item__icon-shell">
              <Text className="mg-dock-item__icon">{item.icon}</Text>
            </View>
            <Text className="mg-dock-item__label">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
