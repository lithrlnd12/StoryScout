type EnvSource = Record<string, unknown>;

declare const process: any;

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
  try {
    if (typeof process !== 'undefined' && process?.env) {
      return process.env as EnvSource;
    }
  } catch {
    // process not available in this environment
  }
  return undefined;
}

function getViteSource(): EnvSource | undefined {
  // Vite exposes env vars via import.meta.env
  // This version is for web only - React Native doesn't support import.meta
  // Skip entirely in React Native environment
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return undefined;
  }

  // Use indirect access to avoid Hermes parse-time error
  // This prevents Hermes from even seeing "import.meta" during parsing
  try {
    // @ts-ignore
    const importMeta = typeof globalThis !== 'undefined' && (globalThis as any)['import.meta'];
    if (importMeta && importMeta.env) {
      return importMeta.env as EnvSource;
    }
  } catch (e) {
    // Not in Vite environment
  }
  return undefined;
}

export function getEnvValue(key: string): string | undefined {
  const sources: Array<EnvSource | undefined> = [getGlobalSource(), getViteSource(), getProcessSource()];
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
