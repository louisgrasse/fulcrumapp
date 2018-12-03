'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _version_ = require('./migrations/version_001');

var _version_2 = _interopRequireDefault(_version_);

var _version_3 = require('./migrations/version_002');

var _version_4 = _interopRequireDefault(_version_3);

var _version_5 = require('./migrations/version_003');

var _version_6 = _interopRequireDefault(_version_5);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const MIGRATIONS = {
  '001': _version_2.default,
  '002': _version_4.default,
  '003': _version_6.default
};

class Migration {
  constructor(db, versionName) {
    this.db = db;
    this.versionName = versionName;
  }

  executeMigrationSQL(suffix) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const data = MIGRATIONS[_this.versionName];

      const sql = [];

      for (let part of data.split('\n\n')) {
        if (part.trim().length && part.trim().substring(0, 2) !== '--') {
          sql.push(part.trim());
        }
      }

      if (sql.length === 0) {
        return [];
      }

      const results = [];

      for (let script of sql) {
        if (_this.db.verbose) {
          fulcrum.logger.log(script, '\n');
        }

        results.push((yield _this.db.execute(script)));
      }

      return results;
    })();
  }

  executeUpgradeSQL() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return yield _this2.executeMigrationSQL('up');
    })();
  }

  executeDowngradeSQL() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      return yield _this3.executeMigrationSQL('down');
    })();
  }

  up() {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      return yield _this4.executeUpgradeSQL();
    })();
  }

  down() {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      return yield _this5.executeDowngradeSQL();
    })();
  }
}
exports.default = Migration;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2RiL21pZ3JhdGlvbi5qcyJdLCJuYW1lcyI6WyJNSUdSQVRJT05TIiwiTWlncmF0aW9uIiwiY29uc3RydWN0b3IiLCJkYiIsInZlcnNpb25OYW1lIiwiZXhlY3V0ZU1pZ3JhdGlvblNRTCIsInN1ZmZpeCIsImRhdGEiLCJzcWwiLCJwYXJ0Iiwic3BsaXQiLCJ0cmltIiwibGVuZ3RoIiwic3Vic3RyaW5nIiwicHVzaCIsInJlc3VsdHMiLCJzY3JpcHQiLCJ2ZXJib3NlIiwiZnVsY3J1bSIsImxvZ2dlciIsImxvZyIsImV4ZWN1dGUiLCJleGVjdXRlVXBncmFkZVNRTCIsImV4ZWN1dGVEb3duZ3JhZGVTUUwiLCJ1cCIsImRvd24iXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNQSxhQUFhO0FBQ2pCLDJCQURpQjtBQUVqQiwyQkFGaUI7QUFHakI7QUFIaUIsQ0FBbkI7O0FBTWUsTUFBTUMsU0FBTixDQUFnQjtBQUM3QkMsY0FBWUMsRUFBWixFQUFnQkMsV0FBaEIsRUFBNkI7QUFDM0IsU0FBS0QsRUFBTCxHQUFVQSxFQUFWO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQkEsV0FBbkI7QUFDRDs7QUFFS0MscUJBQU4sQ0FBMEJDLE1BQTFCLEVBQWtDO0FBQUE7O0FBQUE7QUFDaEMsWUFBTUMsT0FBT1AsV0FBVyxNQUFLSSxXQUFoQixDQUFiOztBQUVBLFlBQU1JLE1BQU0sRUFBWjs7QUFFQSxXQUFLLElBQUlDLElBQVQsSUFBaUJGLEtBQUtHLEtBQUwsQ0FBVyxNQUFYLENBQWpCLEVBQXFDO0FBQ25DLFlBQUlELEtBQUtFLElBQUwsR0FBWUMsTUFBWixJQUFzQkgsS0FBS0UsSUFBTCxHQUFZRSxTQUFaLENBQXNCLENBQXRCLEVBQXlCLENBQXpCLE1BQWdDLElBQTFELEVBQWdFO0FBQzlETCxjQUFJTSxJQUFKLENBQVNMLEtBQUtFLElBQUwsRUFBVDtBQUNEO0FBQ0Y7O0FBRUQsVUFBSUgsSUFBSUksTUFBSixLQUFlLENBQW5CLEVBQXNCO0FBQ3BCLGVBQU8sRUFBUDtBQUNEOztBQUVELFlBQU1HLFVBQVUsRUFBaEI7O0FBRUEsV0FBSyxJQUFJQyxNQUFULElBQW1CUixHQUFuQixFQUF3QjtBQUN0QixZQUFJLE1BQUtMLEVBQUwsQ0FBUWMsT0FBWixFQUFxQjtBQUNuQkMsa0JBQVFDLE1BQVIsQ0FBZUMsR0FBZixDQUFtQkosTUFBbkIsRUFBMkIsSUFBM0I7QUFDRDs7QUFFREQsZ0JBQVFELElBQVIsRUFBYSxNQUFNLE1BQUtYLEVBQUwsQ0FBUWtCLE9BQVIsQ0FBZ0JMLE1BQWhCLENBQW5CO0FBQ0Q7O0FBRUQsYUFBT0QsT0FBUDtBQXpCZ0M7QUEwQmpDOztBQUVLTyxtQkFBTixHQUEwQjtBQUFBOztBQUFBO0FBQ3hCLGFBQU8sTUFBTSxPQUFLakIsbUJBQUwsQ0FBeUIsSUFBekIsQ0FBYjtBQUR3QjtBQUV6Qjs7QUFFS2tCLHFCQUFOLEdBQTRCO0FBQUE7O0FBQUE7QUFDMUIsYUFBTyxNQUFNLE9BQUtsQixtQkFBTCxDQUF5QixNQUF6QixDQUFiO0FBRDBCO0FBRTNCOztBQUVLbUIsSUFBTixHQUFXO0FBQUE7O0FBQUE7QUFDVCxhQUFPLE1BQU0sT0FBS0YsaUJBQUwsRUFBYjtBQURTO0FBRVY7O0FBRUtHLE1BQU4sR0FBYTtBQUFBOztBQUFBO0FBQ1gsYUFBTyxNQUFNLE9BQUtGLG1CQUFMLEVBQWI7QUFEVztBQUVaO0FBaEQ0QjtrQkFBVnRCLFMiLCJmaWxlIjoibWlncmF0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFYxIGZyb20gJy4vbWlncmF0aW9ucy92ZXJzaW9uXzAwMSc7XG5pbXBvcnQgVjIgZnJvbSAnLi9taWdyYXRpb25zL3ZlcnNpb25fMDAyJztcbmltcG9ydCBWMyBmcm9tICcuL21pZ3JhdGlvbnMvdmVyc2lvbl8wMDMnO1xuXG5jb25zdCBNSUdSQVRJT05TID0ge1xuICAnMDAxJzogVjEsXG4gICcwMDInOiBWMixcbiAgJzAwMyc6IFYzXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaWdyYXRpb24ge1xuICBjb25zdHJ1Y3RvcihkYiwgdmVyc2lvbk5hbWUpIHtcbiAgICB0aGlzLmRiID0gZGI7XG4gICAgdGhpcy52ZXJzaW9uTmFtZSA9IHZlcnNpb25OYW1lO1xuICB9XG5cbiAgYXN5bmMgZXhlY3V0ZU1pZ3JhdGlvblNRTChzdWZmaXgpIHtcbiAgICBjb25zdCBkYXRhID0gTUlHUkFUSU9OU1t0aGlzLnZlcnNpb25OYW1lXTtcblxuICAgIGNvbnN0IHNxbCA9IFtdO1xuXG4gICAgZm9yIChsZXQgcGFydCBvZiBkYXRhLnNwbGl0KCdcXG5cXG4nKSkge1xuICAgICAgaWYgKHBhcnQudHJpbSgpLmxlbmd0aCAmJiBwYXJ0LnRyaW0oKS5zdWJzdHJpbmcoMCwgMikgIT09ICctLScpIHtcbiAgICAgICAgc3FsLnB1c2gocGFydC50cmltKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzcWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0cyA9IFtdO1xuXG4gICAgZm9yIChsZXQgc2NyaXB0IG9mIHNxbCkge1xuICAgICAgaWYgKHRoaXMuZGIudmVyYm9zZSkge1xuICAgICAgICBmdWxjcnVtLmxvZ2dlci5sb2coc2NyaXB0LCAnXFxuJyk7XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdHMucHVzaChhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoc2NyaXB0KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBhc3luYyBleGVjdXRlVXBncmFkZVNRTCgpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9uU1FMKCd1cCcpO1xuICB9XG5cbiAgYXN5bmMgZXhlY3V0ZURvd25ncmFkZVNRTCgpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlTWlncmF0aW9uU1FMKCdkb3duJyk7XG4gIH1cblxuICBhc3luYyB1cCgpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlVXBncmFkZVNRTCgpO1xuICB9XG5cbiAgYXN5bmMgZG93bigpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlRG93bmdyYWRlU1FMKCk7XG4gIH1cbn1cbiJdfQ==