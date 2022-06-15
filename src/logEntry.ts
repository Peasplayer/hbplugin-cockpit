export class LogEntry {
    prefix: string
    message: string

    constructor(_prefix: string, _message: string) {
        this.prefix = _prefix;
        this.message = _message;
    }
}
