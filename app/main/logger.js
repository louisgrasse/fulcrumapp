'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require('util');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const LOG = 'log';
const WARN = 'warn';
const ERROR = 'error';

const LEVELS = {
  log: LOG,
  warn: WARN,
  error: ERROR
};

class Logger {
  constructor(logPath) {
    this.withContext = context => {
      const logger = this;

      return {
        log: (...args) => this.output(LOG, context, ...args),
        warn: (...args) => this.output(WARN, context, ...args),
        error: (...args) => this.output(ERROR, context, ...args)
      };
    };

    this.output = (level, context, ...args) => {
      this.write(this.prefix(LEVELS[level] || LOG, context) + ' ' + (0, _util.format)(...args));

      console[level](...args);
    };

    this.log = (...args) => {
      this.output(LOG, null, ...args);
    };

    this.warn = (...args) => {
      this.output(WARN, null, ...args);
    };

    this.error = (...args) => {
      this.output(ERROR, null, ...args);
    };

    this._path = logPath;
  }

  write(content) {
    if (content != null) {
      _fs2.default.appendFileSync(this.logFilePath, content.toString() + '\n');
    }
  }

  get logFilePath() {
    return _path2.default.join(this._path, `fulcrum-${(0, _moment2.default)().format('YYYY-MM-DD')}.log`);
  }

