declare global {
  interface Window {
    __runningAsExtension__: boolean;
  }
}

export {};
