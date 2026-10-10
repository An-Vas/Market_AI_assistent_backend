export enum ResponseType {
    ANSWER = 1,
    DETAILSREQUEST = 2,
    ORDERINFOREQUEST = 3,
    OPERATOR = 4
}

export interface SupportTechnicalInfo {
    classifier: {
        model: string;
        intent: string;
        category: string;
        confidence: number;
        inference_ms: number;
        request_ms: number;
    } | null;
    generator: {
        model: string;
        knowledge_lookup_ms: number;
        inference_ms: number;
        request_ms: number;
    } | null;
    timings_ms: {
        preprocessing: number;
        preprocessing_request: number;
        classification: number | null;
        knowledge_lookup: number | null;
        generation: number | null;
        total: number;
    };
}

export class SupportResponseDto {
    public text!: string
    public type!: ResponseType
    public technical?: SupportTechnicalInfo
}