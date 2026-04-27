import { Pool } from 'pg'

export function createDbPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    ssl: false,
    // 禁用所有 SSL 相关选项
    allowExitOnIdle: false,
    // 使用简单的连接参数
    connectionTimeoutMillis: 5000,
  })
}
