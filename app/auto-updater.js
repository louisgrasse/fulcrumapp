'use strict';

var _electron = require('electron');

var _electronLog = require('electron-log');

var _electronLog2 = _interopRequireDefault(_electronLog);

var _electronUpdater = require('electron-updater');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_electronUpdater.autoUpdater.logger = _electronLog2.default;
_electronUpdater.autoUpdater.logger.transports.file.level = 'info';

_electronLog2.default.info('Auto-updater starting...');

_electronUpdater.autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

_electronUpdater.autoUpdater.on('update-available', (ev, info) => {
  console.log('Update available.');
});

_electronUpdater.autoUpdater.on('update-not-available', (ev, info) => {
  console.log('Update not available.');
});

_electronUpdater.autoUpdater.on('error', (ev, err) => {
  console.log('Error in auto-updater.');
});

_electronUpdater.autoUpdater.on('download-progress', (ev, progressObj) => {
  console.log('Download progress...');
});

_electronUpdater.autoUpdater.on('update-downloaded', (ev, info) => {
  console.log('Update downloaded; will install in 5 seconds');
});

_electronUpdater.autoUpdater.on('update-downloaded', (ev, info) => {
  setTimeout(function () {
    _electronUpdater.autoUpdater.quitAndInstall();
  }, 5000);
});

