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
  fulcrum.logger.error(err);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2NvbW1hbmRzL2NsaS5qcyJdLCJuYW1lcyI6WyIkMCIsInJlcXVpcmUiLCJpbnN0YWxsIiwiQ09NTUFORFMiLCJDTEkiLCJ3cmFwQXN5bmMiLCJvYmoiLCJyZXNvbHZlIiwicmVqZWN0IiwiX19jb21tYW5kIiwiY29tbWFuZCIsImJpbmQiLCJhcmdzIiwiaGFuZGxlciIsInJlc3VsdCIsInRoZW4iLCJjYXRjaCIsInNldHVwIiwiYXBwIiwiY29sb3JzIiwiZW5hYmxlZCIsImRlYnVnc3FsIiwiZGVidWciLCJmdWxjcnVtIiwibG9nZ2VyIiwibG9nIiwiaW5pdGlhbGl6ZSIsImRlc3Ryb3kiLCJkaXNwb3NlIiwicnVuIiwiY2xpIiwieWFyZ3MiLCJ1c2FnZSIsInByb21pc2VSZXNvbHZlIiwicHJvbWlzZVJlamVjdCIsImNvbXBsZXRpb24iLCJQcm9taXNlIiwiQ29tbWFuZENsYXNzIiwiY29tbWFuZENsaSIsInRhc2siLCJwbHVnaW4iLCJfcGx1Z2lucyIsInBsdWdpbkNvbW1hbmQiLCJhcmd2IiwiZGVtYW5kQ29tbWFuZCIsInZlcnNpb24iLCJoZWxwIiwiZGIiLCJmZXRjaEFjY291bnQiLCJuYW1lIiwid2hlcmUiLCJvcmdhbml6YXRpb25fbmFtZSIsImFjY291bnRzIiwiZmluZEFsbCIsImNyZWF0ZURhdGFTb3VyY2UiLCJhY2NvdW50IiwiZGF0YVNvdXJjZSIsImxvY2FsRGF0YWJhc2UiLCJhZGQiLCJsb2FkIiwic3RhcnQiLCJwcm9jZXNzIiwib24iLCJleGl0IiwiZXJyIiwiZXJyb3IiLCJzdGFjayJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFFQTs7Ozs7O0FBRUEsZ0JBQU1BLEVB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Y0FBUUMsRUFBUixDQUFXLFFBQVgsRUFBcUIsWUFBVztBQUM5QkQsZ0JBQVFFLElBQVI7QUFDRCxPQUZEOztBQUlBLFVBQUk7QUFDRixjQUFNLE9BQUs5QyxLQUFMLEVBQU47QUFDQSxjQUFNLE9BQUtZLEdBQUwsRUFBTjtBQUNBLGNBQU0sT0FBS0YsT0FBTCxFQUFOO0FBQ0QsT0FKRCxDQUlFLE9BQU9xQyxHQUFQLEVBQVk7QUFDWnpDLGdCQUFRQyxNQUFSLENBQWV5QyxLQUFmLENBQXFCRCxJQUFJRSxLQUF6QjtBQUNBLGNBQU0sT0FBS3ZDLE9BQUwsRUFBTjtBQUNEOztBQUVEO0FBQ0FrQyxjQUFRRSxJQUFSO0FBaEJZO0FBaUJiOztBQUVEO0FBMUl1Qjs7a0JBQUozRCxHO0FBa0tyQixJQUFJQSxHQUFKLEdBQVV3RCxLQUFWLEdBQWtCN0MsSUFBbEIsQ0FBdUIsTUFBTSxDQUM1QixDQURELEVBQ0dDLEtBREgsQ0FDVWdELEdBQUQsSUFBUztBQUNoQnpDLFVBQVFDLE1BQVIsQ0FBZXlDLEtBQWYsQ0FBcUJELEdBQXJCO0FBQ0QsQ0FIRCIsImZpbGUiOiJjbGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29sb3JzIGZyb20gJ2NvbG9ycyc7XG5pbXBvcnQgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuaW1wb3J0IEFjY291bnQgZnJvbSAnLi4vbW9kZWxzL2FjY291bnQnO1xuaW1wb3J0IHsgRGF0YVNvdXJjZSB9IGZyb20gJ2Z1bGNydW0tY29yZSc7XG5pbXBvcnQgTG9jYWxEYXRhYmFzZURhdGFTb3VyY2UgZnJvbSAnLi4vbG9jYWwtZGF0YWJhc2UtZGF0YS1zb3VyY2UnO1xuaW1wb3J0IGFwcCBmcm9tICcuLi9hcHAnO1xuXG5pbXBvcnQgU2V0dXAgZnJvbSAnLi9zZXR1cCc7XG5pbXBvcnQgSW5zdGFsbFBsdWdpbiBmcm9tICcuL2luc3RhbGwtcGx1Z2luJztcbmltcG9ydCBDcmVhdGVQbHVnaW4gZnJvbSAnLi9jcmVhdGUtcGx1Z2luJztcbmltcG9ydCBVcGRhdGVQbHVnaW5zIGZyb20gJy4vdXBkYXRlLXBsdWdpbnMnO1xuaW1wb3J0IEJ1aWxkUGx1Z2lucyBmcm9tICcuL2J1aWxkLXBsdWdpbnMnO1xuaW1wb3J0IFdhdGNoUGx1Z2lucyBmcm9tICcuL3dhdGNoLXBsdWdpbnMnO1xuaW1wb3J0IFN5bmMgZnJvbSAnLi9zeW5jJztcbmltcG9ydCBRdWVyeSBmcm9tICcuL3F1ZXJ5JztcbmltcG9ydCBSZXNldCBmcm9tICcuL3Jlc2V0JztcbmltcG9ydCBDb25zb2xlIGZyb20gJy4vY29uc29sZSc7XG5pbXBvcnQgZnVsY3J1bVBhY2thZ2UgZnJvbSAnLi4vLi4vdmVyc2lvbic7XG5cbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnbWluaWRiJztcblxueWFyZ3MuJDAgPSAnZnVsY3J1bSc7XG5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcblxuY29uc3QgQ09NTUFORFMgPSBbXG4gIFNldHVwLFxuICBTeW5jLFxuICBSZXNldCxcbiAgSW5zdGFsbFBsdWdpbixcbiAgQ3JlYXRlUGx1Z2luLFxuICBVcGRhdGVQbHVnaW5zLFxuICBCdWlsZFBsdWdpbnMsXG4gIFdhdGNoUGx1Z2lucyxcbiAgUXVlcnksXG4gIENvbnNvbGVcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENMSSB7XG4gIGFzeW5jIHNldHVwKCkge1xuICAgIHRoaXMuYXBwID0gYXBwO1xuXG4gICAgaWYgKHRoaXMuYXJncy5jb2xvcnMgPT09IGZhbHNlKSB7XG4gICAgICBjb2xvcnMuZW5hYmxlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmFyZ3MuZGVidWdzcWwpIHtcbiAgICAgIERhdGFiYXNlLmRlYnVnID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hcmdzLmRlYnVnKSB7XG4gICAgICBmdWxjcnVtLmxvZ2dlci5sb2codGhpcy5hcmdzKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5pbml0aWFsaXplKCk7XG4gIH1cblxuICBhc3luYyBkZXN0cm95KCkge1xuICAgIGF3YWl0IHRoaXMuYXBwLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bigpIHtcbiAgICBsZXQgY2xpID0gdGhpcy55YXJncy51c2FnZSgnVXNhZ2U6IGZ1bGNydW0gPGNtZD4gW2FyZ3NdJyk7XG5cbiAgICBjbGkuJDAgPSAnZnVsY3J1bSc7XG5cbiAgICAvLyB0aGlzIGlzIHNvbWUgaGFja3MgdG8gY29vcmRpbmF0ZSB0aGUgeWFyZ3MgaGFuZGxlciBmdW5jdGlvbiB3aXRoIHRoaXMgYXN5bmMgZnVuY3Rpb24uXG4gICAgLy8gaWYgeWFyZ3MgYWRkcyBzdXBwb3J0IGZvciBwcm9taXNlcyBpbiB0aGUgY29tbWFuZCBoYW5kbGVycyB0aGlzIGNhbiBnbyBhd2F5LlxuICAgIGxldCBwcm9taXNlUmVzb2x2ZSA9IG51bGw7XG4gICAgbGV0IHByb21pc2VSZWplY3QgPSBudWxsO1xuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHByb21pc2VSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHByb21pc2VSZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG5cbiAgICAvLyBjbGkgPSBhd2FpdCB0aGlzLmFkZERlZmF1bHQodGhpcy53cmFwQXN5bmMoY2xpLCBwcm9taXNlUmVzb2x2ZSwgcHJvbWlzZVJlamVjdCkpO1xuXG4gICAgZm9yIChjb25zdCBDb21tYW5kQ2xhc3Mgb2YgQ09NTUFORFMpIHtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgQ29tbWFuZENsYXNzKCk7XG5cbiAgICAgIGNvbW1hbmQuYXBwID0gdGhpcy5hcHA7XG5cbiAgICAgIGNvbnN0IGNvbW1hbmRDbGkgPSBhd2FpdCBjb21tYW5kLnRhc2sodGhpcy53cmFwQXN5bmMoY2xpLCBwcm9taXNlUmVzb2x2ZSwgcHJvbWlzZVJlamVjdCkpO1xuXG4gICAgICBpZiAoY29tbWFuZENsaSkge1xuICAgICAgICBjbGkgPSBjb21tYW5kQ2xpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgcGx1Z2luIG9mIHRoaXMuYXBwLl9wbHVnaW5zKSB7XG4gICAgICBpZiAocGx1Z2luLnRhc2spIHtcbiAgICAgICAgY29uc3QgcGx1Z2luQ29tbWFuZCA9IGF3YWl0IHBsdWdpbi50YXNrKHRoaXMud3JhcEFzeW5jKGNsaSwgcHJvbWlzZVJlc29sdmUsIHByb21pc2VSZWplY3QpKTtcblxuICAgICAgICBpZiAocGx1Z2luQ29tbWFuZCkge1xuICAgICAgICAgIGNsaSA9IHBsdWdpbkNvbW1hbmQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmFyZ3YgPVxuICAgICAgY2xpLmRlbWFuZENvbW1hbmQoKVxuICAgICAgICAgLnZlcnNpb24oZnVsY3J1bVBhY2thZ2UudmVyc2lvbilcbiAgICAgICAgIC5oZWxwKClcbiAgICAgICAgIC5hcmd2O1xuXG4gICAgYXdhaXQgY29tcGxldGlvbjtcbiAgfVxuXG4gIC8vIGFkZERlZmF1bHQgPSBhc3luYyAoY2xpKSA9PiB7XG4gIC8vICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcbiAgLy8gICAgIGNvbW1hbmQ6ICd5b3lvJyxcbiAgLy8gICAgIGRlc2M6ICd5eW8nLFxuICAvLyAgICAgYnVpbGRlcjoge30sXG4gIC8vICAgICBoYW5kbGVyOiB0aGlzLnJ1bkRlZmF1bHRDb21tYW5kXG4gIC8vICAgfSk7XG4gIC8vIH1cblxuICAvLyBydW5EZWZhdWx0Q29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgLy8gfVxuXG4gIGdldCBkYigpIHtcbiAgICByZXR1cm4gdGhpcy5hcHAuZGI7XG4gIH1cblxuICBnZXQgeWFyZ3MoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnlhcmdzO1xuICB9XG5cbiAgZ2V0IGFyZ3MoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnlhcmdzLmFyZ3Y7XG4gIH1cblxuICBhc3luYyBmZXRjaEFjY291bnQobmFtZSkge1xuICAgIGNvbnN0IHdoZXJlID0ge307XG5cbiAgICBpZiAobmFtZSkge1xuICAgICAgd2hlcmUub3JnYW5pemF0aW9uX25hbWUgPSBuYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnRzID0gYXdhaXQgQWNjb3VudC5maW5kQWxsKHRoaXMuZGIsIHdoZXJlKTtcblxuICAgIHJldHVybiBhY2NvdW50cztcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZURhdGFTb3VyY2UoYWNjb3VudCkge1xuICAgIGxldCBkYXRhU291cmNlID0gbmV3IERhdGFTb3VyY2UoKTtcblxuICAgIGNvbnN0IGxvY2FsRGF0YWJhc2UgPSBuZXcgTG9jYWxEYXRhYmFzZURhdGFTb3VyY2UoYWNjb3VudCk7XG5cbiAgICBkYXRhU291cmNlLmFkZChsb2NhbERhdGFiYXNlKTtcblxuICAgIGF3YWl0IGxvY2FsRGF0YWJhc2UubG9hZCh0aGlzLmRiKTtcblxuICAgIHJldHVybiBkYXRhU291cmNlO1xuICB9XG5cbiAgYXN5bmMgc3RhcnQoKSB7XG4gICAgLy8gVE9ETyh6aG0pIHJlcXVpcmVkIG9yIGl0IGhhbmdzIGZvciB+MzBzZWMgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uL2VsZWN0cm9uL2lzc3Vlcy80OTQ0XG4gICAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgICBwcm9jZXNzLmV4aXQoKTtcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNldHVwKCk7XG4gICAgICBhd2FpdCB0aGlzLnJ1bigpO1xuICAgICAgYXdhaXQgdGhpcy5kZXN0cm95KCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBmdWxjcnVtLmxvZ2dlci5lcnJvcihlcnIuc3RhY2spO1xuICAgICAgYXdhaXQgdGhpcy5kZXN0cm95KCk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyh6aG0pIHJlcXVpcmVkIG9yIGl0IGhhbmdzIGZvciB+MzBzZWMgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uL2VsZWN0cm9uL2lzc3Vlcy80OTQ0XG4gICAgcHJvY2Vzcy5leGl0KCk7XG4gIH1cblxuICAvLyB0aGlzIGhhY2tzIHRoZSB5YXJncyBjb21tYW5kIGhhbmRsZXIgdG8gYWxsb3cgaXQgdG8gcmV0dXJuIGEgcHJvbWlzZSAoYXN5bmMgZnVuY3Rpb24pXG4gIHdyYXBBc3luYyA9IChvYmosIHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IF9fY29tbWFuZCA9IG9iai5jb21tYW5kLmJpbmQob2JqKTtcblxuICAgIG9iai5jb21tYW5kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmIChhcmdzICYmIGFyZ3NbMF0gJiYgYXJnc1swXS5oYW5kbGVyKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBhcmdzWzBdLmhhbmRsZXI7XG5cbiAgICAgICAgYXJnc1swXS5oYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZXIoKTtcblxuICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnRoZW4pIHtcbiAgICAgICAgICAgIHJlc3VsdC50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gX19jb21tYW5kKC4uLmFyZ3MpO1xuICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG59XG5cbm5ldyBDTEkoKS5zdGFydCgpLnRoZW4oKCkgPT4ge1xufSkuY2F0Y2goKGVycikgPT4ge1xuICBmdWxjcnVtLmxvZ2dlci5lcnJvcihlcnIpO1xufSk7XG4iXX0=