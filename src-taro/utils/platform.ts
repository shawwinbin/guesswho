export const platform = {
  isWeapp: process.env.TARO_ENV === 'weapp',
  isH5: process.env.TARO_ENV === 'h5',

  canUseLogin: process.env.TARO_ENV === 'weapp',
  canUseShare: process.env.TARO_ENV === 'weapp',
  canUseRecorder: process.env.TARO_ENV === 'weapp',
  canUseWebSpeech: process.env.TARO_ENV === 'h5'
}