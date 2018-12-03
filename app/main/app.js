'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _database = require('./db/database');

var _database2 = _interopRequireDefault(_database);

var _api = require('./api');

var _api2 = _interopRequireDefault(_api);

var _environment = require('./environment');

var _environment2 = _interopRequireDefault(_environment);

var _account = require('./models/account');

var _account2 = _interopRequireDefault(_account);

var _localDatabaseDataSource = require('./local-database-data-source');

var _localDatabaseDataSource2 = _interopRequireDefault(_localDatabaseDataSource);

var _fulcrumCore = require('fulcrum-core');

var _applicationPaths = require('../application-paths');

var _applicationPaths2 = _interopRequireDefault(_applicationPaths);

var _pluginLogger = require('./plugin-logger');

var _pluginLogger2 = _interopRequireDefault(_pluginLogger);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

let app = null;

class App {
  static get instance() {
    return app;
  }

  constructor() {
    this._plugins = [];
    this._pluginsByName = [];
    this._listeners = {};
    this._api = _api2.default;

    const pathOverride = this.args.homePath;

    this._appPath = pathOverride || _applicationPaths2.default.userData;
    this._homePath = pathOverride || _path2.default.join(_os2.default.homedir(), '.fulcrum');
    this._dataPath = this.args.dataPath || this.appPath('data');
    this._logPath = this.args.logPath || this.appPath('log');
    this._pluginPath = this.path('plugins');

    _mkdirp2.default.sync(this._appPath);
    _mkdirp2.default.sync(this._homePath);
    _mkdirp2.default.sync(this._dataPath);
    _mkdirp2.default.sync(this._logPath);
    _mkdirp2.default.sync(this._pluginPath);

    this._logger = new _logger2.default(this._logPath);

    this._environment = new _environment2.default({ app: this });
  }

  get environment() {
    return this._environment;
  }

  get api() {
    return this._api;
  }

  get yargs() {
    if (!this._yargs) {
      this._yargs = _yargs2.default.env('FULCRUM');
    }
    return this._yargs;
  }

  get args() {
    return this.yargs.argv;
  }

  appPath(name) {
    return _path2.default.join(this._appPath, name);
  }

  appDir(name) {
    return this.appPath(name);
  }

  path(name) {
    return _path2.default.join(this._homePath, name);
  }

  dir(name) {
    return this.path(name);
  }

  mkdirp(name) {
    _mkdirp2.default.sync(this.path(name));
  }

  get pluginPath() {
    return this._pluginPath;
  }

  get dataPath() {
    return this._dataPath;
  }

  get databaseFilePath() {
    return _path2.default.join(this.dataPath, 'fulcrum.db');
  }

  get logPath() {
    return this._logPath;
  }

  get db() {
    return this._db;
  }

  on(name, func) {
    if (!this._listeners[name]) {
      this._listeners[name] = [];
    }

    this._listeners[name].push(func);
  }

  off(name, func) {
    if (this._listeners[name]) {
      const index = this._listeners.indexOf(func);

      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    }
  }

  emit(name, ...args) {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (_this._listeners[name]) {
        for (const listener of _this._listeners[name]) {
          yield listener(...args);
        }
      }
    })();
  }

  initialize() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      _this2._db = yield (0, _database2.default)({ file: _this2.databaseFilePath });

      if (!_this2.args.safe) {
        yield _this2.initializePlugins();
      }
    })();
  }

  dispose() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      for (const plugin of _this3._plugins) {
        if (plugin.deactivate) {
          yield plugin.deactivate();
        }
      }

      if (_this3._db) {
        yield _this3._db.close();
      }
    })();
  }

  initializePlugins() {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      const pluginPaths = _glob2.default.sync(_path2.default.join(_this4.pluginPath, '*'));

      for (const pluginPath of pluginPaths) {
        const fullPath = _path2.default.resolve(pluginPath);

        const logger = (0, _pluginLogger2.default)(pluginPath);

        try {
          const pluginModule = require(fullPath);

          const PluginClass = pluginModule.default || pluginModule;

          const plugin = new PluginClass();

          const nameParts = _path2.default.dirname(fullPath).split(_path2.default.sep);
          const name = nameParts[nameParts.length - 1].replace(/^fulcrum-desktop-/, '');

          _this4._pluginsByName[name] = plugin;
          _this4._plugins.push(plugin);

          if (_this4.args.debug) {
            logger.error('Loading plugin', fullPath);
          }
        } catch (ex) {
          logger.error('Failed to load plugin', ex);
          logger.error('This is most likely an error in the plugin.');
        }
      }
    })();
  }

  activatePlugins() {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      for (const plugin of _this5._plugins) {
        yield plugin.activate();
      }
    })();
  }

  fetchAccount(name) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const where = {};

      if (name) {
        where.organization_name = name;
      }

      const accounts = yield _account2.default.findAll(_this6.db, where, 'updated_at DESC');

      return accounts[0];
    })();
  }

  createDataSource(account) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      let dataSource = new _fulcrumCore.DataSource();

      const localDatabase = new _localDatabaseDataSource2.default(account);

      dataSource.add(localDatabase);

      yield localDatabase.load(_this7.db);

      return dataSource;
    })();
  }
}

