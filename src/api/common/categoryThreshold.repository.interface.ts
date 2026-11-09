import { RequestCategory } from './ml.enums';

export interface ICategoryThresholdRepository {
    getRequiredConfidence(category: RequestCategory): Promise<number>;
}
