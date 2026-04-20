import { z } from 'zod'

export const wechatLoginSchema = z.object({
  code: z.string().min(1, 'code 不能为空')
})

export type WechatLoginRequest = z.infer<typeof wechatLoginSchema>

export const wechatLoginResponseSchema = z.object({
  openid: z.string(),
  isNewUser: z.boolean()
})

export type WechatLoginResponse = z.infer<typeof wechatLoginResponseSchema>