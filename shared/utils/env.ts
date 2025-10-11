type EnvSource = Record<string, unknown>;

function getGlobalSource(): EnvSource | undefined {
  if (typeof globalThis !== 'undefined') {
    const candidate = (globalThis as any).__STORY_SCOUT_ENV__;
    if (candidate && typeof candidate === 'object') {
      return candidate as EnvSource;
    }
  }
  return undefined;
}

function getProcessSource(): EnvSource | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvSource;
  }
  return undefined;
}

export function getEnvValue(key: string): string | undefined {
  const sources: Array<EnvSource | undefined> = [getGlobalSource(), getProcessSource()];
  for (const source of sources) {
    if (!source) continue;
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export function setGlobalEnv(source: EnvSource) {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__STORY_SCOUT_ENV__ = source;
  }
}
