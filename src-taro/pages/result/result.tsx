import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { figures } from '../../data/figures'
import {
  applyLevelResult,
  buildVisibleLevels,
  getLevelTitle,
  readLevelProgress,
  writeLevelProgress,
} from '../../lib/levelProgress'
import { storage } from '../../lib/storage'
import { GameSettings, HistoricalFigure, LevelProgress } from '../../lib/types'
import './result.scss'

const DEFAULT_SETTINGS: GameSettings = {
  questionLimit: 20,
  figureScope: 'all',
  voiceMode: false,
  continuousVoiceMode: false,
  autoStartContinuousVoice: false
}

function findFigure(name: string): HistoricalFigure | undefined {
  const normalizedName = name.trim().toLowerCase()

  return figures.find(figure => {
    const names = [figure.name, ...figure.aliases].map(item => item.trim().toLowerCase())
    return names.includes(normalizedName)
  })
}

function formatYear(year?: number): string | null {
  if (typeof year !== 'number') return null
  return year > 0 ? `${year}年` : `前${Math.abs(year)}年`
}

function buildFigureCaption(figure?: HistoricalFigure, fallbackName?: string): string {
  if (!figure) {
    return `${fallbackName || '这位历史人物'}的真实身份已经揭晓，再换个思路试试。`
  }

  const keywords = figure.keywords.slice(0, 2).join('、')
  const bornYear = formatYear(figure.bornYear)
  const diedYear = formatYear(figure.diedYear)
  const years = bornYear && diedYear ? `${bornYear} - ${diedYear}` : null

  if (years) {
    return `${figure.era}${figure.role}，活跃于${years}，与“${keywords}”密切相关。`
  }

  return `${figure.era}${figure.role}，与“${keywords}”密切相关。`
}

function buildHintItems(figure?: HistoricalFigure): string[] {
  if (!figure) {
    return ['从朝代切入', '先问身份类别', '再问代表事件']
  }

  return [
    `朝代线索：${figure.era}`,
    `身份线索：${figure.role}`,
    `关键词：${figure.keywords.slice(0, 3).join(' / ')}`
  ]
}

function parseCount(value?: string): number {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
}

function parseLevel(value: string | undefined, fallbackLevel: number): number {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallbackLevel
}

function buildResultProgress(storedProgress: LevelProgress, playedLevel: number, result: 'win' | 'lose'): LevelProgress {
  const highestUnlockedLevel = Math.max(storedProgress.highestUnlockedLevel, playedLevel)
  const baseProgress: LevelProgress = {
    ...storedProgress,
    currentLevel: playedLevel,
    highestUnlockedLevel,
    highestClearedLevel: Math.max(storedProgress.highestClearedLevel, Math.min(playedLevel - 1, highestUnlockedLevel - 1)),
  }
  const appliedProgress = applyLevelResult(baseProgress, result)
  const resolvedHighestUnlocked = Math.max(appliedProgress.highestUnlockedLevel, storedProgress.highestUnlockedLevel)
  const resumeLevel = result === 'win'
    ? Math.max(appliedProgress.currentLevel, storedProgress.highestUnlockedLevel)
    : Math.max(playedLevel, storedProgress.highestUnlockedLevel)

  return {
    currentLevel: Math.min(resumeLevel, resolvedHighestUnlocked),
    highestUnlockedLevel: resolvedHighestUnlocked,
    highestClearedLevel: Math.max(appliedProgress.highestClearedLevel, storedProgress.highestClearedLevel),
    levelStreak: appliedProgress.levelStreak,
    lastResult: appliedProgress.lastResult,
  }
}

