


import { injectable } from "inversify";

import { Message } from "../../database/models/message";
import { plainToInstance } from "class-transformer";
import { SessionEntity, SessionStatus } from "./entity/session.entity";
import { Session } from "../../database/models/session";
import { ISessionRepository } from "./session.repository.interface";
import { stat } from "node:fs";

@injectable()
export class SessionRepository implements ISessionRepository {
    constructor(
        
    ) {}

    async getSession(sessionId: number): Promise<SessionEntity | null> {
        const result = await Session.findByPk(sessionId, {
            include: [
                {
                    model: Message,
                    as: "messages"
                }
            ]
        })
        return result ? SessionEntity.fromDb(result) : null;
    }

    async createSession(sessionId: number, userId: number){
        const result = await Session.create({
            sessionId,
            userId,
            status: SessionStatus.OPEN
        })
          return SessionEntity.fromDb(result);
    }

    async updateStatus(sessionId: number, status: SessionStatus){
        if (status == SessionStatus.CLOSED){
            await Session.update({status, closeDate: Date.now}, { where: {sessionId}})
        } else {
            await Session.update({status, closeDate: null}, { where: {sessionId}})
        }
        
    }
}