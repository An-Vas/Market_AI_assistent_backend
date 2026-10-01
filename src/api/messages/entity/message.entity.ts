export enum SenderType{
    USER = 1,
    AI = 2,
    OPERATOR = 3
}

export class MessageEntity {
    id!: number
    sessionId!: number
    senderType!: SenderType
    text!: string
    createDate!: Date

    public static fromDb(model: any){
        const res = new MessageEntity();
        res.id = model.id;
        res.sessionId  = model.sessionId
        res.senderType = model.senderType
        res.createDate = model.createDate
        res.text = model.text
        return res;
    }
}