export default function ResultPage() {
  const router = useRouter()
  const winnerParam = router.params.winner
  const nameParam = router.params.name
  const countParam = router.params.count
  const levelParam = router.params.level
  const isWinner = winnerParam === 'true'
  const revealedName = nameParam || '未知人物'
  const questionCount = parseCount(countParam)
  const resultType = isWinner ? 'win' : 'lose'
  const [showHints, setShowHints] = useState(false)
  const [progress, setProgress] = useState<LevelProgress>(() => {
    const storedProgress = readLevelProgress()
    const playedLevel = parseLevel(levelParam, storedProgress.currentLevel)
    return buildResultProgress(storedProgress, playedLevel, resultType)
  })
  const appliedResultKeyRef = useRef<string | null>(null)

  const settings = useMemo(() => storage.get<GameSettings>('game-settings') || DEFAULT_SETTINGS, [])
  const revealedFigure = useMemo(() => findFigure(revealedName), [revealedName])
  const figureCaption = useMemo(() => buildFigureCaption(revealedFigure, revealedName), [revealedFigure, revealedName])
  const hintItems = useMemo(() => buildHintItems(revealedFigure), [revealedFigure])
  const loseResultBadge = questionCount >= settings.questionLimit ? '机会用尽' : '猜错终局'
  const playedLevel = parseLevel(levelParam, progress.currentLevel)
  const resumeLevel = progress.currentLevel
  const progressTitle = getLevelTitle(resumeLevel)
  const progressBannerLabel = isWinner ? `第${playedLevel}关通关` : `第${playedLevel}关未通关`
  const progressMessage = isWinner
    ? (resumeLevel > playedLevel + 1 ? `当前已解锁至第${resumeLevel}关` : `已解锁第${resumeLevel}关`)
    : `已为你保留至第${resumeLevel}关`
  const primaryCtaLabel = isWinner ? `挑战第${resumeLevel}关` : `从第${resumeLevel}关继续`
  const ribbonLevels = buildVisibleLevels(progress, 2)

  useEffect(() => {
    const storedProgress = readLevelProgress()
    const nextPlayedLevel = parseLevel(levelParam, storedProgress.currentLevel)
    const nextProgress = buildResultProgress(storedProgress, nextPlayedLevel, resultType)
    const resultKey = `${resultType}:${nameParam || ''}:${countParam || ''}:${levelParam || ''}`

    setProgress(nextProgress)

    if (appliedResultKeyRef.current === resultKey) {
      return
    }

    appliedResultKeyRef.current = resultKey
    writeLevelProgress(nextProgress)
  }, [countParam, levelParam, nameParam, resultType])

  useEffect(() => {
    setShowHints(false)
  }, [isWinner, revealedName])

  const handleRestart = () => Taro.redirectTo({ url: '/pages/game/game' })
  const handleBackHome = () => Taro.redirectTo({ url: '/pages/index/index' })

  return (
    <View className="result-page mini-game-page">
      <View className="result-topbar">
        <View className="result-topbar__back" onClick={handleBackHome}>
          <Text className="result-topbar__back-icon">←</Text>
        </View>
        <Text className="result-topbar__brand">Guofeng Play</Text>
        <View className="result-topbar__spacer" />
      </View>

      <View className={`result-headline ${isWinner ? 'is-winner' : 'is-loser'}`}>
        <Text className="result-headline__title">{isWinner ? '机智如你!' : '差一点就猜中了！'}</Text>
        <Text className="result-headline__subtitle">{isWinner ? '恭喜过关' : '再接再厉，真相就在眼前'}</Text>
      </View>

      <View className={`result-progress mg-card ${isWinner ? 'is-winner' : 'is-loser'}`}>
        <View className="result-progress__summary">
          <View className={`result-progress__badge ${isWinner ? 'is-winner' : 'is-loser'}`}>
            <Text className="result-progress__badge-text">{progressBannerLabel}</Text>
          </View>
          <Text className="result-progress__title">{progressMessage}</Text>
          <Text className="result-progress__subtitle">{`当前阶段：${progressTitle}`}</Text>
        </View>
        <View className="result-level-ribbon">
          {ribbonLevels.map(level => {
            const isCurrent = level === resumeLevel
            const isCleared = level <= progress.highestClearedLevel

            return (
              <View
                key={level}
                className={[
                  'result-level-ribbon__item',
                  isCurrent ? 'result-level-ribbon__item--current' : '',
                  isCleared ? 'result-level-ribbon__item--cleared' : 'result-level-ribbon__item--open',
                ].filter(Boolean).join(' ')}
              >
                <Text className="result-level-ribbon__level">{`第${level}关`}</Text>
                <Text className="result-level-ribbon__state">
                  {isCurrent ? (isWinner ? '下一关' : '继续') : isCleared ? '已通关' : '已解锁'}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      <View className={`result-card mg-card ${isWinner ? 'is-winner' : 'is-loser'}`}>
        {isWinner ? (
          <View className="win-section">
            <View className="result-stamp">通关</View>
            <View className="result-portrait" />
            <View className="figure-name-pill">
              <Text className="figure-name">{revealedName}</Text>
            </View>
          </View>
        ) : (
          <View className="lose-section">
            <View className="lose-figure-card">
              <View className="lose-figure-card__stamp">败犹荣</View>
              <View className="lose-figure-card__medallion">
                <View className="lose-figure-card__medallion-ring">
                  <Text className="lose-figure-card__era">{revealedFigure?.era || '历史人物'}</Text>
                  <View className="lose-figure-card__silhouette">
                    <View className="lose-figure-card__silhouette-head" />
                    <View className="lose-figure-card__silhouette-body" />
                  </View>
                </View>
              </View>
              <View className="figure-name-pill figure-name-pill--soft figure-name-pill--lose">
                <Text className="figure-name">{revealedName}</Text>
              </View>
              <Text className="lose-figure-card__meta">{`${revealedFigure?.era || '历史'} · ${revealedFigure?.role || '名士'}`}</Text>
              <Text className="lose-figure-card__caption">{figureCaption}</Text>
            </View>

            <View className="lose-stat-card">
              <View className="lose-stat-card__copy">
                <Text className="lose-stat-card__label">提问次数</Text>
                <Text className="lose-stat-card__value">{`${questionCount}/${settings.questionLimit}`}</Text>
              </View>
              <View className="lose-stat-card__badge">
                <Text className="lose-stat-card__badge-text">{loseResultBadge}</Text>
              </View>
            </View>
          </View>
        )}

        {isWinner && (
          <View className="result-stats">
            <View className="result-stat">
              <Text className="result-stat__icon">◔</Text>
              <Text className="result-stat__label">用时</Text>
              <Text className="result-stat__value">01:24</Text>
            </View>
            <View className="result-stat">
              <Text className="result-stat__icon">◉</Text>
              <Text className="result-stat__label">线索消耗</Text>
              <Text className="result-stat__value">{`${Math.max(questionCount, 1)}/5`}</Text>
            </View>
          </View>
        )}

        {isWinner && (
          <View className="reward-strip">
            <View className="reward-chip reward-chip--coin">
              <Text>🪙 +50</Text>
            </View>
            <View className="reward-chip reward-chip--badge">
              <Text>✹ +1</Text>
            </View>
          </View>
        )}
      </View>

      <View className="result-actions">
        <View className={`mg-primary-button result-primary-button ${isWinner ? 'result-primary-button--win' : ''}`} onClick={handleRestart}>
          <Text className="result-primary-button__icon">{isWinner ? '➜' : '↻'}</Text>
          <Text className="result-primary-button__text">{primaryCtaLabel}</Text>
        </View>
        <View className="result-secondary-actions">
          <View className="mg-secondary-button result-secondary-button" onClick={handleBackHome}>
            <Text className="result-secondary-button__text">返回首页</Text>
          </View>
          {isWinner ? (
            <View className="result-share-button">
              <Text className="result-share-button__text">分享成就</Text>
            </View>
          ) : (
            <View className="result-share-button result-share-button--gold" onClick={() => setShowHints(prev => !prev)}>
              <Text className="result-share-button__text result-share-button__text--dark">{showHints ? '收起提示' : '查看提示'}</Text>
            </View>
          )}
        </View>
      </View>

      {!isWinner && showHints && (
        <View className="lose-hints mg-card">
          <Text className="lose-hints__title">下局可以这样问</Text>
          {hintItems.map((hint, index) => (
            <View key={index} className="lose-hints__item">
              <Text className="lose-hints__index">{`${index + 1}`}</Text>
              <Text className="lose-hints__text">{hint}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

ResultPage.useShareAppMessage = () => ({
  title: '我猜出了历史人物！来挑战吧',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})
