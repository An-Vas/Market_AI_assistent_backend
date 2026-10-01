import { Container } from 'inversify';
import { TYPES } from './types';
import { SupportController } from './api/support/support.controller';
import { SupportService } from './api/support/support.service';
import { SupportRepository } from './api/support/support.repository';
import { ISupportController } from './api/support/support.controller.interface';
import { ISupportService } from './api/support/support.service.interface';
import { ISupportRepository } from './api/support/support.repository.interface';
import {ISessionRepository} from './api/session/session.repository.interface';
import { SessionRepository } from './api/session/session.repository';
import { MessageRepository } from './api/messages/message.repository';
import { IMessageRepository } from './api/messages/message.repository.interface';
import { GatewayService } from './api/gateway/gateway.service';
import { IGatewayService } from './api/gateway/gateway.service.interface';
import { IOrderRepository } from './api/order/order.repository.interface';
import { OrderRepository } from './api/order/order.repository';

const container = new Container();

container.bind<ISupportController>(TYPES.supportController).to(SupportController);
container.bind<ISupportService>(TYPES.supportService).to(SupportService);
container.bind<ISupportRepository>(TYPES.supportRepository).to(SupportRepository);

container.bind<ISessionRepository>(TYPES.sessionRepository).to(SessionRepository);

container.bind<IGatewayService>(TYPES.gatewayService).to(GatewayService);
container.bind<IMessageRepository>(TYPES.messageRepository).to(MessageRepository);
container.bind<IOrderRepository>(TYPES.orderRepository).to(OrderRepository);


export { container };