import { MessageEntity } from "../../messages/entity/message.entity";

export enum SessionStatus{
    OPEN = 1, 
    CLOSED = 2,
    OPERATOR = 3
}

export class SessionEntity{
    public id!: number;
    public sessionId!: number;
    public userId!: number;
    public createDate!: Date;
    public closeDate!: Date;
    public status!: SessionStatus;

    public messages!: MessageEntity[]

    public static fromDb(model: any){
        const res = new SessionEntity();
       
            res.id = model.id;
            res.sessionId = model.sessionId;
            res.closeDate = model.closeDate;
            res.createDate = model.createDate;
            res.status = model.status;
            res.userId = model.userId;
            if (model.messages) res.messages = model.messages.map((msg: any) => MessageEntity.fromDb(msg));
        
        
       
        return res;
    }
}