import { RequestCategory } from "../common/ml.enums";



export interface IGatewayService {
   getAIResponse(context: string, category: string): Promise<string>
  sendToOperator(): Promise<void>;
  getAICategory(context: string): Promise<RequestCategory | null>;
  fixSpelling(text: string): Promise<string>;
}