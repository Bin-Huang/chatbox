import OpenAICompatible, { type OpenAICompatibleSettings } from '../../../models/openai-compatible'
import type { ModelDependencies } from '../../../types/adapters'
import { normalizeOpenAIApiHostAndPath } from '../../../utils/llm_utils'

interface Options extends OpenAICompatibleSettings {}

export default class LiteLLM extends OpenAICompatible {
  public name = 'LiteLLM'
  public options: Options

  constructor(options: Options, dependencies: ModelDependencies) {
    const apiHost = normalizeOpenAIApiHostAndPath({ apiHost: options.apiHost }).apiHost
    super({ ...options, apiHost }, dependencies)
    this.options = { ...options, apiHost }
  }
}
