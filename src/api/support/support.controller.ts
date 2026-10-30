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
import { log } from '../common/trace';
import { requireSsoAuth } from '../common/auth.middleware';


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
        middlewares: [requireSsoAuth],
      },
      {
        path: '/orders',
        method: 'get',
        func: this.getOrders,
        middlewares: [requireSsoAuth],
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
        const requestData = plainToInstance(SupportRequestDto, req.body);
        requestData.userId = req.userId;
        const errors = await validate(requestData)
        if (errors.length > 0) {
            log(req.traceId, 'support request REJECTED (validation)');
            res.status(400).json({ errors: errors.map(e => e.constraints) });
            return;
        }
        const answer = await this.supportService.handleSupportRequest(requestData, req.traceId, req.ssoToken);
        res.send(answer);
    } catch (err) {
      next(err);
    }
  }

  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await this.supportService.getOrdersForUser(req.ssoToken);
      log(req.traceId, 'orders request', { userId: req.userId, count: orders.length });
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
