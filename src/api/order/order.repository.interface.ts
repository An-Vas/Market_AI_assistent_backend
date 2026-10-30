import { OrderEntity } from "./entity/order.entity";

export interface IOrderRepository{
    getOrder(orderId: number, authToken: string): Promise<OrderEntity | null>
    getOrdersForUser(authToken: string): Promise<OrderEntity[]>
}
