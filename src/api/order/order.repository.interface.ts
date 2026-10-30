import { OrderEntity } from "./entity/order.entity";

export interface IOrderRepository{
    getOrder(orderId: number, authToken: string, traceId: string): Promise<OrderEntity | null>
    getOrdersForUser(authToken: string, traceId: string): Promise<OrderEntity[]>
}
