import { SupportRequestDto } from "./dto/supportRequest.dto";
import { SupportResponseDto } from "./dto/supportResponse.dto";

export interface ISupportService {
  handleSupportRequest(requestData: SupportRequestDto): Promise<SupportResponseDto>
}