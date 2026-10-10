import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { ISupportService } from './support.service.interface';
import { TYPES } from '../../types';
import { BaseController } from '../common/base.controller';
import { ISupportController } from './support.controller.interface';
import { plainToInstance } from 'class-transformer';
import { SupportRequestDto } from './dto/supportRequest.dto';
import { ISessionRepository } from '../session/session.repository.interface';
import { validate } from 'class-validator';


@injectable()
export class SupportController extends BaseController implements ISupportController {
  constructor(
    @inject(TYPES.supportService) private supportService: ISupportService ,
  ) {
    super();
    this.bindRoute([
      {
        path: '/hello',
        method: 'get',
        func: this.getHello,
      },
      {
        path: '/support',
        method: 'post',
        func: this.supportRequest,
      },
      {
        path: '/orders',
        method: 'get',
        func: this.getOrders,
      },
    ]);
  }

  async getHello(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = "hello!";
      res.send(message);
    } catch (err) {
      next(err);
    }
  }

  async supportRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        console.log("Получен запрос")
        console.log(req.body)
        const requestData = plainToInstance(SupportRequestDto, req.body);
        const errors = await validate(requestData) 
        if (errors.length > 0) {
            res.status(400).json({ errors: errors.map(e => e.constraints) });
            return;
        }
        const answer = await this.supportService.handleSupportRequest(requestData);
        console.log(answer)
        res.send(answer);
    } catch (err) {
      next(err);
    }
  }

  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Number(req.query.userId);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        res.status(400).json({ error: 'A positive integer userId is required.' });
        return;
      }

      const orders = await this.supportService.getOrdersForUser(userId);
      res.json(orders.map((order) => ({
        id: order.id,
        orderComposition: order.orderComposition,
        status: order.status,
        deliveryDate: order.deliveryDate,
      })));
    } catch (err) {
      next(err);
    }
  }
}