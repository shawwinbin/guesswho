import { View, Text } from '@tarojs/components'
import { YesNoAnswer } from '../lib/types'
import './components.scss'

interface AnswerBadgeProps {
  answer: YesNoAnswer
}

export function AnswerBadge({ answer }: AnswerBadgeProps) {
  return (
    <View className={`answer-badge ${answer === '是' ? 'yes' : 'no'}`}>
      <Text className="badge-text">{answer}</Text>
    </View>
  )
}

