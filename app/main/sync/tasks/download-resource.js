'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _task = require('./task');

var _task2 = _interopRequireDefault(_task);

var _fulcrumCore = require('fulcrum-core');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const PAGE_SIZE = 500;

class DownloadResource extends _task2.default {
  get syncResourceName() {
    return this.resourceName;
  }

  get pageSize() {
    return PAGE_SIZE;
  }

  get syncResourceScope() {
    return null;
  }

  get resourceName() {
    throw new Error('must implement resourceName');
  }

  get typeName() {
    throw new Error('must implement typeName');
  }

  get propertyName() {
    return this.typeName;
  }

  get syncLabel() {
    return this.resourceName.replace('_', ' ');
  }

  fetchObjects(lastSync, sequence) {
    throw new Error('must implement fetchObjects');
  }

  fetchLocalObjects() {
    throw new Error('must implement fetchLocalObjects');
  }

  findOrCreate(database, attributes) {
    throw new Error('must implement findOrCreate');
  }

  loadObject(object, attributes) {}

  process(object, attributes) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const isChanged = !object.isPersisted || _fulcrumCore.DateUtils.parseISOTimestamp(attributes.updated_at).getTime() !== object.updatedAt.getTime();

      object.updateFromAPIAttributes(attributes);

      if (object._deletedAt != null) {
        object._deletedAt = null;
      }

      yield _this.loadObject(object, attributes);

      yield object.save();

