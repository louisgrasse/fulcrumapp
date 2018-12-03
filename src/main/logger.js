import { format } from 'util';
import fs from 'fs';
import path from 'path';

const LOG = 'log';
const WARN = 'warning';
const ERROR = 'error';

const LEVELS = {
  log: LOG,
  warn: WARN,
  error: ERROR
};

export default class Logger {
  constructor(logPath) {
    this._path = logPath;
    this._logFilePath = path.join(this._path, 'fulcrum.log');
  }

  write(content) {
    if (content != null) {
      fs.appendFileSync(this._logFilePath, content.toString() + '\n');
    }
  }

  withContext = (context) => {
    const logger = this;

    return {
      log: (...args) => this.output(LOG, context, ...args),
      warn: (...args) => this.output(WARN, context, ...args),
      error: (...args) => this.output(ERROR, context, ...args),
    };
  }

  output = (level, context, ...args) => {
    this.write(this.prefix(LEVELS[level] || LOG, context) + ' ' + format(...args));

    console[level](...args);
  }

  log = (...args) => {
    this.output(LOG, null, ...args);
  }

  warn = (...args) => {
    this.output(WARN, null, ...args);
  }

  warn = (...args) => {
    this.output(ERROR, null, ...args);
  }

  prefix(level, context) {
    return `[${new Date().toISOString()}] [${level}]` + (context ? ` [${context}]` : '');
  }
}
