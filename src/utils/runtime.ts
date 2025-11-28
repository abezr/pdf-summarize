import os from 'os';

/**
 * Detect if the process is running inside WSL.
 */
export function isWSL(): boolean {
  if (process.platform !== 'linux') {
    return false;
  }

  if (process.env.WSL_DISTRO_NAME) {
    return true;
  }

  const release = os.release().toLowerCase();
  return release.includes('microsoft') || release.includes('wsl');
}

/**
 * Decide whether to defer heavy, non-critical initialization.
 * Honors explicit env flags first, then falls back to WSL detection.
 */
export function shouldLazyInitHeavyModules(): boolean {
  if (process.env.LAZY_INIT_HEAVY === 'true') {
    return true;
  }
  if (process.env.LAZY_INIT_HEAVY === 'false') {
    return false;
  }

  return isWSL();
}

/**
 * Embeddings-specific lazy init toggle.
 */
export function shouldLazyInitEmbeddings(): boolean {
  if (process.env.LAZY_INIT_EMBEDDINGS === 'true') {
    return true;
  }
  if (process.env.LAZY_INIT_EMBEDDINGS === 'false') {
    return false;
  }

  return shouldLazyInitHeavyModules();
}

/**
 * Observability can be skipped in local/WSL to speed boot.
 */
export function shouldSkipObservability(): boolean {
  if (process.env.DISABLE_OBSERVABILITY === 'true') {
    return true;
  }
  if (process.env.DISABLE_OBSERVABILITY === 'false') {
    return false;
  }

  return shouldLazyInitHeavyModules();
}
