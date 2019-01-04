import { format } from 'util';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

const LOG = 'log';
const WARN = 'warn';
const ERROR = 'error';

const LEVELS = {
  log: LOG,
  warn: WARN,
  error: ERROR
};

export default class Logger {
  constructor(logPath) {
    this._path = logPath;
  }

  write(content) {
    if (content != null) {
      fs.appendFileSync(this.logFilePath, content.toString() + '\n');
    }
  }

  get logFilePath() {
    return path.join(this._path, `fulcrum-${ moment().format('YYYY-MM-DD') }.log`);
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

  error = (...args) => {
    this.output(ERROR, null, ...args);
  }

  prefix(level, context) {
    return `[${new Date().toISOString()}] [${level}]` + (context ? ` [${context}]` : '');
  }
}
