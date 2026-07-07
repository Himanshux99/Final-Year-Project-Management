// Augment Express namespace to include user property with userId and email
declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
    }
  }
}

export {};
