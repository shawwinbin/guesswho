interface RequestOptions extends RequestInit {
  bodyJson?: unknown
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { bodyJson, headers, ...rest } = options

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: bodyJson !== undefined ? JSON.stringify(bodyJson) : rest.body,
  })

  if (!response.ok) {
    let message = `请求失败: ${response.status}`

    try {
      const errorData = await response.json()
      message = errorData?.error?.message || message
    } catch {
      // Ignore parse errors
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}
