import { injectable } from 'inversify';
import { ICategoryThresholdRepository } from './categoryThreshold.repository.interface';
import { RequestCategory } from './ml.enums';
import { CategoryThreshold } from '../../database/models/categoryThreshold';

// Безопасный дефолт, если категория ещё не настроена в БД — лучше лишний раз
// уточнить вопрос, чем ответить напрямую без известной стоимости ошибки.
const DEFAULT_REQUIRED_CONFIDENCE = 0.85;

@injectable()
export class CategoryThresholdRepository implements ICategoryThresholdRepository {
    async getRequiredConfidence(category: RequestCategory): Promise<number> {
        const row = await CategoryThreshold.findOne({
            where: { intent: RequestCategory[category] },
        });
        return row ? row.confidenceThreshold : DEFAULT_REQUIRED_CONFIDENCE;
    }
}
