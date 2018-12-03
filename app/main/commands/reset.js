'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

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

      yield account.reset();
    });
  }

  task(cli) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return cli.command({
        command: 'reset',
        desc: 'reset an organization',
        builder: {
          org: {
            desc: 'organization name',
            required: true,
            type: 'string'
          }
        },
        handler: _this2.runCommand
      });
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2NvbW1hbmRzL3Jlc2V0LmpzIl0sIm5hbWVzIjpbInJ1bkNvbW1hbmQiLCJhcHAiLCJhY3RpdmF0ZVBsdWdpbnMiLCJhY2NvdW50IiwiZnVsY3J1bSIsImZldGNoQWNjb3VudCIsImFyZ3MiLCJvcmciLCJsb2dnZXIiLCJlcnJvciIsInJlc2V0IiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInJlcXVpcmVkIiwidHlwZSIsImhhbmRsZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O2tCQUFlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBZ0JuQkEsVUFoQm1CLHFCQWdCTixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsR0FBTCxDQUFTQyxlQUFULEVBQU47O0FBRUEsWUFBTUMsVUFBVSxNQUFNQyxRQUFRQyxZQUFSLENBQXFCRCxRQUFRRSxJQUFSLENBQWFDLEdBQWxDLENBQXRCOztBQUVBLFVBQUlKLFdBQVcsSUFBZixFQUFxQjtBQUNuQkMsZ0JBQVFJLE1BQVIsQ0FBZUMsS0FBZixDQUFxQiw4QkFBckIsRUFBcURMLFFBQVFFLElBQVIsQ0FBYUMsR0FBbEU7QUFDQTtBQUNEOztBQUVELFlBQU1KLFFBQVFPLEtBQVIsRUFBTjtBQUNELEtBM0JrQjtBQUFBOztBQUNiQyxNQUFOLENBQVdDLEdBQVgsRUFBZ0I7QUFBQTs7QUFBQTtBQUNkLGFBQU9BLElBQUlDLE9BQUosQ0FBWTtBQUNqQkEsaUJBQVMsT0FEUTtBQUVqQkMsY0FBTSx1QkFGVztBQUdqQkMsaUJBQVM7QUFDUFIsZUFBSztBQUNITyxrQkFBTSxtQkFESDtBQUVIRSxzQkFBVSxJQUZQO0FBR0hDLGtCQUFNO0FBSEg7QUFERSxTQUhRO0FBVWpCQyxpQkFBUyxPQUFLbEI7QUFWRyxPQUFaLENBQVA7QUFEYztBQWFmOztBQWRrQixDIiwiZmlsZSI6InJlc2V0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAncmVzZXQnLFxuICAgICAgZGVzYzogJ3Jlc2V0IGFuIG9yZ2FuaXphdGlvbicsXG4gICAgICBidWlsZGVyOiB7XG4gICAgICAgIG9yZzoge1xuICAgICAgICAgIGRlc2M6ICdvcmdhbml6YXRpb24gbmFtZScsXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IHRoaXMucnVuQ29tbWFuZFxuICAgIH0pO1xuICB9XG5cbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCB0aGlzLmFwcC5hY3RpdmF0ZVBsdWdpbnMoKTtcblxuICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBmdWxjcnVtLmZldGNoQWNjb3VudChmdWxjcnVtLmFyZ3Mub3JnKTtcblxuICAgIGlmIChhY2NvdW50ID09IG51bGwpIHtcbiAgICAgIGZ1bGNydW0ubG9nZ2VyLmVycm9yKCdVbmFibGUgdG8gZmluZCBvcmdhbml6YXRpb246JywgZnVsY3J1bS5hcmdzLm9yZyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgYWNjb3VudC5yZXNldCgpO1xuICB9XG59XG4iXX0=