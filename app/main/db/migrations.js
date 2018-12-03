'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _migration = require('./migration');

var _migration2 = _interopRequireDefault(_migration);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const CURRENT_VERSION = 3;

class Migrations {
  static get currentVersion() {
    return CURRENT_VERSION;
  }

  constructor(db) {
    this.db = db;
  }

  executeMigrations() {
    var _this = this;

    return _asyncToGenerator(function* () {
      const methods = [];
      const versions = [];

      let upgrade = true;

      if (_this.version !== CURRENT_VERSION) {
        if (_this.version > CURRENT_VERSION) {
          for (let i = _this.version; i > CURRENT_VERSION + 1; --i) {
            versions.push(i);
          }
          upgrade = false;
        } else {
          for (let i = _this.version + 1; i < CURRENT_VERSION + 1; ++i) {
            versions.push(i);
          }
        }
      }

      if (versions.length > 0) {
        for (let version of versions) {
          yield _this.runMigration(version, upgrade);
        }
      }

      return methods;
    })();
  }

  runMigration(version, upgrade) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      let versionName = '000' + version.toString();

      versionName = versionName.slice(-3);

      const newVersion = upgrade ? version : version - 1;

      yield _this2.db.execute('BEGIN TRANSACTION');

      const migration = new _migration2.default(_this2.db, versionName);

      if (upgrade) {
        _this2.log('\nUpgrading database to version ' + version + '\n');
        yield migration.up();
        _this2.log('\nUpgraded database to version ' + version + '\n');
      } else {
        _this2.log('\nDowngrading database to version ' + newVersion + '\n');
        yield migration.down();
        _this2.log('\nDowngraded database to version ' + newVersion);
      }

      yield _this2.updateDatabaseVersion(newVersion);

