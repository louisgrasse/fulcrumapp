'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _colors = require('colors');

var _colors2 = _interopRequireDefault(_colors);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _account = require('../models/account');

var _account2 = _interopRequireDefault(_account);

var _fulcrumCore = require('fulcrum-core');

var _localDatabaseDataSource = require('../local-database-data-source');

var _localDatabaseDataSource2 = _interopRequireDefault(_localDatabaseDataSource);

var _app = require('../app');

var _app2 = _interopRequireDefault(_app);

var _setup = require('./setup');

var _setup2 = _interopRequireDefault(_setup);

var _installPlugin = require('./install-plugin');

var _installPlugin2 = _interopRequireDefault(_installPlugin);

var _createPlugin = require('./create-plugin');

var _createPlugin2 = _interopRequireDefault(_createPlugin);

var _updatePlugins = require('./update-plugins');

var _updatePlugins2 = _interopRequireDefault(_updatePlugins);

var _buildPlugins = require('./build-plugins');

var _buildPlugins2 = _interopRequireDefault(_buildPlugins);

var _watchPlugins = require('./watch-plugins');

var _watchPlugins2 = _interopRequireDefault(_watchPlugins);

var _sync = require('./sync');

var _sync2 = _interopRequireDefault(_sync);

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

var _reset = require('./reset');

var _reset2 = _interopRequireDefault(_reset);

var _console = require('./console');

var _console2 = _interopRequireDefault(_console);

var _version = require('../../version');

var _version2 = _interopRequireDefault(_version);

var _minidb = require('minidb');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_yargs2.default.$0 = 'fulcrum';

require('source-map-support').install();

const COMMANDS = [_setup2.default, _sync2.default, _reset2.default, _installPlugin2.default, _createPlugin2.default, _updatePlugins2.default, _buildPlugins2.default, _watchPlugins2.default, _query2.default, _console2.default];

class CLI {
  constructor() {
    this.wrapAsync = (obj, resolve, reject) => {
      const __command = obj.command.bind(obj);

      obj.command = (...args) => {
        if (args && args[0] && args[0].handler) {
          const handler = args[0].handler;

          args[0].handler = () => {
            const result = handler();

            if (result && result.then) {
              result.then(resolve).catch(reject);
            }
          };
        }

        return __command(...args);
      };

      return obj;
    };
  }

  setup() {
    var _this = this;

    return _asyncToGenerator(function* () {
      _this.app = _app2.default;

      if (_this.args.colors === false) {
        _colors2.default.enabled = false;
      }

      if (_this.args.debugsql) {
        _minidb.Database.debug = true;
      }

      if (_this.args.debug) {
        fulcrum.logger.log(_this.args);
      }

      yield _this.app.initialize();
    })();
  }

  destroy() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      yield _this2.app.dispose();
    })();
  }

  run() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let cli = _this3.yargs.usage('Usage: fulcrum <cmd> [args]');

      cli.$0 = 'fulcrum';

      // this is some hacks to coordinate the yargs handler function with this async function.
      // if yargs adds support for promises in the command handlers this can go away.
      let promiseResolve = null;
      let promiseReject = null;

      const completion = new Promise(function (resolve, reject) {
        promiseResolve = resolve;
        promiseReject = reject;
      });

      // cli = await this.addDefault(this.wrapAsync(cli, promiseResolve, promiseReject));

      for (const CommandClass of COMMANDS) {
        const command = new CommandClass();

        command.app = _this3.app;

        const commandCli = yield command.task(_this3.wrapAsync(cli, promiseResolve, promiseReject));

        if (commandCli) {
          cli = commandCli;
        }
      }

      for (const plugin of _this3.app._plugins) {
        if (plugin.task) {
          const pluginCommand = yield plugin.task(_this3.wrapAsync(cli, promiseResolve, promiseReject));

          if (pluginCommand) {
            cli = pluginCommand;
          }
        }
      }

      _this3.argv = cli.demandCommand().version(_version2.default.version).help().argv;

      yield completion;
    })();
  }

  // addDefault = async (cli) => {
  //   return cli.command({
  //     command: 'yoyo',
  //     desc: 'yyo',
  //     builder: {},
  //     handler: this.runDefaultCommand
  //   });
  // }

  // runDefaultCommand = async () => {
  // }

  get db() {
    return this.app.db;
  }

  get yargs() {
    return this.app.yargs;
  }

  get args() {
    return this.app.yargs.argv;
  }

  fetchAccount(name) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      const where = {};

      if (name) {
        where.organization_name = name;
      }

      const accounts = yield _account2.default.findAll(_this4.db, where);

      return accounts;
    })();
  }

  createDataSource(account) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      let dataSource = new _fulcrumCore.DataSource();

      const localDatabase = new _localDatabaseDataSource2.default(account);

      dataSource.add(localDatabase);

      yield localDatabase.load(_this5.db);

      return dataSource;
    })();
  }

  start() {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      // TODO(zhm) required or it hangs for ~30sec https://github.com/electron/electron/issues/4944
      process.on('SIGINT', function () {
        process.exit();
      });

      try {
        yield _this6.setup();
        yield _this6.run();
        yield _this6.destroy();
      } catch (err) {
        process.exitCode = 1;
        fulcrum.logger.error(err.stack);
        yield _this6.destroy();
      }

      // TODO(zhm) required or it hangs for ~30sec https://github.com/electron/electron/issues/4944
      process.exit();
    })();
  }

  // this hacks the yargs command handler to allow it to return a promise (async function)
}

