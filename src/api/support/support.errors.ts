export class SessionAccessDeniedError extends Error {
    constructor() {
        super('Session is not available.');
        this.name = 'SessionAccessDeniedError';
    }
}
