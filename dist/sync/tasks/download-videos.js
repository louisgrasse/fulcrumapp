'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _downloadSequence = require('./download-sequence');

var _downloadSequence2 = _interopRequireDefault(_downloadSequence);

var _client = require('../../api/client');

var _client2 = _interopRequireDefault(_client);

var _video = require('../../models/video');

var _video2 = _interopRequireDefault(_video);

var _fulcrumCore = require('fulcrum-core');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

class DownloadVideos extends _downloadSequence2.default {
  get syncResourceName() {
    return 'videos';
  }

  get syncLabel() {
    return 'videos';
  }

  get resourceName() {
    return 'videos';
  }

  get lastSync() {
    return this.account._lastSyncVideos;
  }

  fetchObjects(account, lastSync, sequence) {
    var _this = this;

    return _asyncToGenerator(function* () {
      return _client2.default.getVideos(account, sequence, _this.pageSize);
    })();
  }

  findOrCreate(database, account, attributes) {
    return _video2.default.findOrCreate(database, { account_id: account.rowID, resource_id: attributes.access_key });
  }

  process(object, attributes) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      object.updateFromAPIAttributes(attributes);

      const isChanged = !object.isPersisted || _fulcrumCore.DateUtils.parseISOTimestamp(attributes.updated_at).getTime() !== object.updatedAt.getTime();

      if (attributes.processed) {
        if (!object.isDownloaded) {
          // queue.push(attributes, function(err) {
          //   if (err) {
          //     console.log('ERROR DOWNLOADING', err);
          //     throw err;
          //   }

          //   object.isDownloaded = true;
          //   // do we need to await this somehow?
          //   object.save();
          // });
        }
      } else {
        object.isDownloaded = false;
      }

      if (object.isDownloaded == null) {
        object.isDownloaded = false;
      }

      yield _this2.lookup(object, attributes.form_id, '_formRowID', 'getForm');

      if (object._formRowID) {
        const record = yield _this2.account.findFirstRecord({ resource_id: attributes.record_id });

        if (record) {
          object._recordRowID = record.rowID;
        }
      }

      _this2.account._lastSyncVideos = object._updatedAt;

      yield object.save();

      if (isChanged) {
        yield _this2.trigger('video:save', { video: object });
      }
    })();
  }

  finish() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // update the lastSync date
      yield _this3.account.save();
    })();
  }

  fail(account, results) {
    console.log(account.organizationName.green, 'failed'.red);
  }
}
exports.default = DownloadVideos;
//# sourceMappingURL=download-videos.js.map