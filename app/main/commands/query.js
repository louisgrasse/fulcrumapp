'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _csvString = require('csv-string');

var _csvString2 = _interopRequireDefault(_csvString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = class {
  constructor() {
    this.runCommand = _asyncToGenerator(function* () {
      let headers = false;
      const isJSON = fulcrum.args.format === 'json';
      const isCSV = fulcrum.args.format === 'csv';

      if (isJSON) {
        process.stdout.write('[');
      }

      let lastJSONObject = null;

      yield fulcrum.db.each(fulcrum.args.sql, {}, function ({ columns, values, index }) {
        if (!headers && isCSV && columns.length) {
          headers = true;
          process.stdout.write(_csvString2.default.stringify(columns.map(function (c) {
            return c.name;
          })));
        }

        if (values) {
          if (isJSON) {
            if (lastJSONObject) {
              process.stdout.write(JSON.stringify(lastJSONObject) + ',');
            }

            lastJSONObject = values;
          } else {
            process.stdout.write(_csvString2.default.stringify(values));
          }
        }
      });

      if (isJSON) {
        if (lastJSONObject) {
          process.stdout.write(JSON.stringify(lastJSONObject));
        }

        process.stdout.write(']');
      }
    });
  }

  task(cli) {
    var _this = this;

    return _asyncToGenerator(function* () {
      return cli.command({
        command: 'query',
        desc: 'run a query in the local database',
        builder: {
          sql: {
            type: 'string',
            desc: 'sql query',
            required: true
          },
          format: {
            type: 'string',
            desc: 'format (csv, json)',
            default: 'csv'
          }
        },
        handler: _this.runCommand
      });
    })();
  }

};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2NvbW1hbmRzL3F1ZXJ5LmpzIl0sIm5hbWVzIjpbInJ1bkNvbW1hbmQiLCJoZWFkZXJzIiwiaXNKU09OIiwiZnVsY3J1bSIsImFyZ3MiLCJmb3JtYXQiLCJpc0NTViIsInByb2Nlc3MiLCJzdGRvdXQiLCJ3cml0ZSIsImxhc3RKU09OT2JqZWN0IiwiZGIiLCJlYWNoIiwic3FsIiwiY29sdW1ucyIsInZhbHVlcyIsImluZGV4IiwibGVuZ3RoIiwic3RyaW5naWZ5IiwibWFwIiwiYyIsIm5hbWUiLCJKU09OIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInR5cGUiLCJyZXF1aXJlZCIsImRlZmF1bHQiLCJoYW5kbGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7Ozs7Ozs7a0JBRWUsTUFBTTtBQUFBO0FBQUEsU0FxQm5CQSxVQXJCbUIscUJBcUJOLGFBQVk7QUFDdkIsVUFBSUMsVUFBVSxLQUFkO0FBQ0EsWUFBTUMsU0FBU0MsUUFBUUMsSUFBUixDQUFhQyxNQUFiLEtBQXdCLE1BQXZDO0FBQ0EsWUFBTUMsUUFBUUgsUUFBUUMsSUFBUixDQUFhQyxNQUFiLEtBQXdCLEtBQXRDOztBQUVBLFVBQUlILE1BQUosRUFBWTtBQUNWSyxnQkFBUUMsTUFBUixDQUFlQyxLQUFmLENBQXFCLEdBQXJCO0FBQ0Q7O0FBRUQsVUFBSUMsaUJBQWlCLElBQXJCOztBQUVBLFlBQU1QLFFBQVFRLEVBQVIsQ0FBV0MsSUFBWCxDQUFnQlQsUUFBUUMsSUFBUixDQUFhUyxHQUE3QixFQUFrQyxFQUFsQyxFQUFzQyxVQUFDLEVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFrQkMsS0FBbEIsRUFBRCxFQUE4QjtBQUN4RSxZQUFJLENBQUNmLE9BQUQsSUFBWUssS0FBWixJQUFxQlEsUUFBUUcsTUFBakMsRUFBeUM7QUFDdkNoQixvQkFBVSxJQUFWO0FBQ0FNLGtCQUFRQyxNQUFSLENBQWVDLEtBQWYsQ0FBcUIsb0JBQUlTLFNBQUosQ0FBY0osUUFBUUssR0FBUixDQUFZO0FBQUEsbUJBQUtDLEVBQUVDLElBQVA7QUFBQSxXQUFaLENBQWQsQ0FBckI7QUFDRDs7QUFFRCxZQUFJTixNQUFKLEVBQVk7QUFDVixjQUFJYixNQUFKLEVBQVk7QUFDVixnQkFBSVEsY0FBSixFQUFvQjtBQUNsQkgsc0JBQVFDLE1BQVIsQ0FBZUMsS0FBZixDQUFxQmEsS0FBS0osU0FBTCxDQUFlUixjQUFmLElBQWlDLEdBQXREO0FBQ0Q7O0FBRURBLDZCQUFpQkssTUFBakI7QUFDRCxXQU5ELE1BTU87QUFDTFIsb0JBQVFDLE1BQVIsQ0FBZUMsS0FBZixDQUFxQixvQkFBSVMsU0FBSixDQUFjSCxNQUFkLENBQXJCO0FBQ0Q7QUFDRjtBQUNGLE9BakJLLENBQU47O0FBbUJBLFVBQUliLE1BQUosRUFBWTtBQUNWLFlBQUlRLGNBQUosRUFBb0I7QUFDbEJILGtCQUFRQyxNQUFSLENBQWVDLEtBQWYsQ0FBcUJhLEtBQUtKLFNBQUwsQ0FBZVIsY0FBZixDQUFyQjtBQUNEOztBQUVESCxnQkFBUUMsTUFBUixDQUFlQyxLQUFmLENBQXFCLEdBQXJCO0FBQ0Q7QUFDRixLQTFEa0I7QUFBQTs7QUFDYmMsTUFBTixDQUFXQyxHQUFYLEVBQWdCO0FBQUE7O0FBQUE7QUFDZCxhQUFPQSxJQUFJQyxPQUFKLENBQVk7QUFDakJBLGlCQUFTLE9BRFE7QUFFakJDLGNBQU0sbUNBRlc7QUFHakJDLGlCQUFTO0FBQ1BkLGVBQUs7QUFDSGUsa0JBQU0sUUFESDtBQUVIRixrQkFBTSxXQUZIO0FBR0hHLHNCQUFVO0FBSFAsV0FERTtBQU1QeEIsa0JBQVE7QUFDTnVCLGtCQUFNLFFBREE7QUFFTkYsa0JBQU0sb0JBRkE7QUFHTkkscUJBQVM7QUFISDtBQU5ELFNBSFE7QUFlakJDLGlCQUFTLE1BQUsvQjtBQWZHLE9BQVosQ0FBUDtBQURjO0FBa0JmOztBQW5Ca0IsQyIsImZpbGUiOiJxdWVyeS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDU1YgZnJvbSAnY3N2LXN0cmluZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgYXN5bmMgdGFzayhjbGkpIHtcbiAgICByZXR1cm4gY2xpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJ3F1ZXJ5JyxcbiAgICAgIGRlc2M6ICdydW4gYSBxdWVyeSBpbiB0aGUgbG9jYWwgZGF0YWJhc2UnLFxuICAgICAgYnVpbGRlcjoge1xuICAgICAgICBzcWw6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZXNjOiAnc3FsIHF1ZXJ5JyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBmb3JtYXQ6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZXNjOiAnZm9ybWF0IChjc3YsIGpzb24pJyxcbiAgICAgICAgICBkZWZhdWx0OiAnY3N2J1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCBoZWFkZXJzID0gZmFsc2U7XG4gICAgY29uc3QgaXNKU09OID0gZnVsY3J1bS5hcmdzLmZvcm1hdCA9PT0gJ2pzb24nO1xuICAgIGNvbnN0IGlzQ1NWID0gZnVsY3J1bS5hcmdzLmZvcm1hdCA9PT0gJ2Nzdic7XG5cbiAgICBpZiAoaXNKU09OKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnWycpO1xuICAgIH1cblxuICAgIGxldCBsYXN0SlNPTk9iamVjdCA9IG51bGw7XG5cbiAgICBhd2FpdCBmdWxjcnVtLmRiLmVhY2goZnVsY3J1bS5hcmdzLnNxbCwge30sICh7Y29sdW1ucywgdmFsdWVzLCBpbmRleH0pID0+IHtcbiAgICAgIGlmICghaGVhZGVycyAmJiBpc0NTViAmJiBjb2x1bW5zLmxlbmd0aCkge1xuICAgICAgICBoZWFkZXJzID0gdHJ1ZTtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoQ1NWLnN0cmluZ2lmeShjb2x1bW5zLm1hcChjID0+IGMubmFtZSkpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICBpZiAoaXNKU09OKSB7XG4gICAgICAgICAgaWYgKGxhc3RKU09OT2JqZWN0KSB7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShsYXN0SlNPTk9iamVjdCkgKyAnLCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxhc3RKU09OT2JqZWN0ID0gdmFsdWVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKENTVi5zdHJpbmdpZnkodmFsdWVzKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChpc0pTT04pIHtcbiAgICAgIGlmIChsYXN0SlNPTk9iamVjdCkge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShsYXN0SlNPTk9iamVjdCkpO1xuICAgICAgfVxuXG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnXScpO1xuICAgIH1cbiAgfVxufVxuIl19