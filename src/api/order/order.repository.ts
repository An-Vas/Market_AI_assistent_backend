import { injectable } from "inversify";
import axios from "axios";
import { IOrderRepository } from "./order.repository.interface";
import { OrderEntity } from "./entity/order.entity";

function marketplaceBaseUrl(): string {
    const base = process.env.MARKETPLACE_BASE_URL;
    if (!base) {
        throw new Error('MARKETPLACE_BASE_URL is not configured.');
    }
    return base;
}

@injectable()
export class OrderRepository implements IOrderRepository {

    async getOrder(orderId: number, authToken: string): Promise<OrderEntity | null> {
        try {
            const response = await axios.get(`${marketplaceBaseUrl()}/api/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            return OrderEntity.fromApi(response.data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async getOrdersForUser(authToken: string): Promise<OrderEntity[]> {
        const response = await axios.get(`${marketplaceBaseUrl()}/api/orders`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });
        return (response.data as unknown[]).map((item) => OrderEntity.fromApi(item));
    }
}
