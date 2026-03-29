export interface RuntimeCapabilities {
  structuredOutput: boolean;
  streaming: boolean;
  tools: boolean;
  localExecution: boolean;
}

export interface RuntimeIdentity {
  adapter: string;
  provider?: string;
  model?: string;
  version: string;
}

export interface RuntimeTaskSpec {
  type: string;
  input: Record<string, unknown>;
}

export interface RuntimeResult {
  output: Record<string, unknown>;
  rawText?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface RuntimeAdapter {
  getIdentity(): RuntimeIdentity;
  getCapabilities(): RuntimeCapabilities;
  executeTask(
    task: RuntimeTaskSpec,
    contextBundle: Record<string, unknown>,
    policyBundle: Record<string, unknown>,
  ): Promise<RuntimeResult>;
}
