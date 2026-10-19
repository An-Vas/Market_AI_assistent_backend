// Форма, которую реально возвращает GET /orders (см. support.controller.ts).
// Отдельно от OrderEntity, так как в ответе нет userId.
export class OrderResponseDto {
    public id!: number;
    public orderComposition!: string;
    public status!: string;
    public deliveryDate!: Date;
}
