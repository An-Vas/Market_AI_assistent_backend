export class UnsupportedLanguageError extends Error {
    public readonly detectedLang: string | null;
    public readonly score: number;

    constructor(detectedLang: string | null, score: number) {
        super('Unsupported language. Only English is supported.');
        this.name = 'UnsupportedLanguageError';
        this.detectedLang = detectedLang;
        this.score = score;
    }
}
