import { useCallback, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { buildVisibleLevels, getLevelHint, getLevelTitle, readLevelProgress, setCurrentLevel } from '../../lib/levelProgress'
import type { LevelProgress } from '../../lib/types'
import './index.scss'

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
  const syncProgress = useCallback(() => {
    setProgress(readLevelProgress())
  }, [])

  useDidShow(syncProgress)

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
        <Text className="profile-chip">第{progress.currentLevel}关</Text>
        <Text className="index-brand">
          <Text className="index-brand__main">历史人物</Text>
          <Text className="index-brand__sub">猜猜看</Text>
        </Text>
        <View className="mg-icon-button" onClick={handleSettings}>
          <Text className="index-gear">⚙</Text>
        </View>
      </View>

      <View className="hero-stack">
        <View className="hero-card mg-card">
          <View className="hero-card__paper">
            <View className="hero-card__stage">
              <View className="hero-card__portrait">
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
        <Text className="index-start-button__arrow">▶</Text>
        <Text className="index-start-button__text">继续第{progress.currentLevel}关</Text>
      </View>
    </View>
  )
}
