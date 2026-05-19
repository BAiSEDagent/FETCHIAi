import {
  AnthropicProvider,
  CustomProvider,
  GoogleProvider,
  GroqProvider,
  LLMProvider,
  OpenAIProvider,
  ProviderName,
  TogetherProvider,
} from './providers'

const SUPPORTED: ReadonlySet<ProviderName> = new Set([
  'anthropic',
  'openai',
  'groq',
  'google',
  'together',
  'custom',
])

const cache = new Map<ProviderName, LLMProvider>()

export function isSupportedProvider(name: string): name is ProviderName {
  return SUPPORTED.has(name as ProviderName)
}

export function getProvider(name: string): LLMProvider {
  if (name === 'set-in-admin') {
    throw new Error(
      'Provider is unset for this agent. Configure provider + model at /admin/agents before invoking it.',
    )
  }
  if (!isSupportedProvider(name)) {
    throw new Error(
      `Unknown LLM provider "${name}". Supported: anthropic, openai, groq, google, together, custom.`,
    )
  }
  const cached = cache.get(name)
  if (cached) return cached
  let instance: LLMProvider
  switch (name) {
    case 'anthropic':
      instance = new AnthropicProvider()
      break
    case 'openai':
      instance = new OpenAIProvider()
      break
    case 'groq':
      instance = new GroqProvider()
      break
    case 'google':
      instance = new GoogleProvider()
      break
    case 'together':
      instance = new TogetherProvider()
      break
    case 'custom':
      instance = new CustomProvider()
      break
  }
  cache.set(name, instance)
  return instance
}

export function _resetProviderCacheForTests() {
  cache.clear()
}
