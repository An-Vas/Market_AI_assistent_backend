import { SessionEntity, SessionStatus } from "./entity/session.entity";

export interface ISessionRepository{
    getSession(sessionId: number, userId: number): Promise<SessionEntity | null>
    createSession(sessionId: number, userId: number): Promise<SessionEntity>;
    updateStatus(sessionId: number, userId: number, status: SessionStatus): Promise<void>;
}