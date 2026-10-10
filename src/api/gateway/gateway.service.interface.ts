import { RequestCategory } from "../common/ml.enums";

export interface ClassificationResult {
  category: RequestCategory | null;
  categoryName: string;
  intent: string;
  confidence: number;
  model: string;
  durationMs: number;
  requestMs: number;
}

export interface GeneratedAnswer {
  content: string;
  model: string;
  durationMs: number;
  knowledgeLookupMs: number;
  llmDurationMs: number;
  requestMs: number;
}

export interface PreprocessedText {
  text: string;
  durationMs: number;
  requestMs: number;
}

export interface IGatewayService {
  getAIResponse(context: string, intent: string, orderContext?: string): Promise<GeneratedAnswer>;
  sendToOperator(): Promise<void>;
  getAICategory(context: string): Promise<ClassificationResult>;
  fixSpelling(text: string): Promise<PreprocessedText>;
}