  prefix(level, context) {
    return `[${new Date().toISOString()}] [${level}]` + (context ? ` [${context}]` : '');
  }
}
exports.default = Logger;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xvZ2dlci5qcyJdLCJuYW1lcyI6WyJMT0ciLCJXQVJOIiwiRVJST1IiLCJMRVZFTFMiLCJsb2ciLCJ3YXJuIiwiZXJyb3IiLCJMb2dnZXIiLCJjb25zdHJ1Y3RvciIsImxvZ1BhdGgiLCJ3aXRoQ29udGV4dCIsImNvbnRleHQiLCJsb2dnZXIiLCJhcmdzIiwib3V0cHV0IiwibGV2ZWwiLCJ3cml0ZSIsInByZWZpeCIsImNvbnNvbGUiLCJfcGF0aCIsImNvbnRlbnQiLCJhcHBlbmRGaWxlU3luYyIsImxvZ0ZpbGVQYXRoIiwidG9TdHJpbmciLCJqb2luIiwiZm9ybWF0IiwiRGF0ZSIsInRvSVNPU3RyaW5nIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLE1BQU1BLE1BQU0sS0FBWjtBQUNBLE1BQU1DLE9BQU8sTUFBYjtBQUNBLE1BQU1DLFFBQVEsT0FBZDs7QUFFQSxNQUFNQyxTQUFTO0FBQ2JDLE9BQUtKLEdBRFE7QUFFYkssUUFBTUosSUFGTztBQUdiSyxTQUFPSjtBQUhNLENBQWY7O0FBTWUsTUFBTUssTUFBTixDQUFhO0FBQzFCQyxjQUFZQyxPQUFaLEVBQXFCO0FBQUEsU0FjckJDLFdBZHFCLEdBY05DLE9BQUQsSUFBYTtBQUN6QixZQUFNQyxTQUFTLElBQWY7O0FBRUEsYUFBTztBQUNMUixhQUFLLENBQUMsR0FBR1MsSUFBSixLQUFhLEtBQUtDLE1BQUwsQ0FBWWQsR0FBWixFQUFpQlcsT0FBakIsRUFBMEIsR0FBR0UsSUFBN0IsQ0FEYjtBQUVMUixjQUFNLENBQUMsR0FBR1EsSUFBSixLQUFhLEtBQUtDLE1BQUwsQ0FBWWIsSUFBWixFQUFrQlUsT0FBbEIsRUFBMkIsR0FBR0UsSUFBOUIsQ0FGZDtBQUdMUCxlQUFPLENBQUMsR0FBR08sSUFBSixLQUFhLEtBQUtDLE1BQUwsQ0FBWVosS0FBWixFQUFtQlMsT0FBbkIsRUFBNEIsR0FBR0UsSUFBL0I7QUFIZixPQUFQO0FBS0QsS0F0Qm9COztBQUFBLFNBd0JyQkMsTUF4QnFCLEdBd0JaLENBQUNDLEtBQUQsRUFBUUosT0FBUixFQUFpQixHQUFHRSxJQUFwQixLQUE2QjtBQUNwQyxXQUFLRyxLQUFMLENBQVcsS0FBS0MsTUFBTCxDQUFZZCxPQUFPWSxLQUFQLEtBQWlCZixHQUE3QixFQUFrQ1csT0FBbEMsSUFBNkMsR0FBN0MsR0FBbUQsa0JBQU8sR0FBR0UsSUFBVixDQUE5RDs7QUFFQUssY0FBUUgsS0FBUixFQUFlLEdBQUdGLElBQWxCO0FBQ0QsS0E1Qm9COztBQUFBLFNBOEJyQlQsR0E5QnFCLEdBOEJmLENBQUMsR0FBR1MsSUFBSixLQUFhO0FBQ2pCLFdBQUtDLE1BQUwsQ0FBWWQsR0FBWixFQUFpQixJQUFqQixFQUF1QixHQUFHYSxJQUExQjtBQUNELEtBaENvQjs7QUFBQSxTQWtDckJSLElBbENxQixHQWtDZCxDQUFDLEdBQUdRLElBQUosS0FBYTtBQUNsQixXQUFLQyxNQUFMLENBQVliLElBQVosRUFBa0IsSUFBbEIsRUFBd0IsR0FBR1ksSUFBM0I7QUFDRCxLQXBDb0I7O0FBQUEsU0FzQ3JCUCxLQXRDcUIsR0FzQ2IsQ0FBQyxHQUFHTyxJQUFKLEtBQWE7QUFDbkIsV0FBS0MsTUFBTCxDQUFZWixLQUFaLEVBQW1CLElBQW5CLEVBQXlCLEdBQUdXLElBQTVCO0FBQ0QsS0F4Q29COztBQUNuQixTQUFLTSxLQUFMLEdBQWFWLE9BQWI7QUFDRDs7QUFFRE8sUUFBTUksT0FBTixFQUFlO0FBQ2IsUUFBSUEsV0FBVyxJQUFmLEVBQXFCO0FBQ25CLG1CQUFHQyxjQUFILENBQWtCLEtBQUtDLFdBQXZCLEVBQW9DRixRQUFRRyxRQUFSLEtBQXFCLElBQXpEO0FBQ0Q7QUFDRjs7QUFFRCxNQUFJRCxXQUFKLEdBQWtCO0FBQ2hCLFdBQU8sZUFBS0UsSUFBTCxDQUFVLEtBQUtMLEtBQWYsRUFBdUIsV0FBVyx3QkFBU00sTUFBVCxDQUFnQixZQUFoQixDQUErQixNQUFqRSxDQUFQO0FBQ0Q7O0FBOEJEUixTQUFPRixLQUFQLEVBQWNKLE9BQWQsRUFBdUI7QUFDckIsV0FBUSxJQUFHLElBQUllLElBQUosR0FBV0MsV0FBWCxFQUF5QixNQUFLWixLQUFNLEdBQXhDLElBQThDSixVQUFXLEtBQUlBLE9BQVEsR0FBdkIsR0FBNEIsRUFBMUUsQ0FBUDtBQUNEO0FBN0N5QjtrQkFBUEosTSIsImZpbGUiOiJsb2dnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcblxuY29uc3QgTE9HID0gJ2xvZyc7XG5jb25zdCBXQVJOID0gJ3dhcm4nO1xuY29uc3QgRVJST1IgPSAnZXJyb3InO1xuXG5jb25zdCBMRVZFTFMgPSB7XG4gIGxvZzogTE9HLFxuICB3YXJuOiBXQVJOLFxuICBlcnJvcjogRVJST1Jcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExvZ2dlciB7XG4gIGNvbnN0cnVjdG9yKGxvZ1BhdGgpIHtcbiAgICB0aGlzLl9wYXRoID0gbG9nUGF0aDtcbiAgfVxuXG4gIHdyaXRlKGNvbnRlbnQpIHtcbiAgICBpZiAoY29udGVudCAhPSBudWxsKSB7XG4gICAgICBmcy5hcHBlbmRGaWxlU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBjb250ZW50LnRvU3RyaW5nKCkgKyAnXFxuJyk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IGxvZ0ZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy5fcGF0aCwgYGZ1bGNydW0tJHsgbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykgfS5sb2dgKTtcbiAgfVxuXG4gIHdpdGhDb250ZXh0ID0gKGNvbnRleHQpID0+IHtcbiAgICBjb25zdCBsb2dnZXIgPSB0aGlzO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGxvZzogKC4uLmFyZ3MpID0+IHRoaXMub3V0cHV0KExPRywgY29udGV4dCwgLi4uYXJncyksXG4gICAgICB3YXJuOiAoLi4uYXJncykgPT4gdGhpcy5vdXRwdXQoV0FSTiwgY29udGV4dCwgLi4uYXJncyksXG4gICAgICBlcnJvcjogKC4uLmFyZ3MpID0+IHRoaXMub3V0cHV0KEVSUk9SLCBjb250ZXh0LCAuLi5hcmdzKSxcbiAgICB9O1xuICB9XG5cbiAgb3V0cHV0ID0gKGxldmVsLCBjb250ZXh0LCAuLi5hcmdzKSA9PiB7XG4gICAgdGhpcy53cml0ZSh0aGlzLnByZWZpeChMRVZFTFNbbGV2ZWxdIHx8IExPRywgY29udGV4dCkgKyAnICcgKyBmb3JtYXQoLi4uYXJncykpO1xuXG4gICAgY29uc29sZVtsZXZlbF0oLi4uYXJncyk7XG4gIH1cblxuICBsb2cgPSAoLi4uYXJncykgPT4ge1xuICAgIHRoaXMub3V0cHV0KExPRywgbnVsbCwgLi4uYXJncyk7XG4gIH1cblxuICB3YXJuID0gKC4uLmFyZ3MpID0+IHtcbiAgICB0aGlzLm91dHB1dChXQVJOLCBudWxsLCAuLi5hcmdzKTtcbiAgfVxuXG4gIGVycm9yID0gKC4uLmFyZ3MpID0+IHtcbiAgICB0aGlzLm91dHB1dChFUlJPUiwgbnVsbCwgLi4uYXJncyk7XG4gIH1cblxuICBwcmVmaXgobGV2ZWwsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gYFske25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1dIFske2xldmVsfV1gICsgKGNvbnRleHQgPyBgIFske2NvbnRleHR9XWAgOiAnJyk7XG4gIH1cbn1cbiJdfQ==