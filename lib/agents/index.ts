// Barrel for the 10 agent shells. Slugs match agent_registry rows.
export * as conversation from './conversation'
export * as signalDetection from './signalDetection'
export * as outreach from './outreach'
export * as deduplication from './deduplication'
export * as staleness from './staleness'
export * as enrichment from './enrichment'
export * as outcomeLearning from './outcomeLearning'
export * as qualityScoring from './qualityScoring'
export * as onboarding from './onboarding'
export * as notification from './notification'

export { runAgent } from './runner'
export type { RunAgentOptions, RunAgentResult } from './runner'
export { getProvider, isSupportedProvider } from './providerFactory'
export type {
  LLMProvider,
  LLMMessage,
  LLMCompletion,
  LLMCompletionOptions,
  ProviderName,
} from './providers'
