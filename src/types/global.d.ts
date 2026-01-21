
interface Window {
  ai?: {
    summarizer: {
      create: (options?: any) => Promise<any>;
      capabilities: () => Promise<any>;
    };
  };
}
