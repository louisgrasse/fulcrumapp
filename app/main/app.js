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

  get pluginsByName() {
    return this._pluginsByName;
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

          const nameParts = fullPath.split(_path2.default.sep);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2FwcC5qcyJdLCJuYW1lcyI6WyJhcHAiLCJBcHAiLCJpbnN0YW5jZSIsImNvbnN0cnVjdG9yIiwiX3BsdWdpbnMiLCJfcGx1Z2luc0J5TmFtZSIsIl9saXN0ZW5lcnMiLCJfYXBpIiwicGF0aE92ZXJyaWRlIiwiYXJncyIsImhvbWVQYXRoIiwiX2FwcFBhdGgiLCJ1c2VyRGF0YSIsIl9ob21lUGF0aCIsImpvaW4iLCJob21lZGlyIiwiX2RhdGFQYXRoIiwiZGF0YVBhdGgiLCJhcHBQYXRoIiwiX2xvZ1BhdGgiLCJsb2dQYXRoIiwiX3BsdWdpblBhdGgiLCJwYXRoIiwic3luYyIsIl9sb2dnZXIiLCJfZW52aXJvbm1lbnQiLCJwbHVnaW5zQnlOYW1lIiwiZW52aXJvbm1lbnQiLCJhcGkiLCJ5YXJncyIsIl95YXJncyIsImVudiIsImFyZ3YiLCJuYW1lIiwiYXBwRGlyIiwiZGlyIiwibWtkaXJwIiwicGx1Z2luUGF0aCIsImRhdGFiYXNlRmlsZVBhdGgiLCJkYiIsIl9kYiIsIm9uIiwiZnVuYyIsInB1c2giLCJvZmYiLCJpbmRleCIsImluZGV4T2YiLCJzcGxpY2UiLCJlbWl0IiwibGlzdGVuZXIiLCJpbml0aWFsaXplIiwiZmlsZSIsInNhZmUiLCJpbml0aWFsaXplUGx1Z2lucyIsImRpc3Bvc2UiLCJwbHVnaW4iLCJkZWFjdGl2YXRlIiwiY2xvc2UiLCJwbHVnaW5QYXRocyIsImZ1bGxQYXRoIiwicmVzb2x2ZSIsImxvZ2dlciIsInBsdWdpbk1vZHVsZSIsInJlcXVpcmUiLCJQbHVnaW5DbGFzcyIsImRlZmF1bHQiLCJuYW1lUGFydHMiLCJzcGxpdCIsInNlcCIsImxlbmd0aCIsInJlcGxhY2UiLCJkZWJ1ZyIsImVycm9yIiwiZXgiLCJhY3RpdmF0ZVBsdWdpbnMiLCJhY3RpdmF0ZSIsImZldGNoQWNjb3VudCIsIndoZXJlIiwib3JnYW5pemF0aW9uX25hbWUiLCJhY2NvdW50cyIsImZpbmRBbGwiLCJjcmVhdGVEYXRhU291cmNlIiwiYWNjb3VudCIsImRhdGFTb3VyY2UiLCJsb2NhbERhdGFiYXNlIiwiYWRkIiwibG9hZCIsImdsb2JhbCIsIl9fYXBwX18iLCJfX2FwaV9fIiwiZnVsY3J1bSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsSUFBSUEsTUFBTSxJQUFWOztBQUVBLE1BQU1DLEdBQU4sQ0FBVTtBQUNSLGFBQVdDLFFBQVgsR0FBc0I7QUFDcEIsV0FBT0YsR0FBUDtBQUNEOztBQUVERyxnQkFBYztBQUNaLFNBQUtDLFFBQUwsR0FBZ0IsRUFBaEI7QUFDQSxTQUFLQyxjQUFMLEdBQXNCLEVBQXRCO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQixFQUFsQjtBQUNBLFNBQUtDLElBQUw7O0FBRUEsVUFBTUMsZUFBZSxLQUFLQyxJQUFMLENBQVVDLFFBQS9COztBQUVBLFNBQUtDLFFBQUwsR0FBZ0JILGdCQUFnQiwyQkFBTUksUUFBdEM7QUFDQSxTQUFLQyxTQUFMLEdBQWlCTCxnQkFBZ0IsZUFBS00sSUFBTCxDQUFVLGFBQUdDLE9BQUgsRUFBVixFQUF3QixVQUF4QixDQUFqQztBQUNBLFNBQUtDLFNBQUwsR0FBaUIsS0FBS1AsSUFBTCxDQUFVUSxRQUFWLElBQXNCLEtBQUtDLE9BQUwsQ0FBYSxNQUFiLENBQXZDO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixLQUFLVixJQUFMLENBQVVXLE9BQVYsSUFBcUIsS0FBS0YsT0FBTCxDQUFhLEtBQWIsQ0FBckM7QUFDQSxTQUFLRyxXQUFMLEdBQW1CLEtBQUtDLElBQUwsQ0FBVSxTQUFWLENBQW5COztBQUVBLHFCQUFPQyxJQUFQLENBQVksS0FBS1osUUFBakI7QUFDQSxxQkFBT1ksSUFBUCxDQUFZLEtBQUtWLFNBQWpCO0FBQ0EscUJBQU9VLElBQVAsQ0FBWSxLQUFLUCxTQUFqQjtBQUNB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QUVBLFlBQU1BLGNBQWNFLElBQWQsQ0FBbUIsT0FBSy9DLEVBQXhCLENBQU47O0FBRUEsYUFBTzRDLFVBQVA7QUFUOEI7QUFVL0I7QUF0TU87O0FBeU1WbkYsTUFBTSxJQUFJQyxHQUFKLEVBQU47O0FBRUEsc0JBQVlELEdBQVosR0FBa0JBLEdBQWxCOztBQUVBdUYsT0FBT0MsT0FBUCxHQUFpQnhGLEdBQWpCO0FBQ0F1RixPQUFPRSxPQUFQO0FBQ0FGLE9BQU9HLE9BQVAsR0FBaUIxRixJQUFJMkIsV0FBckI7O2tCQUVlM0IsRyIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCBta2RpcnAgZnJvbSAnbWtkaXJwJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgZGF0YWJhc2UgZnJvbSAnLi9kYi9kYXRhYmFzZSc7XG5pbXBvcnQgYXBpIGZyb20gJy4vYXBpJztcbmltcG9ydCBFbnZpcm9ubWVudCBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCBBY2NvdW50IGZyb20gJy4vbW9kZWxzL2FjY291bnQnO1xuaW1wb3J0IExvY2FsRGF0YWJhc2VEYXRhU291cmNlIGZyb20gJy4vbG9jYWwtZGF0YWJhc2UtZGF0YS1zb3VyY2UnO1xuaW1wb3J0IHsgRGF0YVNvdXJjZSB9IGZyb20gJ2Z1bGNydW0tY29yZSc7XG5pbXBvcnQgcGF0aHMgZnJvbSAnLi4vYXBwbGljYXRpb24tcGF0aHMnO1xuaW1wb3J0IHBsdWdpbkxvZ2dlciBmcm9tICcuL3BsdWdpbi1sb2dnZXInO1xuaW1wb3J0IExvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5cbmxldCBhcHAgPSBudWxsO1xuXG5jbGFzcyBBcHAge1xuICBzdGF0aWMgZ2V0IGluc3RhbmNlKCkge1xuICAgIHJldHVybiBhcHA7XG4gIH1cblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9wbHVnaW5zID0gW107XG4gICAgdGhpcy5fcGx1Z2luc0J5TmFtZSA9IFtdO1xuICAgIHRoaXMuX2xpc3RlbmVycyA9IHt9O1xuICAgIHRoaXMuX2FwaSA9IGFwaTtcblxuICAgIGNvbnN0IHBhdGhPdmVycmlkZSA9IHRoaXMuYXJncy5ob21lUGF0aDtcblxuICAgIHRoaXMuX2FwcFBhdGggPSBwYXRoT3ZlcnJpZGUgfHwgcGF0aHMudXNlckRhdGE7XG4gICAgdGhpcy5faG9tZVBhdGggPSBwYXRoT3ZlcnJpZGUgfHwgcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5mdWxjcnVtJyk7XG4gICAgdGhpcy5fZGF0YVBhdGggPSB0aGlzLmFyZ3MuZGF0YVBhdGggfHwgdGhpcy5hcHBQYXRoKCdkYXRhJyk7XG4gICAgdGhpcy5fbG9nUGF0aCA9IHRoaXMuYXJncy5sb2dQYXRoIHx8IHRoaXMuYXBwUGF0aCgnbG9nJyk7XG4gICAgdGhpcy5fcGx1Z2luUGF0aCA9IHRoaXMucGF0aCgncGx1Z2lucycpO1xuXG4gICAgbWtkaXJwLnN5bmModGhpcy5fYXBwUGF0aCk7XG4gICAgbWtkaXJwLnN5bmModGhpcy5faG9tZVBhdGgpO1xuICAgIG1rZGlycC5zeW5jKHRoaXMuX2RhdGFQYXRoKTtcbiAgICBta2RpcnAuc3luYyh0aGlzLl9sb2dQYXRoKTtcbiAgICBta2RpcnAuc3luYyh0aGlzLl9wbHVnaW5QYXRoKTtcblxuICAgIHRoaXMuX2xvZ2dlciA9IG5ldyBMb2dnZXIodGhpcy5fbG9nUGF0aCk7XG5cbiAgICB0aGlzLl9lbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudCh7YXBwOiB0aGlzfSk7XG4gIH1cblxuICBnZXQgcGx1Z2luc0J5TmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fcGx1Z2luc0J5TmFtZTtcbiAgfVxuXG4gIGdldCBlbnZpcm9ubWVudCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZW52aXJvbm1lbnQ7XG4gIH1cblxuICBnZXQgYXBpKCkge1xuICAgIHJldHVybiB0aGlzLl9hcGk7XG4gIH1cblxuICBnZXQgeWFyZ3MoKSB7XG4gICAgaWYgKCF0aGlzLl95YXJncykge1xuICAgICAgdGhpcy5feWFyZ3MgPSB5YXJncy5lbnYoJ0ZVTENSVU0nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3lhcmdzO1xuICB9XG5cbiAgZ2V0IGFyZ3MoKSB7XG4gICAgcmV0dXJuIHRoaXMueWFyZ3MuYXJndjtcbiAgfVxuXG4gIGFwcFBhdGgobmFtZSkge1xuICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy5fYXBwUGF0aCwgbmFtZSk7XG4gIH1cblxuICBhcHBEaXIobmFtZSkge1xuICAgIHJldHVybiB0aGlzLmFwcFBhdGgobmFtZSk7XG4gIH1cblxuICBwYXRoKG5hbWUpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHRoaXMuX2hvbWVQYXRoLCBuYW1lKTtcbiAgfVxuXG4gIGRpcihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMucGF0aChuYW1lKTtcbiAgfVxuXG4gIG1rZGlycChuYW1lKSB7XG4gICAgbWtkaXJwLnN5bmModGhpcy5wYXRoKG5hbWUpKTtcbiAgfVxuXG4gIGdldCBwbHVnaW5QYXRoKCkge1xuICAgIHJldHVybiB0aGlzLl9wbHVnaW5QYXRoO1xuICB9XG5cbiAgZ2V0IGRhdGFQYXRoKCkge1xuICAgIHJldHVybiB0aGlzLl9kYXRhUGF0aDtcbiAgfVxuXG4gIGdldCBkYXRhYmFzZUZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy5kYXRhUGF0aCwgJ2Z1bGNydW0uZGInKTtcbiAgfVxuXG4gIGdldCBsb2dQYXRoKCkge1xuICAgIHJldHVybiB0aGlzLl9sb2dQYXRoO1xuICB9XG5cbiAgZ2V0IGRiKCkge1xuICAgIHJldHVybiB0aGlzLl9kYjtcbiAgfVxuXG4gIG9uKG5hbWUsIGZ1bmMpIHtcbiAgICBpZiAoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xuICAgICAgdGhpcy5fbGlzdGVuZXJzW25hbWVdID0gW107XG4gICAgfVxuXG4gICAgdGhpcy5fbGlzdGVuZXJzW25hbWVdLnB1c2goZnVuYyk7XG4gIH1cblxuICBvZmYobmFtZSwgZnVuYykge1xuICAgIGlmICh0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzLmluZGV4T2YoZnVuYyk7XG5cbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGVtaXQobmFtZSwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcbiAgICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XG4gICAgICAgIGF3YWl0IGxpc3RlbmVyKC4uLmFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGluaXRpYWxpemUoKSB7XG4gICAgdGhpcy5fZGIgPSBhd2FpdCBkYXRhYmFzZSh7ZmlsZTogdGhpcy5kYXRhYmFzZUZpbGVQYXRofSk7XG5cbiAgICBpZiAoIXRoaXMuYXJncy5zYWZlKSB7XG4gICAgICBhd2FpdCB0aGlzLmluaXRpYWxpemVQbHVnaW5zKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZGlzcG9zZSgpIHtcbiAgICBmb3IgKGNvbnN0IHBsdWdpbiBvZiB0aGlzLl9wbHVnaW5zKSB7XG4gICAgICBpZiAocGx1Z2luLmRlYWN0aXZhdGUpIHtcbiAgICAgICAgYXdhaXQgcGx1Z2luLmRlYWN0aXZhdGUoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZGIpIHtcbiAgICAgIGF3YWl0IHRoaXMuX2RiLmNsb3NlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZVBsdWdpbnMoKSB7XG4gICAgY29uc3QgcGx1Z2luUGF0aHMgPSBnbG9iLnN5bmMocGF0aC5qb2luKHRoaXMucGx1Z2luUGF0aCwgJyonKSk7XG5cbiAgICBmb3IgKGNvbnN0IHBsdWdpblBhdGggb2YgcGx1Z2luUGF0aHMpIHtcbiAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgpO1xuXG4gICAgICBjb25zdCBsb2dnZXIgPSBwbHVnaW5Mb2dnZXIocGx1Z2luUGF0aCk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBsdWdpbk1vZHVsZSA9IHJlcXVpcmUoZnVsbFBhdGgpO1xuXG4gICAgICAgIGNvbnN0IFBsdWdpbkNsYXNzID0gcGx1Z2luTW9kdWxlLmRlZmF1bHQgfHwgcGx1Z2luTW9kdWxlO1xuXG4gICAgICAgIGNvbnN0IHBsdWdpbiA9IG5ldyBQbHVnaW5DbGFzcygpO1xuXG4gICAgICAgIGNvbnN0IG5hbWVQYXJ0cyA9IGZ1bGxQYXRoLnNwbGl0KHBhdGguc2VwKTtcbiAgICAgICAgY29uc3QgbmFtZSA9IG5hbWVQYXJ0c1tuYW1lUGFydHMubGVuZ3RoIC0gMV0ucmVwbGFjZSgvXmZ1bGNydW0tZGVza3RvcC0vLCAnJyk7XG5cbiAgICAgICAgdGhpcy5fcGx1Z2luc0J5TmFtZVtuYW1lXSA9IHBsdWdpbjtcbiAgICAgICAgdGhpcy5fcGx1Z2lucy5wdXNoKHBsdWdpbik7XG5cbiAgICAgICAgaWYgKHRoaXMuYXJncy5kZWJ1Zykge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcignTG9hZGluZyBwbHVnaW4nLCBmdWxsUGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGxvYWQgcGx1Z2luJywgZXgpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ1RoaXMgaXMgbW9zdCBsaWtlbHkgYW4gZXJyb3IgaW4gdGhlIHBsdWdpbi4nKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZVBsdWdpbnMoKSB7XG4gICAgZm9yIChjb25zdCBwbHVnaW4gb2YgdGhpcy5fcGx1Z2lucykge1xuICAgICAgYXdhaXQgcGx1Z2luLmFjdGl2YXRlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmV0Y2hBY2NvdW50KG5hbWUpIHtcbiAgICBjb25zdCB3aGVyZSA9IHt9O1xuXG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHdoZXJlLm9yZ2FuaXphdGlvbl9uYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBhY2NvdW50cyA9IGF3YWl0IEFjY291bnQuZmluZEFsbCh0aGlzLmRiLCB3aGVyZSwgJ3VwZGF0ZWRfYXQgREVTQycpO1xuXG4gICAgcmV0dXJuIGFjY291bnRzWzBdO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlRGF0YVNvdXJjZShhY2NvdW50KSB7XG4gICAgbGV0IGRhdGFTb3VyY2UgPSBuZXcgRGF0YVNvdXJjZSgpO1xuXG4gICAgY29uc3QgbG9jYWxEYXRhYmFzZSA9IG5ldyBMb2NhbERhdGFiYXNlRGF0YVNvdXJjZShhY2NvdW50KTtcblxuICAgIGRhdGFTb3VyY2UuYWRkKGxvY2FsRGF0YWJhc2UpO1xuXG4gICAgYXdhaXQgbG9jYWxEYXRhYmFzZS5sb2FkKHRoaXMuZGIpO1xuXG4gICAgcmV0dXJuIGRhdGFTb3VyY2U7XG4gIH1cbn1cblxuYXBwID0gbmV3IEFwcCgpO1xuXG5FbnZpcm9ubWVudC5hcHAgPSBhcHA7XG5cbmdsb2JhbC5fX2FwcF9fID0gYXBwO1xuZ2xvYmFsLl9fYXBpX18gPSBhcGk7XG5nbG9iYWwuZnVsY3J1bSA9IGFwcC5lbnZpcm9ubWVudDtcblxuZXhwb3J0IGRlZmF1bHQgYXBwO1xuIl19