
import { Request, Response, NextFunction } from 'express';

export interface ISupportController {
  getHello(req: Request, res: Response, next: NextFunction): Promise<void>
   
}