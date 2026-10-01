

export class OrderEntity {
    public id!: number;
    public userId!: number;
    public orderComposition!: string;
    public deliveryDate!: Date;
    public status!: string;

    public static fromDb(model: any){
        const res = new OrderEntity();
        res.id = model.id;
        res.userId  = model.userId
        res.orderComposition = model.orderComposition
        res.deliveryDate = model.deliveryDate
        res.status = model.status
        return res;
    }
}