exports.default = CLI;
new CLI().start().then(() => {}).catch(err => {
  process.exitCode = 1;
  fulcrum.logger.error(err);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2NvbW1hbmRzL2NsaS5qcyJdLCJuYW1lcyI6WyIkMCIsInJlcXVpcmUiLCJpbnN0YWxsIiwiQ09NTUFORFMiLCJDTEkiLCJ3cmFwQXN5bmMiLCJvYmoiLCJyZXNvbHZlIiwicmVqZWN0IiwiX19jb21tYW5kIiwiY29tbWFuZCIsImJpbmQiLCJhcmdzIiwiaGFuZGxlciIsInJlc3VsdCIsInRoZW4iLCJjYXRjaCIsInNldHVwIiwiYXBwIiwiY29sb3JzIiwiZW5hYmxlZCIsImRlYnVnc3FsIiwiZGVidWciLCJmdWxjcnVtIiwibG9nZ2VyIiwibG9nIiwiaW5pdGlhbGl6ZSIsImRlc3Ryb3kiLCJkaXNwb3NlIiwicnVuIiwiY2xpIiwieWFyZ3MiLCJ1c2FnZSIsInByb21pc2VSZXNvbHZlIiwicHJvbWlzZVJlamVjdCIsImNvbXBsZXRpb24iLCJQcm9taXNlIiwiQ29tbWFuZENsYXNzIiwiY29tbWFuZENsaSIsInRhc2siLCJwbHVnaW4iLCJfcGx1Z2lucyIsInBsdWdpbkNvbW1hbmQiLCJhcmd2IiwiZGVtYW5kQ29tbWFuZCIsInZlcnNpb24iLCJoZWxwIiwiZGIiLCJmZXRjaEFjY291bnQiLCJuYW1lIiwid2hlcmUiLCJvcmdhbml6YXRpb25fbmFtZSIsImFjY291bnRzIiwiZmluZEFsbCIsImNyZWF0ZURhdGFTb3VyY2UiLCJhY2NvdW50IiwiZGF0YVNvdXJjZSIsImxvY2FsRGF0YWJhc2UiLCJhZGQiLCJsb2FkIiwic3RhcnQiLCJwcm9jZXNzIiwib24iLCJleGl0IiwiZXJyIiwiZXhpdENvZGUiLCJlcnJvciIsInN0YWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBOzs7Ozs7QUFF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QUFDWjtBQUNBQyxjQUFRQyxFQUFSLENBQVcsUUFBWCxFQUFxQixZQUFXO0FBQzlCRCxnQkFBUUUsSUFBUjtBQUNELE9BRkQ7O0FBSUEsVUFBSTtBQUNGLGNBQU0sT0FBSzlDLEtBQUwsRUFBTjtBQUNBLGNBQU0sT0FBS1ksR0FBTCxFQUFOO0FBQ0EsY0FBTSxPQUFLRixPQUFMLEVBQU47QUFDRCxPQUpELENBSUUsT0FBT3FDLEdBQVAsRUFBWTtBQUNaSCxnQkFBUUksUUFBUixHQUFtQixDQUFuQjtBQUNBMUMsZ0JBQVFDLE1BQVIsQ0FBZTBDLEtBQWYsQ0FBcUJGLElBQUlHLEtBQXpCO0FBQ0EsY0FBTSxPQUFLeEMsT0FBTCxFQUFOO0FBQ0Q7O0FBRUQ7QUFDQWtDLGNBQVFFLElBQVI7QUFqQlk7QUFrQmI7O0FBRUQ7QUEzSXVCOztrQkFBSjNELEc7QUFtS3JCLElBQUlBLEdBQUosR0FBVXdELEtBQVYsR0FBa0I3QyxJQUFsQixDQUF1QixNQUFNLENBQzVCLENBREQsRUFDR0MsS0FESCxDQUNVZ0QsR0FBRCxJQUFTO0FBQ2hCSCxVQUFRSSxRQUFSLEdBQW1CLENBQW5CO0FBQ0ExQyxVQUFRQyxNQUFSLENBQWUwQyxLQUFmLENBQXFCRixHQUFyQjtBQUNELENBSkQiLCJmaWxlIjoiY2xpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbG9ycyBmcm9tICdjb2xvcnMnO1xuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCBBY2NvdW50IGZyb20gJy4uL21vZGVscy9hY2NvdW50JztcbmltcG9ydCB7IERhdGFTb3VyY2UgfSBmcm9tICdmdWxjcnVtLWNvcmUnO1xuaW1wb3J0IExvY2FsRGF0YWJhc2VEYXRhU291cmNlIGZyb20gJy4uL2xvY2FsLWRhdGFiYXNlLWRhdGEtc291cmNlJztcbmltcG9ydCBhcHAgZnJvbSAnLi4vYXBwJztcblxuaW1wb3J0IFNldHVwIGZyb20gJy4vc2V0dXAnO1xuaW1wb3J0IEluc3RhbGxQbHVnaW4gZnJvbSAnLi9pbnN0YWxsLXBsdWdpbic7XG5pbXBvcnQgQ3JlYXRlUGx1Z2luIGZyb20gJy4vY3JlYXRlLXBsdWdpbic7XG5pbXBvcnQgVXBkYXRlUGx1Z2lucyBmcm9tICcuL3VwZGF0ZS1wbHVnaW5zJztcbmltcG9ydCBCdWlsZFBsdWdpbnMgZnJvbSAnLi9idWlsZC1wbHVnaW5zJztcbmltcG9ydCBXYXRjaFBsdWdpbnMgZnJvbSAnLi93YXRjaC1wbHVnaW5zJztcbmltcG9ydCBTeW5jIGZyb20gJy4vc3luYyc7XG5pbXBvcnQgUXVlcnkgZnJvbSAnLi9xdWVyeSc7XG5pbXBvcnQgUmVzZXQgZnJvbSAnLi9yZXNldCc7XG5pbXBvcnQgQ29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuaW1wb3J0IGZ1bGNydW1QYWNrYWdlIGZyb20gJy4uLy4uL3ZlcnNpb24nO1xuXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJ21pbmlkYic7XG5cbnlhcmdzLiQwID0gJ2Z1bGNydW0nO1xuXG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5cbmNvbnN0IENPTU1BTkRTID0gW1xuICBTZXR1cCxcbiAgU3luYyxcbiAgUmVzZXQsXG4gIEluc3RhbGxQbHVnaW4sXG4gIENyZWF0ZVBsdWdpbixcbiAgVXBkYXRlUGx1Z2lucyxcbiAgQnVpbGRQbHVnaW5zLFxuICBXYXRjaFBsdWdpbnMsXG4gIFF1ZXJ5LFxuICBDb25zb2xlXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDTEkge1xuICBhc3luYyBzZXR1cCgpIHtcbiAgICB0aGlzLmFwcCA9IGFwcDtcblxuICAgIGlmICh0aGlzLmFyZ3MuY29sb3JzID09PSBmYWxzZSkge1xuICAgICAgY29sb3JzLmVuYWJsZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hcmdzLmRlYnVnc3FsKSB7XG4gICAgICBEYXRhYmFzZS5kZWJ1ZyA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYXJncy5kZWJ1Zykge1xuICAgICAgZnVsY3J1bS5sb2dnZXIubG9nKHRoaXMuYXJncyk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5hcHAuaW5pdGlhbGl6ZSgpO1xuICB9XG5cbiAgYXN5bmMgZGVzdHJveSgpIHtcbiAgICBhd2FpdCB0aGlzLmFwcC5kaXNwb3NlKCk7XG4gIH1cblxuICBhc3luYyBydW4oKSB7XG4gICAgbGV0IGNsaSA9IHRoaXMueWFyZ3MudXNhZ2UoJ1VzYWdlOiBmdWxjcnVtIDxjbWQ+IFthcmdzXScpO1xuXG4gICAgY2xpLiQwID0gJ2Z1bGNydW0nO1xuXG4gICAgLy8gdGhpcyBpcyBzb21lIGhhY2tzIHRvIGNvb3JkaW5hdGUgdGhlIHlhcmdzIGhhbmRsZXIgZnVuY3Rpb24gd2l0aCB0aGlzIGFzeW5jIGZ1bmN0aW9uLlxuICAgIC8vIGlmIHlhcmdzIGFkZHMgc3VwcG9ydCBmb3IgcHJvbWlzZXMgaW4gdGhlIGNvbW1hbmQgaGFuZGxlcnMgdGhpcyBjYW4gZ28gYXdheS5cbiAgICBsZXQgcHJvbWlzZVJlc29sdmUgPSBudWxsO1xuICAgIGxldCBwcm9taXNlUmVqZWN0ID0gbnVsbDtcblxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBwcm9taXNlUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICBwcm9taXNlUmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuXG4gICAgLy8gY2xpID0gYXdhaXQgdGhpcy5hZGREZWZhdWx0KHRoaXMud3JhcEFzeW5jKGNsaSwgcHJvbWlzZVJlc29sdmUsIHByb21pc2VSZWplY3QpKTtcblxuICAgIGZvciAoY29uc3QgQ29tbWFuZENsYXNzIG9mIENPTU1BTkRTKSB7XG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IENvbW1hbmRDbGFzcygpO1xuXG4gICAgICBjb21tYW5kLmFwcCA9IHRoaXMuYXBwO1xuXG4gICAgICBjb25zdCBjb21tYW5kQ2xpID0gYXdhaXQgY29tbWFuZC50YXNrKHRoaXMud3JhcEFzeW5jKGNsaSwgcHJvbWlzZVJlc29sdmUsIHByb21pc2VSZWplY3QpKTtcblxuICAgICAgaWYgKGNvbW1hbmRDbGkpIHtcbiAgICAgICAgY2xpID0gY29tbWFuZENsaTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHBsdWdpbiBvZiB0aGlzLmFwcC5fcGx1Z2lucykge1xuICAgICAgaWYgKHBsdWdpbi50YXNrKSB7XG4gICAgICAgIGNvbnN0IHBsdWdpbkNvbW1hbmQgPSBhd2FpdCBwbHVnaW4udGFzayh0aGlzLndyYXBBc3luYyhjbGksIHByb21pc2VSZXNvbHZlLCBwcm9taXNlUmVqZWN0KSk7XG5cbiAgICAgICAgaWYgKHBsdWdpbkNvbW1hbmQpIHtcbiAgICAgICAgICBjbGkgPSBwbHVnaW5Db21tYW5kO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5hcmd2ID1cbiAgICAgIGNsaS5kZW1hbmRDb21tYW5kKClcbiAgICAgICAgIC52ZXJzaW9uKGZ1bGNydW1QYWNrYWdlLnZlcnNpb24pXG4gICAgICAgICAuaGVscCgpXG4gICAgICAgICAuYXJndjtcblxuICAgIGF3YWl0IGNvbXBsZXRpb247XG4gIH1cblxuICAvLyBhZGREZWZhdWx0ID0gYXN5bmMgKGNsaSkgPT4ge1xuICAvLyAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gIC8vICAgICBjb21tYW5kOiAneW95bycsXG4gIC8vICAgICBkZXNjOiAneXlvJyxcbiAgLy8gICAgIGJ1aWxkZXI6IHt9LFxuICAvLyAgICAgaGFuZGxlcjogdGhpcy5ydW5EZWZhdWx0Q29tbWFuZFxuICAvLyAgIH0pO1xuICAvLyB9XG5cbiAgLy8gcnVuRGVmYXVsdENvbW1hbmQgPSBhc3luYyAoKSA9PiB7XG4gIC8vIH1cblxuICBnZXQgZGIoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLmRiO1xuICB9XG5cbiAgZ2V0IHlhcmdzKCkge1xuICAgIHJldHVybiB0aGlzLmFwcC55YXJncztcbiAgfVxuXG4gIGdldCBhcmdzKCkge1xuICAgIHJldHVybiB0aGlzLmFwcC55YXJncy5hcmd2O1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hBY2NvdW50KG5hbWUpIHtcbiAgICBjb25zdCB3aGVyZSA9IHt9O1xuXG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHdoZXJlLm9yZ2FuaXphdGlvbl9uYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBhY2NvdW50cyA9IGF3YWl0IEFjY291bnQuZmluZEFsbCh0aGlzLmRiLCB3aGVyZSk7XG5cbiAgICByZXR1cm4gYWNjb3VudHM7XG4gIH1cblxuICBhc3luYyBjcmVhdGVEYXRhU291cmNlKGFjY291bnQpIHtcbiAgICBsZXQgZGF0YVNvdXJjZSA9IG5ldyBEYXRhU291cmNlKCk7XG5cbiAgICBjb25zdCBsb2NhbERhdGFiYXNlID0gbmV3IExvY2FsRGF0YWJhc2VEYXRhU291cmNlKGFjY291bnQpO1xuXG4gICAgZGF0YVNvdXJjZS5hZGQobG9jYWxEYXRhYmFzZSk7XG5cbiAgICBhd2FpdCBsb2NhbERhdGFiYXNlLmxvYWQodGhpcy5kYik7XG5cbiAgICByZXR1cm4gZGF0YVNvdXJjZTtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0KCkge1xuICAgIC8vIFRPRE8oemhtKSByZXF1aXJlZCBvciBpdCBoYW5ncyBmb3IgfjMwc2VjIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGVjdHJvbi9lbGVjdHJvbi9pc3N1ZXMvNDk0NFxuICAgIHByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuICAgICAgcHJvY2Vzcy5leGl0KCk7XG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zZXR1cCgpO1xuICAgICAgYXdhaXQgdGhpcy5ydW4oKTtcbiAgICAgIGF3YWl0IHRoaXMuZGVzdHJveSgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gICAgICBmdWxjcnVtLmxvZ2dlci5lcnJvcihlcnIuc3RhY2spO1xuICAgICAgYXdhaXQgdGhpcy5kZXN0cm95KCk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyh6aG0pIHJlcXVpcmVkIG9yIGl0IGhhbmdzIGZvciB+MzBzZWMgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uL2VsZWN0cm9uL2lzc3Vlcy80OTQ0XG4gICAgcHJvY2Vzcy5leGl0KCk7XG4gIH1cblxuICAvLyB0aGlzIGhhY2tzIHRoZSB5YXJncyBjb21tYW5kIGhhbmRsZXIgdG8gYWxsb3cgaXQgdG8gcmV0dXJuIGEgcHJvbWlzZSAoYXN5bmMgZnVuY3Rpb24pXG4gIHdyYXBBc3luYyA9IChvYmosIHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IF9fY29tbWFuZCA9IG9iai5jb21tYW5kLmJpbmQob2JqKTtcblxuICAgIG9iai5jb21tYW5kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmIChhcmdzICYmIGFyZ3NbMF0gJiYgYXJnc1swXS5oYW5kbGVyKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBhcmdzWzBdLmhhbmRsZXI7XG5cbiAgICAgICAgYXJnc1swXS5oYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZXIoKTtcblxuICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnRoZW4pIHtcbiAgICAgICAgICAgIHJlc3VsdC50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gX19jb21tYW5kKC4uLmFyZ3MpO1xuICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG59XG5cbm5ldyBDTEkoKS5zdGFydCgpLnRoZW4oKCkgPT4ge1xufSkuY2F0Y2goKGVycikgPT4ge1xuICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgZnVsY3J1bS5sb2dnZXIuZXJyb3IoZXJyKTtcbn0pO1xuIl19