_electron.app.on('ready', function () {
  if (process.env.DEVELOPMENT) {
    return;
  }

  _electronUpdater.autoUpdater.checkForUpdates();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hdXRvLXVwZGF0ZXIuanMiXSwibmFtZXMiOlsibG9nZ2VyIiwidHJhbnNwb3J0cyIsImZpbGUiLCJsZXZlbCIsImluZm8iLCJvbiIsImNvbnNvbGUiLCJsb2ciLCJldiIsImVyciIsInByb2dyZXNzT2JqIiwic2V0VGltZW91dCIsInF1aXRBbmRJbnN0YWxsIiwicHJvY2VzcyIsImVudiIsIkRFVkVMT1BNRU5UIiwiY2hlY2tGb3JVcGRhdGVzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUNBOzs7O0FBQ0E7Ozs7QUFFQSw2QkFBWUEsTUFBWjtBQUNBLDZCQUFZQSxNQUFaLENBQW1CQyxVQUFuQixDQUE4QkMsSUFBOUIsQ0FBbUNDLEtBQW5DLEdBQTJDLE1BQTNDOztBQUVBLHNCQUFJQyxJQUFKLENBQVMsMEJBQVQ7O0FBRUEsNkJBQVlDLEVBQVosQ0FBZSxxQkFBZixFQUFzQyxNQUFNO0FBQzFDQyxVQUFRQyxHQUFSLENBQVksd0JBQVo7QUFDRCxDQUZEOztBQUlBLDZCQUFZRixFQUFaLENBQWUsa0JBQWYsRUFBbUMsQ0FBQ0csRUFBRCxFQUFLSixJQUFMLEtBQWM7QUFDL0NFLFVBQVFDLEdBQVIsQ0FBWSxtQkFBWjtBQUNELENBRkQ7O0FBSUEsNkJBQVlGLEVBQVosQ0FBZSxzQkFBZixFQUF1QyxDQUFDRyxFQUFELEVBQUtKLElBQUwsS0FBYztBQUNuREUsVUFBUUMsR0FBUixDQUFZLHVCQUFaO0FBQ0QsQ0FGRDs7QUFJQSw2QkFBWUYsRUFBWixDQUFlLE9BQWYsRUFBd0IsQ0FBQ0csRUFBRCxFQUFLQyxHQUFMLEtBQWE7QUFDbkNILFVBQVFDLEdBQVIsQ0FBWSx3QkFBWjtBQUNELENBRkQ7O0FBSUEsNkJBQVlGLEVBQVosQ0FBZSxtQkFBZixFQUFvQyxDQUFDRyxFQUFELEVBQUtFLFdBQUwsS0FBcUI7QUFDdkRKLFVBQVFDLEdBQVIsQ0FBWSxzQkFBWjtBQUNELENBRkQ7O0FBSUEsNkJBQVlGLEVBQVosQ0FBZSxtQkFBZixFQUFvQyxDQUFDRyxFQUFELEVBQUtKLElBQUwsS0FBYztBQUNoREUsVUFBUUMsR0FBUixDQUFZLDhDQUFaO0FBQ0QsQ0FGRDs7QUFJQSw2QkFBWUYsRUFBWixDQUFlLG1CQUFmLEVBQW9DLENBQUNHLEVBQUQsRUFBS0osSUFBTCxLQUFjO0FBQ2hETyxhQUFXLFlBQVc7QUFDcEIsaUNBQVlDLGNBQVo7QUFDRCxHQUZELEVBRUcsSUFGSDtBQUdELENBSkQ7O0FBTUEsY0FBSVAsRUFBSixDQUFPLE9BQVAsRUFBZ0IsWUFBVztBQUN6QixNQUFJUSxRQUFRQyxHQUFSLENBQVlDLFdBQWhCLEVBQTZCO0FBQzNCO0FBQ0Q7O0FBRUQsK0JBQVlDLGVBQVo7QUFDRCxDQU5EIiwiZmlsZSI6ImF1dG8tdXBkYXRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGFwcCB9IGZyb20gJ2VsZWN0cm9uJztcbmltcG9ydCBsb2cgZnJvbSAnZWxlY3Ryb24tbG9nJztcbmltcG9ydCB7IGF1dG9VcGRhdGVyIH0gZnJvbSAnZWxlY3Ryb24tdXBkYXRlcic7XG5cbmF1dG9VcGRhdGVyLmxvZ2dlciA9IGxvZztcbmF1dG9VcGRhdGVyLmxvZ2dlci50cmFuc3BvcnRzLmZpbGUubGV2ZWwgPSAnaW5mbyc7XG5cbmxvZy5pbmZvKCdBdXRvLXVwZGF0ZXIgc3RhcnRpbmcuLi4nKTtcblxuYXV0b1VwZGF0ZXIub24oJ2NoZWNraW5nLWZvci11cGRhdGUnLCAoKSA9PiB7XG4gIGNvbnNvbGUubG9nKCdDaGVja2luZyBmb3IgdXBkYXRlLi4uJyk7XG59KTtcblxuYXV0b1VwZGF0ZXIub24oJ3VwZGF0ZS1hdmFpbGFibGUnLCAoZXYsIGluZm8pID0+IHtcbiAgY29uc29sZS5sb2coJ1VwZGF0ZSBhdmFpbGFibGUuJyk7XG59KTtcblxuYXV0b1VwZGF0ZXIub24oJ3VwZGF0ZS1ub3QtYXZhaWxhYmxlJywgKGV2LCBpbmZvKSA9PiB7XG4gIGNvbnNvbGUubG9nKCdVcGRhdGUgbm90IGF2YWlsYWJsZS4nKTtcbn0pO1xuXG5hdXRvVXBkYXRlci5vbignZXJyb3InLCAoZXYsIGVycikgPT4ge1xuICBjb25zb2xlLmxvZygnRXJyb3IgaW4gYXV0by11cGRhdGVyLicpO1xufSk7XG5cbmF1dG9VcGRhdGVyLm9uKCdkb3dubG9hZC1wcm9ncmVzcycsIChldiwgcHJvZ3Jlc3NPYmopID0+IHtcbiAgY29uc29sZS5sb2coJ0Rvd25sb2FkIHByb2dyZXNzLi4uJyk7XG59KTtcblxuYXV0b1VwZGF0ZXIub24oJ3VwZGF0ZS1kb3dubG9hZGVkJywgKGV2LCBpbmZvKSA9PiB7XG4gIGNvbnNvbGUubG9nKCdVcGRhdGUgZG93bmxvYWRlZDsgd2lsbCBpbnN0YWxsIGluIDUgc2Vjb25kcycpO1xufSk7XG5cbmF1dG9VcGRhdGVyLm9uKCd1cGRhdGUtZG93bmxvYWRlZCcsIChldiwgaW5mbykgPT4ge1xuICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgIGF1dG9VcGRhdGVyLnF1aXRBbmRJbnN0YWxsKCk7XG4gIH0sIDUwMDApO1xufSk7XG5cbmFwcC5vbigncmVhZHknLCBmdW5jdGlvbigpIHtcbiAgaWYgKHByb2Nlc3MuZW52LkRFVkVMT1BNRU5UKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgYXV0b1VwZGF0ZXIuY2hlY2tGb3JVcGRhdGVzKCk7XG59KTtcbiJdfQ==