import { injectable } from "inversify";
import { IMessageRepository } from "./message.repository.interface";
import { MessageEntity } from "./entity/message.entity";
import { Message } from "../../database/models/message";
import { plainToInstance } from "class-transformer";

@injectable()
export class MessageRepository implements IMessageRepository {
    constructor(
		

	) {}

    async saveMessage(msg: MessageEntity): Promise<MessageEntity> {
        console.log(msg)
        const result = await Message.create({text: msg.text, sessionId: msg.sessionId, senderType: msg.senderType})
        return MessageEntity.fromDb(result);
    }
}