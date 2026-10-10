import { MessageEntity } from "../messages/entity/message.entity";
import { OrderEntity } from "./entity/order.entity";


export interface IOrderRepository{
    getOrder(orderId: number, userId:  number): Promise<OrderEntity | null>
    getOrdersForUser(userId: number): Promise<OrderEntity[]>
}