app = new App();

_environment2.default.app = app;

global.__app__ = app;
global.__api__ = _api2.default;
global.fulcrum = app.environment;

exports.default = app;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2FwcC5qcyJdLCJuYW1lcyI6WyJhcHAiLCJBcHAiLCJpbnN0YW5jZSIsImNvbnN0cnVjdG9yIiwiX3BsdWdpbnMiLCJfcGx1Z2luc0J5TmFtZSIsIl9saXN0ZW5lcnMiLCJfYXBpIiwicGF0aE92ZXJyaWRlIiwiYXJncyIsImhvbWVQYXRoIiwiX2FwcFBhdGgiLCJ1c2VyRGF0YSIsIl9ob21lUGF0aCIsImpvaW4iLCJob21lZGlyIiwiX2RhdGFQYXRoIiwiZGF0YVBhdGgiLCJhcHBQYXRoIiwiX2xvZ1BhdGgiLCJsb2dQYXRoIiwiX3BsdWdpblBhdGgiLCJwYXRoIiwic3luYyIsIl9sb2dnZXIiLCJfZW52aXJvbm1lbnQiLCJlbnZpcm9ubWVudCIsImFwaSIsInlhcmdzIiwiX3lhcmdzIiwiZW52IiwiYXJndiIsIm5hbWUiLCJhcHBEaXIiLCJkaXIiLCJta2RpcnAiLCJwbHVnaW5QYXRoIiwiZGF0YWJhc2VGaWxlUGF0aCIsImRiIiwiX2RiIiwib24iLCJmdW5jIiwicHVzaCIsIm9mZiIsImluZGV4IiwiaW5kZXhPZiIsInNwbGljZSIsImVtaXQiLCJsaXN0ZW5lciIsImluaXRpYWxpemUiLCJmaWxlIiwic2FmZSIsImluaXRpYWxpemVQbHVnaW5zIiwiZGlzcG9zZSIsInBsdWdpbiIsImRlYWN0aXZhdGUiLCJjbG9zZSIsInBsdWdpblBhdGhzIiwiZnVsbFBhdGgiLCJyZXNvbHZlIiwibG9nZ2VyIiwicGx1Z2luTW9kdWxlIiwicmVxdWlyZSIsIlBsdWdpbkNsYXNzIiwiZGVmYXVsdCIsIm5hbWVQYXJ0cyIsImRpcm5hbWUiLCJzcGxpdCIsInNlcCIsImxlbmd0aCIsInJlcGxhY2UiLCJkZWJ1ZyIsImVycm9yIiwiZXgiLCJhY3RpdmF0ZVBsdWdpbnMiLCJhY3RpdmF0ZSIsImZldGNoQWNjb3VudCIsIndoZXJlIiwib3JnYW5pemF0aW9uX25hbWUiLCJhY2NvdW50cyIsImZpbmRBbGwiLCJjcmVhdGVEYXRhU291cmNlIiwiYWNjb3VudCIsImRhdGFTb3VyY2UiLCJsb2NhbERhdGFiYXNlIiwiYWRkIiwibG9hZCIsImdsb2JhbCIsIl9fYXBwX18iLCJfX2FwaV9fIiwiZnVsY3J1bSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsSUFBSUEsTUFBTSxJQUFWOztBQUVBLE1BQU1DLEdBQU4sQ0FBVTtBQUNSLGFBQVdDLFFBQVgsR0FBc0I7QUFDcEIsV0FBT0YsR0FBUDtBQUNEOztBQUVERyxnQkFBYztBQUNaLFNBQUtDLFFBQUwsR0FBZ0IsRUFBaEI7QUFDQSxTQUFLQyxjQUFMLEdBQXNCLEVBQXRCO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQixFQUFsQjtBQUNBLFNBQUtDLElBQUw7O0FBRUEsVUFBTUMsZUFBZSxLQUFLQyxJQUFMLENBQVVDLFFBQS9COztBQUVBLFNBQUtDLFFBQUwsR0FBZ0JILGdCQUFnQiwyQkFBTUksUUFBdEM7QUFDQSxTQUFLQyxTQUFMLEdBQWlCTCxnQkFBZ0IsZUFBS00sSUFBTCxDQUFVLGFBQUdDLE9BQUgsRUFBVixFQUF3QixVQUF4QixDQUFqQztBQUNBLFNBQUtDLFNBQUwsR0FBaUIsS0FBS1AsSUFBTCxDQUFVUSxRQUFWLElBQXNCLEtBQUtDLE9BQUwsQ0FBYSxNQUFiLENBQXZDO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixLQUFLVixJQUFMLENBQVVXLE9BQVYsSUFBcUIsS0FBS0YsT0FBTCxDQUFhLEtBQWIsQ0FBckM7QUFDQSxTQUFLRyxXQUFMLEdBQW1CLEtBQUtDLElBQUwsQ0FBVSxTQUFWLENBQW5COztBQUVBLHFCQUFPQyxJQUFQLENBQVksS0FBS1osUUFBakI7QUFDQSxxQkFBT1ksSUFBUCxDQUFZLEtBQUtWLFNBQWpCO0FBQ0EscUJBQU9VLElBQVAsQ0FBWSxLQUFLUCxTQUFqQjtBQUNBLHFCQUFP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QUF4QixDQUFOOztBQUVBLGFBQU82QyxVQUFQO0FBVDhCO0FBVS9CO0FBbE1POztBQXFNVm5GLE1BQU0sSUFBSUMsR0FBSixFQUFOOztBQUVBLHNCQUFZRCxHQUFaLEdBQWtCQSxHQUFsQjs7QUFFQXVGLE9BQU9DLE9BQVAsR0FBaUJ4RixHQUFqQjtBQUNBdUYsT0FBT0UsT0FBUDtBQUNBRixPQUFPRyxPQUFQLEdBQWlCMUYsSUFBSTBCLFdBQXJCOztrQkFFZTFCLEciLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB5YXJncyBmcm9tICd5YXJncyc7XG5pbXBvcnQgbWtkaXJwIGZyb20gJ21rZGlycCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IGRhdGFiYXNlIGZyb20gJy4vZGIvZGF0YWJhc2UnO1xuaW1wb3J0IGFwaSBmcm9tICcuL2FwaSc7XG5pbXBvcnQgRW52aXJvbm1lbnQgZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQgQWNjb3VudCBmcm9tICcuL21vZGVscy9hY2NvdW50JztcbmltcG9ydCBMb2NhbERhdGFiYXNlRGF0YVNvdXJjZSBmcm9tICcuL2xvY2FsLWRhdGFiYXNlLWRhdGEtc291cmNlJztcbmltcG9ydCB7IERhdGFTb3VyY2UgfSBmcm9tICdmdWxjcnVtLWNvcmUnO1xuaW1wb3J0IHBhdGhzIGZyb20gJy4uL2FwcGxpY2F0aW9uLXBhdGhzJztcbmltcG9ydCBwbHVnaW5Mb2dnZXIgZnJvbSAnLi9wbHVnaW4tbG9nZ2VyJztcbmltcG9ydCBMb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuXG5sZXQgYXBwID0gbnVsbDtcblxuY2xhc3MgQXBwIHtcbiAgc3RhdGljIGdldCBpbnN0YW5jZSgpIHtcbiAgICByZXR1cm4gYXBwO1xuICB9XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fcGx1Z2lucyA9IFtdO1xuICAgIHRoaXMuX3BsdWdpbnNCeU5hbWUgPSBbXTtcbiAgICB0aGlzLl9saXN0ZW5lcnMgPSB7fTtcbiAgICB0aGlzLl9hcGkgPSBhcGk7XG5cbiAgICBjb25zdCBwYXRoT3ZlcnJpZGUgPSB0aGlzLmFyZ3MuaG9tZVBhdGg7XG5cbiAgICB0aGlzLl9hcHBQYXRoID0gcGF0aE92ZXJyaWRlIHx8IHBhdGhzLnVzZXJEYXRhO1xuICAgIHRoaXMuX2hvbWVQYXRoID0gcGF0aE92ZXJyaWRlIHx8IHBhdGguam9pbihvcy5ob21lZGlyKCksICcuZnVsY3J1bScpO1xuICAgIHRoaXMuX2RhdGFQYXRoID0gdGhpcy5hcmdzLmRhdGFQYXRoIHx8IHRoaXMuYXBwUGF0aCgnZGF0YScpO1xuICAgIHRoaXMuX2xvZ1BhdGggPSB0aGlzLmFyZ3MubG9nUGF0aCB8fCB0aGlzLmFwcFBhdGgoJ2xvZycpO1xuICAgIHRoaXMuX3BsdWdpblBhdGggPSB0aGlzLnBhdGgoJ3BsdWdpbnMnKTtcblxuICAgIG1rZGlycC5zeW5jKHRoaXMuX2FwcFBhdGgpO1xuICAgIG1rZGlycC5zeW5jKHRoaXMuX2hvbWVQYXRoKTtcbiAgICBta2RpcnAuc3luYyh0aGlzLl9kYXRhUGF0aCk7XG4gICAgbWtkaXJwLnN5bmModGhpcy5fbG9nUGF0aCk7XG4gICAgbWtkaXJwLnN5bmModGhpcy5fcGx1Z2luUGF0aCk7XG5cbiAgICB0aGlzLl9sb2dnZXIgPSBuZXcgTG9nZ2VyKHRoaXMuX2xvZ1BhdGgpO1xuXG4gICAgdGhpcy5fZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoe2FwcDogdGhpc30pO1xuICB9XG5cbiAgZ2V0IGVudmlyb25tZW50KCkge1xuICAgIHJldHVybiB0aGlzLl9lbnZpcm9ubWVudDtcbiAgfVxuXG4gIGdldCBhcGkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FwaTtcbiAgfVxuXG4gIGdldCB5YXJncygpIHtcbiAgICBpZiAoIXRoaXMuX3lhcmdzKSB7XG4gICAgICB0aGlzLl95YXJncyA9IHlhcmdzLmVudignRlVMQ1JVTScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5feWFyZ3M7XG4gIH1cblxuICBnZXQgYXJncygpIHtcbiAgICByZXR1cm4gdGhpcy55YXJncy5hcmd2O1xuICB9XG5cbiAgYXBwUGF0aChuYW1lKSB7XG4gICAgcmV0dXJuIHBhdGguam9pbih0aGlzLl9hcHBQYXRoLCBuYW1lKTtcbiAgfVxuXG4gIGFwcERpcihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwUGF0aChuYW1lKTtcbiAgfVxuXG4gIHBhdGgobmFtZSkge1xuICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy5faG9tZVBhdGgsIG5hbWUpO1xuICB9XG5cbiAgZGlyKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5wYXRoKG5hbWUpO1xuICB9XG5cbiAgbWtkaXJwKG5hbWUpIHtcbiAgICBta2RpcnAuc3luYyh0aGlzLnBhdGgobmFtZSkpO1xuICB9XG5cbiAgZ2V0IHBsdWdpblBhdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsdWdpblBhdGg7XG4gIH1cblxuICBnZXQgZGF0YVBhdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGFQYXRoO1xuICB9XG5cbiAgZ2V0IGRhdGFiYXNlRmlsZVBhdGgoKSB7XG4gICAgcmV0dXJuIHBhdGguam9pbih0aGlzLmRhdGFQYXRoLCAnZnVsY3J1bS5kYicpO1xuICB9XG5cbiAgZ2V0IGxvZ1BhdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvZ1BhdGg7XG4gIH1cblxuICBnZXQgZGIoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RiO1xuICB9XG5cbiAgb24obmFtZSwgZnVuYykge1xuICAgIGlmICghdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcbiAgICB9XG5cbiAgICB0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChmdW5jKTtcbiAgfVxuXG4gIG9mZihuYW1lLCBmdW5jKSB7XG4gICAgaWYgKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xuICAgICAgY29uc3QgaW5kZXggPSB0aGlzLl9saXN0ZW5lcnMuaW5kZXhPZihmdW5jKTtcblxuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgdGhpcy5fbGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZW1pdChuYW1lLCAuLi5hcmdzKSB7XG4gICAgaWYgKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xuICAgICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcbiAgICAgICAgYXdhaXQgbGlzdGVuZXIoLi4uYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICB0aGlzLl9kYiA9IGF3YWl0IGRhdGFiYXNlKHtmaWxlOiB0aGlzLmRhdGFiYXNlRmlsZVBhdGh9KTtcblxuICAgIGlmICghdGhpcy5hcmdzLnNhZmUpIHtcbiAgICAgIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZVBsdWdpbnMoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkaXNwb3NlKCkge1xuICAgIGZvciAoY29uc3QgcGx1Z2luIG9mIHRoaXMuX3BsdWdpbnMpIHtcbiAgICAgIGlmIChwbHVnaW4uZGVhY3RpdmF0ZSkge1xuICAgICAgICBhd2FpdCBwbHVnaW4uZGVhY3RpdmF0ZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9kYikge1xuICAgICAgYXdhaXQgdGhpcy5fZGIuY2xvc2UoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbml0aWFsaXplUGx1Z2lucygpIHtcbiAgICBjb25zdCBwbHVnaW5QYXRocyA9IGdsb2Iuc3luYyhwYXRoLmpvaW4odGhpcy5wbHVnaW5QYXRoLCAnKicpKTtcblxuICAgIGZvciAoY29uc3QgcGx1Z2luUGF0aCBvZiBwbHVnaW5QYXRocykge1xuICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUocGx1Z2luUGF0aCk7XG5cbiAgICAgIGNvbnN0IGxvZ2dlciA9IHBsdWdpbkxvZ2dlcihwbHVnaW5QYXRoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGx1Z2luTW9kdWxlID0gcmVxdWlyZShmdWxsUGF0aCk7XG5cbiAgICAgICAgY29uc3QgUGx1Z2luQ2xhc3MgPSBwbHVnaW5Nb2R1bGUuZGVmYXVsdCB8fCBwbHVnaW5Nb2R1bGU7XG5cbiAgICAgICAgY29uc3QgcGx1Z2luID0gbmV3IFBsdWdpbkNsYXNzKCk7XG5cbiAgICAgICAgY29uc3QgbmFtZVBhcnRzID0gcGF0aC5kaXJuYW1lKGZ1bGxQYXRoKS5zcGxpdChwYXRoLnNlcCk7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBuYW1lUGFydHNbbmFtZVBhcnRzLmxlbmd0aCAtIDFdLnJlcGxhY2UoL15mdWxjcnVtLWRlc2t0b3AtLywgJycpO1xuXG4gICAgICAgIHRoaXMuX3BsdWdpbnNCeU5hbWVbbmFtZV0gPSBwbHVnaW47XG4gICAgICAgIHRoaXMuX3BsdWdpbnMucHVzaChwbHVnaW4pO1xuXG4gICAgICAgIGlmICh0aGlzLmFyZ3MuZGVidWcpIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0xvYWRpbmcgcGx1Z2luJywgZnVsbFBhdGgpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBsb2FkIHBsdWdpbicsIGV4KTtcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdUaGlzIGlzIG1vc3QgbGlrZWx5IGFuIGVycm9yIGluIHRoZSBwbHVnaW4uJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGVQbHVnaW5zKCkge1xuICAgIGZvciAoY29uc3QgcGx1Z2luIG9mIHRoaXMuX3BsdWdpbnMpIHtcbiAgICAgIGF3YWl0IHBsdWdpbi5hY3RpdmF0ZSgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGZldGNoQWNjb3VudChuYW1lKSB7XG4gICAgY29uc3Qgd2hlcmUgPSB7fTtcblxuICAgIGlmIChuYW1lKSB7XG4gICAgICB3aGVyZS5vcmdhbml6YXRpb25fbmFtZSA9IG5hbWU7XG4gICAgfVxuXG4gICAgY29uc3QgYWNjb3VudHMgPSBhd2FpdCBBY2NvdW50LmZpbmRBbGwodGhpcy5kYiwgd2hlcmUsICd1cGRhdGVkX2F0IERFU0MnKTtcblxuICAgIHJldHVybiBhY2NvdW50c1swXTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZURhdGFTb3VyY2UoYWNjb3VudCkge1xuICAgIGxldCBkYXRhU291cmNlID0gbmV3IERhdGFTb3VyY2UoKTtcblxuICAgIGNvbnN0IGxvY2FsRGF0YWJhc2UgPSBuZXcgTG9jYWxEYXRhYmFzZURhdGFTb3VyY2UoYWNjb3VudCk7XG5cbiAgICBkYXRhU291cmNlLmFkZChsb2NhbERhdGFiYXNlKTtcblxuICAgIGF3YWl0IGxvY2FsRGF0YWJhc2UubG9hZCh0aGlzLmRiKTtcblxuICAgIHJldHVybiBkYXRhU291cmNlO1xuICB9XG59XG5cbmFwcCA9IG5ldyBBcHAoKTtcblxuRW52aXJvbm1lbnQuYXBwID0gYXBwO1xuXG5nbG9iYWwuX19hcHBfXyA9IGFwcDtcbmdsb2JhbC5fX2FwaV9fID0gYXBpO1xuZ2xvYmFsLmZ1bGNydW0gPSBhcHAuZW52aXJvbm1lbnQ7XG5cbmV4cG9ydCBkZWZhdWx0IGFwcDtcbiJdfQ==