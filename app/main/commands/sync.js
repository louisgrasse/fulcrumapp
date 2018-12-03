'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _synchronizer = require('../sync/synchronizer');

var _synchronizer2 = _interopRequireDefault(_synchronizer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = class {
  constructor() {
    var _this = this;

    this.runCommand = _asyncToGenerator(function* () {
      yield _this.app.activatePlugins();

      const account = yield fulcrum.fetchAccount(fulcrum.args.org);

      if (account == null) {
        fulcrum.logger.error('Unable to find organization:', fulcrum.args.org);
        return;
      }

      if (fulcrum.args.clean) {
        yield account.reset();
      }

      yield _this.syncLoop(account, fulcrum.args.full);
    });
  }

  task(cli) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return cli.command({
        command: 'sync',
        desc: 'sync an organization',
        builder: {
          org: {
            desc: 'organization name',
            required: true,
            type: 'string'
          },
          forever: {
            default: false,
            type: 'boolean',
            describe: 'keep the sync running forever'
          },
          clean: {
            default: false,
            type: 'boolean',
            describe: 'start a clean sync, all data will be deleted before starting'
          }
        },
        handler: _this2.runCommand
      });
    })();
  }

  syncLoop(account, fullSync) {
    return _asyncToGenerator(function* () {
      const sync = true;

      const dataSource = yield fulcrum.createDataSource(account);

      while (sync) {
        const synchronizer = new _synchronizer2.default();

        try {
          yield synchronizer.run(account, fulcrum.args.form, dataSource, { fullSync });
        } catch (ex) {
          fulcrum.logger.error(ex);
        }

        fullSync = false;

        if (!fulcrum.args.forever) {
          break;
        }

        const interval = fulcrum.args.interval ? +fulcrum.args.interval * 1000 : 15000;

        yield new Promise(function (resolve) {
          return setTimeout(resolve, interval);
        });
      }
    })();
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2NvbW1hbmRzL3N5bmMuanMiXSwibmFtZXMiOlsicnVuQ29tbWFuZCIsImFwcCIsImFjdGl2YXRlUGx1Z2lucyIsImFjY291bnQiLCJmdWxjcnVtIiwiZmV0Y2hBY2NvdW50IiwiYXJncyIsIm9yZyIsImxvZ2dlciIsImVycm9yIiwiY2xlYW4iLCJyZXNldCIsInN5bmNMb29wIiwiZnVsbCIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJyZXF1aXJlZCIsInR5cGUiLCJmb3JldmVyIiwiZGVmYXVsdCIsImRlc2NyaWJlIiwiaGFuZGxlciIsImZ1bGxTeW5jIiwic3luYyIsImRhdGFTb3VyY2UiLCJjcmVhdGVEYXRhU291cmNlIiwic3luY2hyb25pemVyIiwicnVuIiwiZm9ybSIsImV4IiwiaW50ZXJ2YWwiLCJQcm9taXNlIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7Ozs7OztrQkFFZSxNQUFNO0FBQUE7QUFBQTs7QUFBQSxTQTBCbkJBLFVBMUJtQixxQkEwQk4sYUFBWTtBQUN2QixZQUFNLE1BQUtDLEdBQUwsQ0FBU0MsZUFBVCxFQUFOOztBQUVBLFlBQU1DLFVBQVUsTUFBTUMsUUFBUUMsWUFBUixDQUFxQkQsUUFBUUUsSUFBUixDQUFhQyxHQUFsQyxDQUF0Qjs7QUFFQSxVQUFJSixXQUFXLElBQWYsRUFBcUI7QUFDbkJDLGdCQUFRSSxNQUFSLENBQWVDLEtBQWYsQ0FBcUIsOEJBQXJCLEVBQXFETCxRQUFRRSxJQUFSLENBQWFDLEdBQWxFO0FBQ0E7QUFDRDs7QUFFRCxVQUFJSCxRQUFRRSxJQUFSLENBQWFJLEtBQWpCLEVBQXdCO0FBQ3RCLGNBQU1QLFFBQVFRLEtBQVIsRUFBTjtBQUNEOztBQUVELFlBQU0sTUFBS0MsUUFBTCxDQUFjVCxPQUFkLEVBQXVCQyxRQUFRRSxJQUFSLENBQWFPLElBQXBDLENBQU47QUFDRCxLQXpDa0I7QUFBQTs7QUFDYkMsTUFBTixDQUFXQyxHQUFYLEVBQWdCO0FBQUE7O0FBQUE7QUFDZCxhQUFPQSxJQUFJQyxPQUFKLENBQVk7QUFDakJBLGlCQUFTLE1BRFE7QUFFakJDLGNBQU0sc0JBRlc7QUFHakJDLGlCQUFTO0FBQ1BYLGVBQUs7QUFDSFUsa0JBQU0sbUJBREg7QUFFSEUsc0JBQVUsSUFGUDtBQUdIQyxrQkFBTTtBQUhILFdBREU7QUFNUEMsbUJBQVM7QUFDUEMscUJBQVMsS0FERjtBQUVQRixrQkFBTSxTQUZDO0FBR1BHLHNCQUFVO0FBSEgsV0FORjtBQVdQYixpQkFBTztBQUNMWSxxQkFBUyxLQURKO0FBRUxGLGtCQUFNLFNBRkQ7QUFHTEcsc0JBQVU7QUFITDtBQVhBLFNBSFE7QUFvQmpCQyxpQkFBUyxPQUFLeEI7QUFwQkcsT0FBWixDQUFQO0FBRGM7QUF1QmY7O0FBbUJLWSxVQUFOLENBQWVULE9BQWYsRUFBd0JzQixRQUF4QixFQUFrQztBQUFBO0FBQ2hDLFlBQU1DLE9BQU8sSUFBYjs7QUFFQSxZQUFNQyxhQUFhLE1BQU12QixRQUFRd0IsZ0JBQVIsQ0FBeUJ6QixPQUF6QixDQUF6Qjs7QUFFQSxhQUFPdUIsSUFBUCxFQUFhO0FBQ1gsY0FBTUcsZUFBZSw0QkFBckI7O0FBRUEsWUFBSTtBQUNGLGdCQUFNQSxhQUFhQyxHQUFiLENBQWlCM0IsT0FBakIsRUFBMEJDLFFBQVFFLElBQVIsQ0FBYXlCLElBQXZDLEVBQTZDSixVQUE3QyxFQUF5RCxFQUFDRixRQUFELEVBQXpELENBQU47QUFDRCxTQUZELENBRUUsT0FBT08sRUFBUCxFQUFXO0FBQ1g1QixrQkFBUUksTUFBUixDQUFlQyxLQUFmLENBQXFCdUIsRUFBckI7QUFDRDs7QUFFRFAsbUJBQVcsS0FBWDs7QUFFQSxZQUFJLENBQUNyQixRQUFRRSxJQUFSLENBQWFlLE9BQWxCLEVBQTJCO0FBQ3pCO0FBQ0Q7O0FBRUQsY0FBTVksV0FBVzdCLFFBQVFFLElBQVIsQ0FBYTJCLFFBQWIsR0FBeUIsQ0FBQzdCLFFBQVFFLElBQVIsQ0FBYTJCLFFBQWQsR0FBeUIsSUFBbEQsR0FBMEQsS0FBM0U7O0FBRUEsY0FBTSxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRDtBQUFBLGlCQUFhQyxXQUFXRCxPQUFYLEVBQW9CRixRQUFwQixDQUFiO0FBQUEsU0FBWixDQUFOO0FBQ0Q7QUF2QitCO0FBd0JqQztBQW5Fa0IsQyIsImZpbGUiOiJzeW5jLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFN5bmNocm9uaXplciBmcm9tICcuLi9zeW5jL3N5bmNocm9uaXplcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3N5bmMnLFxuICAgICAgZGVzYzogJ3N5bmMgYW4gb3JnYW5pemF0aW9uJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9LFxuICAgICAgICBmb3JldmVyOiB7XG4gICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2NyaWJlOiAna2VlcCB0aGUgc3luYyBydW5uaW5nIGZvcmV2ZXInXG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiB7XG4gICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2NyaWJlOiAnc3RhcnQgYSBjbGVhbiBzeW5jLCBhbGwgZGF0YSB3aWxsIGJlIGRlbGV0ZWQgYmVmb3JlIHN0YXJ0aW5nJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHRoaXMuYXBwLmFjdGl2YXRlUGx1Z2lucygpO1xuXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgaWYgKGFjY291bnQgPT0gbnVsbCkge1xuICAgICAgZnVsY3J1bS5sb2dnZXIuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIG9yZ2FuaXphdGlvbjonLCBmdWxjcnVtLmFyZ3Mub3JnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZnVsY3J1bS5hcmdzLmNsZWFuKSB7XG4gICAgICBhd2FpdCBhY2NvdW50LnJlc2V0KCk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5zeW5jTG9vcChhY2NvdW50LCBmdWxjcnVtLmFyZ3MuZnVsbCk7XG4gIH1cblxuICBhc3luYyBzeW5jTG9vcChhY2NvdW50LCBmdWxsU3luYykge1xuICAgIGNvbnN0IHN5bmMgPSB0cnVlO1xuXG4gICAgY29uc3QgZGF0YVNvdXJjZSA9IGF3YWl0IGZ1bGNydW0uY3JlYXRlRGF0YVNvdXJjZShhY2NvdW50KTtcblxuICAgIHdoaWxlIChzeW5jKSB7XG4gICAgICBjb25zdCBzeW5jaHJvbml6ZXIgPSBuZXcgU3luY2hyb25pemVyKCk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHN5bmNocm9uaXplci5ydW4oYWNjb3VudCwgZnVsY3J1bS5hcmdzLmZvcm0sIGRhdGFTb3VyY2UsIHtmdWxsU3luY30pO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgZnVsY3J1bS5sb2dnZXIuZXJyb3IoZXgpO1xuICAgICAgfVxuXG4gICAgICBmdWxsU3luYyA9IGZhbHNlO1xuXG4gICAgICBpZiAoIWZ1bGNydW0uYXJncy5mb3JldmVyKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbnRlcnZhbCA9IGZ1bGNydW0uYXJncy5pbnRlcnZhbCA/ICgrZnVsY3J1bS5hcmdzLmludGVydmFsICogMTAwMCkgOiAxNTAwMDtcblxuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgaW50ZXJ2YWwpKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==