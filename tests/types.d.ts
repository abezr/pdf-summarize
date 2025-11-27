declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        wait: (ms: number) => Promise<void>;
        withTimeout: <T>(promise: Promise<T>, timeoutMs?: number) => Promise<T>;
      };
    }
  }
}

export {};
