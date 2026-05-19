import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type LLMRole = 'system' | 'user' | 'assistant'

export interface LLMMessage {
  role: LLMRole
  content: string
}

export interface LLMCompletionOptions {
  model: string
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  responseFormat?: 'text' | 'json'
}

export interface LLMCompletion {
  content: string
  inputTokens?: number
  outputTokens?: number
  rawModel?: string
}

export interface LLMProvider {
  readonly name: string
  complete(messages: LLMMessage[], options: LLMCompletionOptions): Promise<LLMCompletion>
}

function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v || v.trim() === '') {
    throw new Error(
      `${key} is not configured. Add it to Replit Secrets, or pick a different provider for this agent at /admin/agents.`,
    )
  }
  return v
}

function splitSystem(messages: LLMMessage[]): { system: string; rest: LLMMessage[] } {
  const systemParts: string[] = []
  const rest: LLMMessage[] = []
  for (const m of messages) {
    if (m.role === 'system') systemParts.push(m.content)
    else rest.push(m)
  }
  return { system: systemParts.join('\n\n'), rest }
}

// ─── Anthropic ────────────────────────────────
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private client: Anthropic
  constructor() {
    this.client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') })
  }
  async complete(messages: LLMMessage[], options: LLMCompletionOptions): Promise<LLMCompletion> {
    const { system, rest } = splitSystem(messages)
    const res = await this.client.messages.create(
      {
        model: options.model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature,
        system: system || undefined,
        messages: rest.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      },
      options.timeoutMs ? { timeout: options.timeoutMs } : undefined,
    )
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    return {
      content: text,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      rawModel: res.model,
    }
  }
}

// ─── OpenAI-compatible base ────────────────────
class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    public readonly name: string,
    protected client: OpenAI,
  ) {}
  async complete(messages: LLMMessage[], options: LLMCompletionOptions): Promise<LLMCompletion> {
    const res = await this.client.chat.completions.create(
      {
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        response_format:
          options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      options.timeoutMs ? { timeout: options.timeoutMs } : undefined,
    )
    const choice = res.choices[0]
    return {
      content: choice?.message?.content ?? '',
      inputTokens: res.usage?.prompt_tokens,
      outputTokens: res.usage?.completion_tokens,
      rawModel: res.model,
    }
  }
}

// ─── OpenAI ───────────────────────────────────
export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor() {
    super('openai', new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') }))
  }
}

// ─── Groq ─────────────────────────────────────
export class GroqProvider implements LLMProvider {
  readonly name = 'groq'
  private client: Groq
  constructor() {
    this.client = new Groq({ apiKey: requireEnv('GROQ_API_KEY') })
  }
  async complete(messages: LLMMessage[], options: LLMCompletionOptions): Promise<LLMCompletion> {
    const res = await this.client.chat.completions.create(
      {
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        response_format:
          options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      options.timeoutMs ? { timeout: options.timeoutMs } : undefined,
    )
    const choice = res.choices[0]
    return {
      content: choice?.message?.content ?? '',
      inputTokens: res.usage?.prompt_tokens,
      outputTokens: res.usage?.completion_tokens,
      rawModel: res.model,
    }
  }
}

// ─── Google Generative AI ─────────────────────
export class GoogleProvider implements LLMProvider {
  readonly name = 'google'
  private client: GoogleGenerativeAI
  constructor() {
    this.client = new GoogleGenerativeAI(requireEnv('GOOGLE_AI_API_KEY'))
  }
  async complete(messages: LLMMessage[], options: LLMCompletionOptions): Promise<LLMCompletion> {
    const { system, rest } = splitSystem(messages)
    const model = this.client.getGenerativeModel({
      model: options.model,
      systemInstruction: system || undefined,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
        responseMimeType: options.responseFormat === 'json' ? 'application/json' : undefined,
      },
    })
    const res = await model.generateContent({
      contents: rest.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    })
    const text = res.response.text()
    const usage = res.response.usageMetadata
    return {
      content: text,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      rawModel: options.model,
    }
  }
}

// ─── Together (OpenAI-compatible) ─────────────
export class TogetherProvider extends OpenAICompatibleProvider {
  constructor() {
    super(
      'together',
      new OpenAI({
        apiKey: requireEnv('TOGETHER_API_KEY'),
        baseURL: 'https://api.together.xyz/v1',
      }),
    )
  }
}

// ─── Custom OpenAI-compatible endpoint ────────
export class CustomProvider extends OpenAICompatibleProvider {
  constructor() {
    super(
      'custom',
      new OpenAI({
        apiKey: requireEnv('CUSTOM_LLM_API_KEY'),
        baseURL: requireEnv('CUSTOM_LLM_BASE_URL'),
      }),
    )
  }
}

export type ProviderName = 'anthropic' | 'openai' | 'groq' | 'google' | 'together' | 'custom'
