import { upstreamFailure } from '../lib/errors.js'
import {
  matchesFigureName,
  normalizeSecretFigure,
  normalizeYesNoAnswer,
  parseJsonObject,
  type SecretFigure,
  type YesNoAnswer,
} from '../lib/normalization.js'

export type FigureScope = 'all' | 'poet' | 'emperor' | 'military' | 'philosopher' | 'female' | 'tang-song'

export interface GuessVerdict {
  isCorrect: boolean
  revealedName: string
}

export type QuestionIntent =
  | { type: 'question' }
  | { type: 'guess'; guess: string }

export interface HostLlmService {
  startRound(params: { figureScope: FigureScope }): Promise<SecretFigure>
  answerQuestion(params: { question: string; figure: SecretFigure }): Promise<YesNoAnswer>
  judgeGuess(params: { guess: string; figure: SecretFigure }): Promise<GuessVerdict>
  classifyQuestionIntent(params: { question: string }): Promise<QuestionIntent>
}

interface CreateHostLlmServiceParams {
  baseUrl: string
  apiKey: string
  model: string
  fetchImpl?: typeof fetch
}

function buildScopeInstruction(scope: FigureScope): string {
  switch (scope) {
    case 'poet':
      return '只能从中国历史上的诗人中选择人物。'
    case 'emperor':
      return '只能从中国历史上的皇帝中选择人物。'
    case 'military':
      return '只能从中国历史上的军事人物中选择人物。'
    case 'philosopher':
      return '只能从中国历史上的思想家中选择人物。'
    case 'female':
      return '只能从中国历史上的女性人物中选择人物。'
    case 'tang-song':
      return '只能从唐朝或宋朝的中国历史人物中选择人物。'
    case 'all':
    default:
      return '从中国历史人物中选择一位真实存在的人物。'
  }
}

function buildChatUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

async function readAssistantContent(response: Response): Promise<string> {
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw upstreamFailure('上游模型没有返回有效内容')
  }

  return content
}

export function createHostLlmService({
  baseUrl,
  apiKey,
  model,
  fetchImpl = fetch,
}: CreateHostLlmServiceParams): HostLlmService {
  const requestHost = async (messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<string> => {
    const response = await fetchImpl(buildChatUrl(baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages,
      }),
    })

    if (!response.ok) {
      throw upstreamFailure(`上游模型请求失败: ${response.status}`)
    }

    return readAssistantContent(response)
  }

  return {
    async startRound({ figureScope }) {
      const content = await requestHost([
        {
          role: 'system',
          content: [
            '你是历史人物猜谜游戏的主持人。',
            buildScopeInstruction(figureScope),
            '请秘密选择一位人物，只返回 JSON：{"name":"人物名","aliases":["别名"],"era":"朝代"}。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: '现在开始新的一局，请选择人物并仅输出 JSON。',
        },
      ])

      const parsed = parseJsonObject(content)
      const figure = parsed ? normalizeSecretFigure(parsed) : null
      if (!figure) {
        throw upstreamFailure('上游模型没有返回可解析的人物信息')
      }

      return figure
    },

    async answerQuestion({ question, figure }) {
      const content = await requestHost([
        {
          role: 'system',
          content: [
            '你是历史人物猜谜游戏的主持人。',
            `秘密人物：${figure.name}；别名：${figure.aliases.join('、') || '无'}；朝代：${figure.era || '未知'}。`,
            '你只能回答“是”或“不是”，不要输出任何额外解释。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: question,
        },
      ])

      return normalizeYesNoAnswer(content)
    },

    async judgeGuess({ guess, figure }) {
      const content = await requestHost([
        {
          role: 'system',
          content: [
            '你是历史人物猜谜游戏的主持人。',
            `秘密人物：${figure.name}；别名：${figure.aliases.join('、') || '无'}；朝代：${figure.era || '未知'}。`,
            '判断玩家猜测是否正确，只返回 JSON：{"correct":true|false,"revealedName":"人物名"}。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: guess,
        },
      ])

      const parsed = parseJsonObject(content)
      if (parsed && typeof parsed.correct === 'boolean') {
        return {
          isCorrect: parsed.correct,
          revealedName: typeof parsed.revealedName === 'string' && parsed.revealedName.trim()
            ? parsed.revealedName.trim()
            : figure.name,
        }
      }

      return {
        isCorrect: matchesFigureName(guess, figure),
        revealedName: figure.name,
      }
    },

    async classifyQuestionIntent({ question }) {
      const content = await requestHost([
        {
          role: 'system',
          content: [
            '你是历史人物猜谜游戏的语义理解器。',
            '判断玩家输入是否是在猜最终人物答案，而不是询问人物属性、类别、朝代、职业或经历。',
            '如果是在猜最终人物答案，抽取人物名；否则判定为普通问题。',
            '只返回 JSON，格式必须是 {"type":"guess","guess":"人物名"} 或 {"type":"question"}。',
            '示例：是不是李白？ => {"type":"guess","guess":"李白"}。',
            '示例：他是诗人吗？ => {"type":"question"}。',
            '示例：他是不是中国人？ => {"type":"question"}。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: question,
        },
      ])

      const parsed = parseJsonObject(content)
      if (parsed?.type === 'guess' && typeof parsed.guess === 'string' && parsed.guess.trim()) {
        return {
          type: 'guess',
          guess: parsed.guess.trim(),
        }
      }

      return { type: 'question' }
    },
  }
}
