interface WechatSessionResponse {
  openid: string
  session_key: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export class AuthService {
  private appId: string
  private appSecret: string

  constructor() {
    this.appId = process.env.WECHAT_APPID || ''
    this.appSecret = process.env.WECHAT_SECRET || ''
  }

  async loginWithCode(code: string): Promise<{ openid: string; isNewUser: boolean }> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`
    const res = await fetch(url)
    const data = await res.json() as WechatSessionResponse
    if (data.errcode) {
      throw new Error(`微信登录失败: ${data.errmsg}`)
    }
    return { openid: data.openid, isNewUser: true }
  }
}

export function createAuthService(): AuthService {
  return new AuthService()
}