      if (isChanged) {
        yield _this.triggerEvent('save', { [_this.propertyName]: object });
      }
    })();
  }

  triggerEvent(name, args) {
    return this.trigger(`${this.typeName}:${name}`, args);
  }

  fail(account, results) {
    fulcrum.logger.log(account.organizationName.green, 'failed'.red);
  }

  run({ dataSource }) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      const sync = yield _this2.checkSyncState();

      if (!sync.needsUpdate) {
        return;
      }

      _this2.progress({ message: _this2.downloading + ' ' + _this2.syncLabel });

      const response = yield _this2.fetchObjects();

      const objects = JSON.parse(response.body)[_this2.resourceName];

      _this2.progress({ message: _this2.processing + ' ' + _this2.syncLabel, count: 0, total: objects.length });

      const localObjects = yield _this2.fetchLocalObjects();

      _this2.markDeletedObjects(localObjects, objects, _this2.typeName, _this2.propertyName);

      for (let index = 0; index < objects.length; ++index) {
        const attributes = objects[index];

        const object = yield _this2.findOrCreate(_this2.account.db, attributes);

        yield _this2.process(object, attributes);

        _this2.progress({ message: _this2.processing + ' ' + _this2.syncLabel, count: index + 1, total: objects.length });
      }

      yield sync.update();

      dataSource.source.invalidate(_this2.resourceName);

      _this2.progress({ message: _this2.finished + ' ' + _this2.syncLabel, count: objects.length, total: objects.length });
    })();
  }
}
exports.default = DownloadResource;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tYWluL3N5bmMvdGFza3MvZG93bmxvYWQtcmVzb3VyY2UuanMiXSwibmFtZXMiOlsiUEFHRV9TSVpFIiwiRG93bmxvYWRSZXNvdXJjZSIsInN5bmNSZXNvdXJjZU5hbWUiLCJyZXNvdXJjZU5hbWUiLCJwYWdlU2l6ZSIsInN5bmNSZXNvdXJjZVNjb3BlIiwiRXJyb3IiLCJ0eXBlTmFtZSIsInByb3BlcnR5TmFtZSIsInN5bmNMYWJlbCIsInJlcGxhY2UiLCJmZXRjaE9iamVjdHMiLCJsYXN0U3luYyIsInNlcXVlbmNlIiwiZmV0Y2hMb2NhbE9iamVjdHMiLCJmaW5kT3JDcmVhdGUiLCJkYXRhYmFzZSIsImF0dHJpYnV0ZXMiLCJsb2FkT2JqZWN0Iiwib2JqZWN0IiwicHJvY2VzcyIsImlzQ2hhbmdlZCIsImlzUGVyc2lzdGVkIiwicGFyc2VJU09UaW1lc3RhbXAiLCJ1cGRhdGVkX2F0IiwiZ2V0VGltZSIsInVwZGF0ZWRBdCIsInVwZGF0ZUZyb21BUElBdHRyaWJ1dGVzIiwiX2RlbGV0ZWRBdCIsInNhdmUiLCJ0cmlnZ2VyRXZlbnQiLCJuYW1lIiwiYXJncyIsInRyaWdnZXIiLCJmYWlsIiwiYWNjb3VudCIsInJlc3VsdHMiLCJmdWxjcnVtIiwibG9nZ2VyIiwibG9nIiwib3JnYW5pemF0aW9uTmFtZSIsImdyZWVuIiwicmVkIiwicnVuIiwiZGF0YVNvdXJjZSIsInN5bmMiLCJjaGVja1N5bmNTdGF0ZSIsIm5lZWRzVXBkYXRlIiwicHJvZ3Jlc3MiLCJtZXNzYWdlIiwiZG93bmxvYWRpbmciLCJyZXNwb25zZSIsIm9iamVjdHMiLCJKU09OIiwicGFyc2UiLCJib2R5IiwicHJvY2Vzc2luZyIsImNvdW50IiwidG90YWwiLCJsZW5ndGgiLCJsb2NhbE9iamVjdHMiLCJtYXJrRGVsZXRlZE9iamVjdHMiLCJpbmRleCIsImRiIiwidXBkYXRlIiwic291cmNlIiwiaW52YWxpZGF0ZSIsImZpbmlzaGVkIl0sIm1hcHBpbmdzIjoiOzs7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b3VyY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVGFzayBmcm9tICcuL3Rhc2snO1xuaW1wb3J0IHsgRGF0ZVV0aWxzIH0gZnJvbSAnZnVsY3J1bS1jb3JlJztcblxuY29uc3QgUEFHRV9TSVpFID0gNTAwO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEb3dubG9hZFJlc291cmNlIGV4dGVuZHMgVGFzayB7XG4gIGdldCBzeW5jUmVzb3VyY2VOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLnJlc291cmNlTmFtZTtcbiAgfVxuXG4gIGdldCBwYWdlU2l6ZSgpIHtcbiAgICByZXR1cm4gUEFHRV9TSVpFO1xuICB9XG5cbiAgZ2V0IHN5bmNSZXNvdXJjZVNjb3BlKCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0IHJlc291cmNlTmFtZSgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ211c3QgaW1wbGVtZW50IHJlc291cmNlTmFtZScpO1xuICB9XG5cbiAgZ2V0IHR5cGVOYW1lKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbXVzdCBpbXBsZW1lbnQgdHlwZU5hbWUnKTtcbiAgfVxuXG4gIGdldCBwcm9wZXJ0eU5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZU5hbWU7XG4gIH1cblxuICBnZXQgc3luY0xhYmVsKCkge1xuICAgIHJldHVybiB0aGlzLnJlc291cmNlTmFtZS5yZXBsYWNlKCdfJywgJyAnKTtcbiAgfVxuXG4gIGZldGNoT2JqZWN0cyhsYXN0U3luYywgc2VxdWVuY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ211c3QgaW1wbGVtZW50IGZldGNoT2JqZWN0cycpO1xuICB9XG5cbiAgZmV0Y2hMb2NhbE9iamVjdHMoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdtdXN0IGltcGxlbWVudCBmZXRjaExvY2FsT2JqZWN0cycpO1xuICB9XG5cbiAgZmluZE9yQ3JlYXRlKGRhdGFiYXNlLCBhdHRyaWJ1dGVzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdtdXN0IGltcGxlbWVudCBmaW5kT3JDcmVhdGUnKTtcbiAgfVxuXG4gIGxvYWRPYmplY3Qob2JqZWN0LCBhdHRyaWJ1dGVzKSB7XG4gIH1cblxuICBhc3luYyBwcm9jZXNzKG9iamVjdCwgYXR0cmlidXRlcykge1xuICAgIGNvbnN0IGlzQ2hhbmdlZCA9ICFvYmplY3QuaXNQZXJzaXN0ZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICBEYXRlVXRpbHMucGFyc2VJU09UaW1lc3RhbXAoYXR0cmlidXRlcy51cGRhdGVkX2F0KS5nZXRUaW1lKCkgIT09IG9iamVjdC51cGRhdGVkQXQuZ2V0VGltZSgpO1xuXG4gICAgb2JqZWN0LnVwZGF0ZUZyb21BUElBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuXG4gICAgaWYgKG9iamVjdC5fZGVsZXRlZEF0ICE9IG51bGwpIHtcbiAgICAgIG9iamVjdC5fZGVsZXRlZEF0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmxvYWRPYmplY3Qob2JqZWN0LCBhdHRyaWJ1dGVzKTtcblxuICAgIGF3YWl0IG9iamVjdC5zYXZlKCk7XG5cbiAgICBpZiAoaXNDaGFuZ2VkKSB7XG4gICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudCgnc2F2ZScsIHtbdGhpcy5wcm9wZXJ0eU5hbWVdOiBvYmplY3R9KTtcbiAgICB9XG4gIH1cblxuICB0cmlnZ2VyRXZlbnQobmFtZSwgYXJncykge1xuICAgIHJldHVybiB0aGlzLnRyaWdnZXIoYCR7IHRoaXMudHlwZU5hbWUgfTokeyBuYW1lIH1gLCBhcmdzKTtcbiAgfVxuXG4gIGZhaWwoYWNjb3VudCwgcmVzdWx0cykge1xuICAgIGZ1bGNydW0ubG9nZ2VyLmxvZyhhY2NvdW50Lm9yZ2FuaXphdGlvbk5hbWUuZ3JlZW4sICdmYWlsZWQnLnJlZCk7XG4gIH1cblxuICBhc3luYyBydW4oe2RhdGFTb3VyY2V9KSB7XG4gICAgY29uc3Qgc3luYyA9IGF3YWl0IHRoaXMuY2hlY2tTeW5jU3RhdGUoKTtcblxuICAgIGlmICghc3luYy5uZWVkc1VwZGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucHJvZ3Jlc3Moe21lc3NhZ2U6IHRoaXMuZG93bmxvYWRpbmcgKyAnICcgKyB0aGlzLnN5bmNMYWJlbH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmZldGNoT2JqZWN0cygpO1xuXG4gICAgY29uc3Qgb2JqZWN0cyA9IEpTT04ucGFyc2UocmVzcG9uc2UuYm9keSlbdGhpcy5yZXNvdXJjZU5hbWVdO1xuXG4gICAgdGhpcy5wcm9ncmVzcyh7bWVzc2FnZTogdGhpcy5wcm9jZXNzaW5nICsgJyAnICsgdGhpcy5zeW5jTGFiZWwsIGNvdW50OiAwLCB0b3RhbDogb2JqZWN0cy5sZW5ndGh9KTtcblxuICAgIGNvbnN0IGxvY2FsT2JqZWN0cyA9IGF3YWl0IHRoaXMuZmV0Y2hMb2NhbE9iamVjdHMoKTtcblxuICAgIHRoaXMubWFya0RlbGV0ZWRPYmplY3RzKGxvY2FsT2JqZWN0cywgb2JqZWN0cywgdGhpcy50eXBlTmFtZSwgdGhpcy5wcm9wZXJ0eU5hbWUpO1xuXG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG9iamVjdHMubGVuZ3RoOyArK2luZGV4KSB7XG4gICAgICBjb25zdCBhdHRyaWJ1dGVzID0gb2JqZWN0c1tpbmRleF07XG5cbiAgICAgIGNvbnN0IG9iamVjdCA9IGF3YWl0IHRoaXMuZmluZE9yQ3JlYXRlKHRoaXMuYWNjb3VudC5kYiwgYXR0cmlidXRlcyk7XG5cbiAgICAgIGF3YWl0IHRoaXMucHJvY2VzcyhvYmplY3QsIGF0dHJpYnV0ZXMpO1xuXG4gICAgICB0aGlzLnByb2dyZXNzKHttZXNzYWdlOiB0aGlzLnByb2Nlc3NpbmcgKyAnICcgKyB0aGlzLnN5bmNMYWJlbCwgY291bnQ6IGluZGV4ICsgMSwgdG90YWw6IG9iamVjdHMubGVuZ3RofSk7XG4gICAgfVxuXG4gICAgYXdhaXQgc3luYy51cGRhdGUoKTtcblxuICAgIGRhdGFTb3VyY2Uuc291cmNlLmludmFsaWRhdGUodGhpcy5yZXNvdXJjZU5hbWUpO1xuXG4gICAgdGhpcy5wcm9ncmVzcyh7bWVzc2FnZTogdGhpcy5maW5pc2hlZCArICcgJyArIHRoaXMuc3luY0xhYmVsLCBjb3VudDogb2JqZWN0cy5sZW5ndGgsIHRvdGFsOiBvYmplY3RzLmxlbmd0aH0pO1xuICB9XG59XG4iXX0=