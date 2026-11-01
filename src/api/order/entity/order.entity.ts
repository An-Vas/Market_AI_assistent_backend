export class OrderEntity {
    public id!: number;
    public orderComposition!: string;
    public deliveryDate!: string;
    public status!: string;

    public static fromApi(data: any): OrderEntity {
        const res = new OrderEntity();
        res.id = data.id;
        res.orderComposition = data.orderComposition;
        res.deliveryDate = data.deliveryDate;
        res.status = data.status;
        return res;
    }
}
