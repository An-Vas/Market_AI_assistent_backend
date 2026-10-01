import { injectable } from "inversify";

import { Order } from "../../database/models/order";
import { plainToInstance } from "class-transformer";
import { MessageEntity } from "../messages/entity/message.entity";
import { IOrderRepository } from "./order.repository.interface";
import { OrderEntity } from "./entity/order.entity";

@injectable()
export class OrderRepository implements IOrderRepository {
    constructor(
		

	) {}

    async getOrder(orderId: number, userId:  number): Promise<OrderEntity | null> {
        const result = await Order.findOne( {where: {id: orderId, userId}})
        return result ? OrderEntity.fromDb(result) : null;
    }
}