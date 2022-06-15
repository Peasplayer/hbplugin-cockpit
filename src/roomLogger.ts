import { LogEntry } from "./logEntry";

export class RoomLogger {
    code: number
    log: Array<LogEntry>

    constructor(protected readonly _code: number) {
        this.code = _code;
        this.log = new Array<LogEntry>()
    }

    appendLogEntry(logEntry: LogEntry) {
        this.log.push(logEntry);
    }

    readLog() {
        let output = new Array<string>();
        this.log.forEach(entry => {
            output.push("[" + entry.prefix + "] " + entry.message)
        })
        return output;
    }
}
