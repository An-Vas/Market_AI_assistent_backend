import { Router, Request, Response, NextFunction } from 'express';

export interface RouteDefinition {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  func: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

export abstract class BaseController {
  public readonly router: Router = Router();

  protected bindRoute(routes: RouteDefinition[]): void {
    for (const route of routes) {
      const handler = route.func.bind(this);
      this.router[route.method](route.path, handler);
    }
  }

  protected ok<T>(res: Response, data?: T): void {
    res.status(200).json(data ?? { success: true });
  }

  protected error(res: Response, message: string, code = 500): void {
    res.status(code).json({ error: message });
  }
}