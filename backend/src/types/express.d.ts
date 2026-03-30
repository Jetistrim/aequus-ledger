export {};

declare global {
  namespace Express {
    interface Request {
      authUser?: string;
    }
  }
}
