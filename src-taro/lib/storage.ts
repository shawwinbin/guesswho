import Taro from '@tarojs/taro'

export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const value = Taro.getStorageSync(key)
      return value ? value as T : null
    } catch {
      return null
    }
  },

  set: (key: string, value: unknown): void => {
    try {
      Taro.setStorageSync(key, value)
    } catch {
      // ignore
    }
  },

  remove: (key: string): void => {
    try {
      Taro.removeStorageSync(key)
    } catch {
      // ignore
    }
  },

  clear: (): void => {
    try {
      Taro.clearStorageSync()
    } catch {
      // ignore
    }
  }
}