import { MessageEntity } from "./entity/message.entity";

export interface IMessageRepository{
    saveMessage(msg: MessageEntity): Promise<MessageEntity>
}