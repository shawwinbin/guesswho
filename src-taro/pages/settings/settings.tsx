import { View, Text } from '@tarojs/components'
import { Cell, CellGroup, Switch, Button } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './settings.scss'

export default function SettingsPage() {
  const handleBack = () => Taro.navigateBack()
  return (
    <View className="settings-page">
      <CellGroup title="游戏设置">
        <Cell title="语音播报" extra={<Switch checked />} />
        <Cell title="语音输入" extra={<Switch checked />} />
      </CellGroup>
      <CellGroup title="账户">
        <Cell title="微信登录（待实现）" />
      </CellGroup>
      <View className="settings-actions">
        <Button type="default" onClick={handleBack}>返回</Button>
      </View>
    </View>
  )
}