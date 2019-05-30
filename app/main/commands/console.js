'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _repl = require('repl');

var _repl2 = _interopRequireDefault(_repl);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _version = require('../../version');

var _version2 = _interopRequireDefault(_version);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = class {
  constructor() {
    var _this = this;

    this.runCommand = _asyncToGenerator(function* () {
      yield _this.app.activatePlugins();

      const account = yield fulcrum.fetchAccount(fulcrum.args.org);
      const app = _this.app;

      const code = fulcrum.args.file ? _fs2.default.readFileSync(fulcrum.args.file).toString() : fulcrum.args.code;

      if (code) {
        yield eval(code);
        return;
      }

      console.log('');
      console.log('Fulcrum'.green, _version2.default.version.green, fulcrum.databaseFilePath);
      console.log('');

      const server = _repl2.default.start({ prompt: '> ', terminal: true });

      server.context.account = account;
      server.context.app = _this.app;

      // the process quits immediately unless we wire up an exit event
      yield new Promise(function (resolve) {
        server.on('exit', resolve);
      });
    });
  }

  task(cli) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return cli.command({
        command: 'console',
        desc: 'run the console',
        builder: {
          org: {
            desc: 'organization name',
            type: 'string'
          },
          file: {
            desc: 'file to execute',
            type: 'string'
          },
          code: {
            desc: 'code to execute',
            type: 'string'
          }
        },
        handler: _this2.runCommand
      });
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2NvbW1hbmRzL2NvbnNvbGUuanMiXSwibmFtZXMiOlsicnVuQ29tbWFuZCIsImFwcCIsImFjdGl2YXRlUGx1Z2lucyIsImFjY291bnQiLCJmdWxjcnVtIiwiZmV0Y2hBY2NvdW50IiwiYXJncyIsIm9yZyIsImNvZGUiLCJmaWxlIiwicmVhZEZpbGVTeW5jIiwidG9TdHJpbmciLCJldmFsIiwiY29uc29sZSIsImxvZyIsImdyZWVuIiwidmVyc2lvbiIsImRhdGFiYXNlRmlsZVBhdGgiLCJzZXJ2ZXIiLCJzdGFydCIsInByb21wdCIsInRlcm1pbmFsIiwiY29udGV4dCIsIlByb21pc2UiLCJyZXNvbHZlIiwib24iLCJ0YXNrIiwiY2xpIiwiY29tbWFuZCIsImRlc2MiLCJidWlsZGVyIiwidHlwZSIsImhhbmRsZXIiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7a0JBRWUsTUFBTTtBQUFBO0FBQUE7O0FBQUEsU0F1Qm5CQSxVQXZCbUIscUJBdUJOLGFBQVk7QUFDdkIsWUFBTSxNQUFLQyxHQUFMLENBQVNDLGVBQVQsRUFBTjs7QUFFQSxZQUFNQyxVQUFVLE1BQU1DLFFBQVFDLFlBQVIsQ0FBcUJELFFBQVFFLElBQVIsQ0FBYUMsR0FBbEMsQ0FBdEI7QUFDQSxZQUFNTixNQUFNLE1BQUtBLEdBQWpCOztBQUVBLFlBQU1PLE9BQU9KLFFBQVFFLElBQVIsQ0FBYUcsSUFBYixHQUFvQixhQUFHQyxZQUFILENBQWdCTixRQUFRRSxJQUFSLENBQWFHLElBQTdCLEVBQW1DRSxRQUFuQyxFQUFwQixHQUFvRVAsUUFBUUUsSUFBUixDQUFhRSxJQUE5Rjs7QUFFQSxVQUFJQSxJQUFKLEVBQVU7QUFDUixjQUFNSSxLQUFLSixJQUFMLENBQU47QUFDQTtBQUNEOztBQUVESyxjQUFRQyxHQUFSLENBQVksRUFBWjtBQUNBRCxjQUFRQyxHQUFSLENBQVksVUFBVUMsS0FBdEIsRUFBNkIsa0JBQUlDLE9BQUosQ0FBWUQsS0FBekMsRUFBZ0RYLFFBQVFhLGdCQUF4RDtBQUNBSixjQUFRQyxHQUFSLENBQVksRUFBWjs7QUFFQSxZQUFNSSxTQUFTLGVBQUtDLEtBQUwsQ0FBVyxFQUFDQyxRQUFRLElBQVQsRUFBZUMsVUFBVSxJQUF6QixFQUFYLENBQWY7O0FBRUFILGFBQU9JLE9BQVAsQ0FBZW5CLE9BQWYsR0FBeUJBLE9BQXpCO0FBQ0FlLGFBQU9JLE9BQVAsQ0FBZXJCLEdBQWYsR0FBcUIsTUFBS0EsR0FBMUI7O0FBRUE7QUFDQSxZQUFNLElBQUlzQixPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFhO0FBQzdCTixlQUFPTyxFQUFQLENBQVUsTUFBVixFQUFrQkQsT0FBbEI7QUFDRCxPQUZLLENBQU47QUFHRCxLQWpEa0I7QUFBQTs7QUFDYkUsTUFBTixDQUFXQyxHQUFYLEVBQWdCO0FBQUE7O0FBQUE7QUFDZCxhQUFPQSxJQUFJQyxPQUFKLENBQVk7QUFDakJBLGlCQUFTLFNBRFE7QUFFakJDLGNBQU0saUJBRlc7QUFHakJDLGlCQUFTO0FBQ1B2QixlQUFLO0FBQ0hzQixrQkFBTSxtQkFESDtBQUVIRSxrQkFBTTtBQUZILFdBREU7QUFLUHRCLGdCQUFNO0FBQ0pvQixrQkFBTSxpQkFERjtBQUVKRSxrQkFBTTtBQUZGLFdBTEM7QUFTUHZCLGdCQUFNO0FBQ0pxQixrQkFBTSxpQkFERjtBQUVKRSxrQkFBTTtBQUZGO0FBVEMsU0FIUTtBQWlCakJDLGlCQUFTLE9BQUtoQztBQWpCRyxPQUFaLENBQVA7QUFEYztBQW9CZjs7QUFyQmtCLEMiLCJmaWxlIjoiY29uc29sZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCByZXBsIGZyb20gJ3JlcGwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwa2cgZnJvbSAnLi4vLi4vdmVyc2lvbic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ2NvbnNvbGUnLFxuICAgICAgZGVzYzogJ3J1biB0aGUgY29uc29sZScsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfSxcbiAgICAgICAgZmlsZToge1xuICAgICAgICAgIGRlc2M6ICdmaWxlIHRvIGV4ZWN1dGUnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvZGU6IHtcbiAgICAgICAgICBkZXNjOiAnY29kZSB0byBleGVjdXRlJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYXBwLmFjdGl2YXRlUGx1Z2lucygpO1xuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuICAgIGNvbnN0IGFwcCA9IHRoaXMuYXBwO1xuXG4gICAgY29uc3QgY29kZSA9IGZ1bGNydW0uYXJncy5maWxlID8gZnMucmVhZEZpbGVTeW5jKGZ1bGNydW0uYXJncy5maWxlKS50b1N0cmluZygpIDogZnVsY3J1bS5hcmdzLmNvZGU7XG5cbiAgICBpZiAoY29kZSkge1xuICAgICAgYXdhaXQgZXZhbChjb2RlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgY29uc29sZS5sb2coJ0Z1bGNydW0nLmdyZWVuLCBwa2cudmVyc2lvbi5ncmVlbiwgZnVsY3J1bS5kYXRhYmFzZUZpbGVQYXRoKTtcbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICBjb25zdCBzZXJ2ZXIgPSByZXBsLnN0YXJ0KHtwcm9tcHQ6ICc+ICcsIHRlcm1pbmFsOiB0cnVlfSk7XG5cbiAgICBzZXJ2ZXIuY29udGV4dC5hY2NvdW50ID0gYWNjb3VudDtcbiAgICBzZXJ2ZXIuY29udGV4dC5hcHAgPSB0aGlzLmFwcDtcblxuICAgIC8vIHRoZSBwcm9jZXNzIHF1aXRzIGltbWVkaWF0ZWx5IHVubGVzcyB3ZSB3aXJlIHVwIGFuIGV4aXQgZXZlbnRcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgc2VydmVyLm9uKCdleGl0JywgcmVzb2x2ZSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==