      yield _this2.db.execute('COMMIT TRANSACTION');
    })();
  }

  updateDatabaseVersion(version) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      yield _this3.db.execute("UPDATE metadata SET value = '" + version + "' WHERE key = 'database_version'", null);
    })();
  }

  log(message) {
    if (process.env.FULCRUM_DEBUG) {
      fulcrum.logger.log(message);
    }
  }

  migrate() {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      yield _this4.createMetadataTable();
      yield _this4.getDatabaseVersion();
      yield _this4.executeMigrations();
    })();
  }

  getDatabaseVersion() {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const result = yield _this5.db.get("SELECT key, value FROM metadata WHERE key = 'database_version'");
      _this5.version = result ? +result.value : 0;
    })();
  }

  createMetadataTable() {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      yield _this6.db.execute('CREATE TABLE IF NOT EXISTS metadata (key TEXT, value TEXT)', null);
      yield _this6.db.execute("INSERT INTO metadata (key, value) SELECT 'database_version', 0 WHERE NOT EXISTS (SELECT 1 FROM metadata WHERE key = 'database_version')", null);
    })();
  }
}
exports.default = Migrations;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2RiL21pZ3JhdGlvbnMuanMiXSwibmFtZXMiOlsiQ1VSUkVOVF9WRVJTSU9OIiwiTWlncmF0aW9ucyIsImN1cnJlbnRWZXJzaW9uIiwiY29uc3RydWN0b3IiLCJkYiIsImV4ZWN1dGVNaWdyYXRpb25zIiwibWV0aG9kcyIsInZlcnNpb25zIiwidXBncmFkZSIsInZlcnNpb24iLCJpIiwicHVzaCIsImxlbmd0aCIsInJ1bk1pZ3JhdGlvbiIsInZlcnNpb25OYW1lIiwidG9TdHJpbmciLCJzbGljZSIsIm5ld1ZlcnNpb24iLCJleGVjdXRlIiwibWlncmF0aW9uIiwibG9nIiwidXAiLCJkb3duIiwidXBkYXRlRGF0YWJhc2VWZXJzaW9uIiwibWVzc2FnZSIsInByb2Nlc3MiLCJlbnYiLCJGVUxDUlVNX0RFQlVHIiwiZnVsY3J1bSIsImxvZ2dlciIsIm1pZ3JhdGUiLCJjcmVhdGVNZXRhZGF0YVRhYmxlIiwiZ2V0RGF0YWJhc2VWZXJzaW9uIiwicmVzdWx0IiwiZ2V0IiwidmFsdWUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7Ozs7OztBQUVBLE1BQU1BLGtCQUFrQixDQUF4Qjs7QUFFZSxNQUFNQyxVQUFOLENBQWlCO0FBQzlCLGFBQVdDLGNBQVgsR0FBNEI7QUFDMUIsV0FBT0YsZUFBUDtBQUNEOztBQUVERyxjQUFZQyxFQUFaLEVBQWdCO0FBQ2QsU0FBS0EsRUFBTCxHQUFVQSxFQUFWO0FBQ0Q7O0FBRUtDLG1CQUFOLEdBQTBCO0FBQUE7O0FBQUE7QUFDeEIsWUFBTUMsVUFBVSxFQUFoQjtBQUNBLFlBQU1DLFdBQVcsRUFBakI7O0FBRUEsVUFBSUMsVUFBVSxJQUFkOztBQUVBLFVBQUksTUFBS0MsT0FBTCxLQUFpQlQsZUFBckIsRUFBc0M7QUFDcEMsWUFBSSxNQUFLUyxPQUFMLEdBQWVULGVBQW5CLEVBQW9DO0FBQ2xDLGVBQUssSUFBSVUsSUFBSSxNQUFLRCxPQUFsQixFQUEyQkMsSUFBSVYsa0JBQWtCLENBQWpELEVB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LCJmaWxlIjoibWlncmF0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBNaWdyYXRpb24gZnJvbSAnLi9taWdyYXRpb24nO1xuXG5jb25zdCBDVVJSRU5UX1ZFUlNJT04gPSAzO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaWdyYXRpb25zIHtcbiAgc3RhdGljIGdldCBjdXJyZW50VmVyc2lvbigpIHtcbiAgICByZXR1cm4gQ1VSUkVOVF9WRVJTSU9OO1xuICB9XG5cbiAgY29uc3RydWN0b3IoZGIpIHtcbiAgICB0aGlzLmRiID0gZGI7XG4gIH1cblxuICBhc3luYyBleGVjdXRlTWlncmF0aW9ucygpIHtcbiAgICBjb25zdCBtZXRob2RzID0gW107XG4gICAgY29uc3QgdmVyc2lvbnMgPSBbXTtcblxuICAgIGxldCB1cGdyYWRlID0gdHJ1ZTtcblxuICAgIGlmICh0aGlzLnZlcnNpb24gIT09IENVUlJFTlRfVkVSU0lPTikge1xuICAgICAgaWYgKHRoaXMudmVyc2lvbiA+IENVUlJFTlRfVkVSU0lPTikge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy52ZXJzaW9uOyBpID4gQ1VSUkVOVF9WRVJTSU9OICsgMTsgLS1pKSB7XG4gICAgICAgICAgdmVyc2lvbnMucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICB1cGdyYWRlID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy52ZXJzaW9uICsgMTsgaSA8IENVUlJFTlRfVkVSU0lPTiArIDE7ICsraSkge1xuICAgICAgICAgIHZlcnNpb25zLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmVyc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChsZXQgdmVyc2lvbiBvZiB2ZXJzaW9ucykge1xuICAgICAgICBhd2FpdCB0aGlzLnJ1bk1pZ3JhdGlvbih2ZXJzaW9uLCB1cGdyYWRlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWV0aG9kcztcbiAgfVxuXG4gIGFzeW5jIHJ1bk1pZ3JhdGlvbih2ZXJzaW9uLCB1cGdyYWRlKSB7XG4gICAgbGV0IHZlcnNpb25OYW1lID0gJzAwMCcgKyB2ZXJzaW9uLnRvU3RyaW5nKCk7XG5cbiAgICB2ZXJzaW9uTmFtZSA9IHZlcnNpb25OYW1lLnNsaWNlKC0zKTtcblxuICAgIGNvbnN0IG5ld1ZlcnNpb24gPSB1cGdyYWRlID8gdmVyc2lvbiA6IHZlcnNpb24gLSAxO1xuXG4gICAgYXdhaXQgdGhpcy5kYi5leGVjdXRlKCdCRUdJTiBUUkFOU0FDVElPTicpO1xuXG4gICAgY29uc3QgbWlncmF0aW9uID0gbmV3IE1pZ3JhdGlvbih0aGlzLmRiLCB2ZXJzaW9uTmFtZSk7XG5cbiAgICBpZiAodXBncmFkZSkge1xuICAgICAgdGhpcy5sb2coJ1xcblVwZ3JhZGluZyBkYXRhYmFzZSB0byB2ZXJzaW9uICcgKyB2ZXJzaW9uICsgJ1xcbicpO1xuICAgICAgYXdhaXQgbWlncmF0aW9uLnVwKCk7XG4gICAgICB0aGlzLmxvZygnXFxuVXBncmFkZWQgZGF0YWJhc2UgdG8gdmVyc2lvbiAnICsgdmVyc2lvbiArICdcXG4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2coJ1xcbkRvd25ncmFkaW5nIGRhdGFiYXNlIHRvIHZlcnNpb24gJyArIG5ld1ZlcnNpb24gKyAnXFxuJyk7XG4gICAgICBhd2FpdCBtaWdyYXRpb24uZG93bigpO1xuICAgICAgdGhpcy5sb2coJ1xcbkRvd25ncmFkZWQgZGF0YWJhc2UgdG8gdmVyc2lvbiAnICsgbmV3VmVyc2lvbik7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy51cGRhdGVEYXRhYmFzZVZlcnNpb24obmV3VmVyc2lvbik7XG5cbiAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoJ0NPTU1JVCBUUkFOU0FDVElPTicpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlRGF0YWJhc2VWZXJzaW9uKHZlcnNpb24pIHtcbiAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoXCJVUERBVEUgbWV0YWRhdGEgU0VUIHZhbHVlID0gJ1wiICsgdmVyc2lvbiArIFwiJyBXSEVSRSBrZXkgPSAnZGF0YWJhc2VfdmVyc2lvbidcIiwgbnVsbCk7XG4gIH1cblxuICBsb2cobWVzc2FnZSkge1xuICAgIGlmIChwcm9jZXNzLmVudi5GVUxDUlVNX0RFQlVHKSB7XG4gICAgICBmdWxjcnVtLmxvZ2dlci5sb2cobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbWlncmF0ZSgpIHtcbiAgICBhd2FpdCB0aGlzLmNyZWF0ZU1ldGFkYXRhVGFibGUoKTtcbiAgICBhd2FpdCB0aGlzLmdldERhdGFiYXNlVmVyc2lvbigpO1xuICAgIGF3YWl0IHRoaXMuZXhlY3V0ZU1pZ3JhdGlvbnMoKTtcbiAgfVxuXG4gIGFzeW5jIGdldERhdGFiYXNlVmVyc2lvbigpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRiLmdldChcIlNFTEVDVCBrZXksIHZhbHVlIEZST00gbWV0YWRhdGEgV0hFUkUga2V5ID0gJ2RhdGFiYXNlX3ZlcnNpb24nXCIpO1xuICAgIHRoaXMudmVyc2lvbiA9IHJlc3VsdCA/ICtyZXN1bHQudmFsdWUgOiAwO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlTWV0YWRhdGFUYWJsZSgpIHtcbiAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoJ0NSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIG1ldGFkYXRhIChrZXkgVEVYVCwgdmFsdWUgVEVYVCknLCBudWxsKTtcbiAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoXCJJTlNFUlQgSU5UTyBtZXRhZGF0YSAoa2V5LCB2YWx1ZSkgU0VMRUNUICdkYXRhYmFzZV92ZXJzaW9uJywgMCBXSEVSRSBOT1QgRVhJU1RTIChTRUxFQ1QgMSBGUk9NIG1ldGFkYXRhIFdIRVJFIGtleSA9ICdkYXRhYmFzZV92ZXJzaW9uJylcIiwgbnVsbCk7XG4gIH1cbn1cbiJdfQ==