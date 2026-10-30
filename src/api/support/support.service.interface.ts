import { SupportRequestDto } from "./dto/supportRequest.dto";
import { SupportResponseDto } from "./dto/supportResponse.dto";
import { OrderEntity } from "../order/entity/order.entity";

export interface ISupportService {
  handleSupportRequest(requestData: SupportRequestDto, traceId: string, authToken: string): Promise<SupportResponseDto>
  getOrdersForUser(authToken: string, traceId: string): Promise<OrderEntity[]>
}