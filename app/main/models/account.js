'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _minidb = require('minidb');

var _project = require('./project');

var _project2 = _interopRequireDefault(_project);

var _choiceList = require('./choice-list');

var _choiceList2 = _interopRequireDefault(_choiceList);

var _classificationSet = require('./classification-set');

var _classificationSet2 = _interopRequireDefault(_classificationSet);

var _form = require('./form');

var _form2 = _interopRequireDefault(_form);

var _record = require('./record');

var _record2 = _interopRequireDefault(_record);

var _role = require('./role');

var _role2 = _interopRequireDefault(_role);

var _membership = require('./membership');

var _membership2 = _interopRequireDefault(_membership);

var _changeset = require('./changeset');

var _changeset2 = _interopRequireDefault(_changeset);

var _photo = require('./photo');

var _photo2 = _interopRequireDefault(_photo);

var _video = require('./video');

var _video2 = _interopRequireDefault(_video);

var _audio = require('./audio');

var _audio2 = _interopRequireDefault(_audio);

var _signature = require('./signature');

var _signature2 = _interopRequireDefault(_signature);

var _syncState = require('./sync-state');

var _syncState2 = _interopRequireDefault(_syncState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

class Account {
  static get tableName() {
    return 'accounts';
  }

  static get columns() {
    return [{ name: 'userResourceID', column: 'user_resource_id', type: 'string', null: false }, { name: 'organizationResourceID', column: 'organization_resource_id', type: 'string', null: false }, { name: 'organizationName', column: 'organization_name', type: 'string', null: false }, { name: 'email', column: 'email', type: 'string', null: false }, { name: 'description', column: 'description', type: 'string' }, { name: 'firstName', column: 'first_name', type: 'string' }, { name: 'lastName', column: 'last_name', type: 'string' }, { name: 'lastSyncPhotos', column: 'last_sync_photos', type: 'datetime' }, { name: 'lastSyncVideos', column: 'last_sync_videos', type: 'datetime' }, { name: 'lastSyncAudio', column: 'last_sync_audio', type: 'datetime' }, { name: 'lastSyncSignatures', column: 'last_sync_signatures', type: 'datetime' }, { name: 'lastSyncChangesets', column: 'last_sync_changesets', type: 'datetime' }, { name: 'token', column: 'token', type: 'string' }, { name: 'deletedAt', column: 'deleted_at', type: 'datetime' }];
  }

  get userResourceID() {
    return this._userResourceID;
  }

  get organizationResourceID() {
    return this._organizationResourceID;
  }

  get organizationName() {
    return this._organizationName;
  }

  get email() {
    return this._email;
  }

  get firstName() {
    return this._firstName;
  }

  get lastName() {
    return this._lastName;
  }

  get token() {
    return this._token;
  }

  static findByUserAndOrganization(userID, organizationID, callback) {
    return Account.findFirst({ user_resource_id: userID,
      organization_resource_id: organizationID }, callback);
  }

  findForms(where) {
    return _form2.default.findAll(this.db, _extends({}, where, { account_id: this.rowID }), 'name ASC');
  }

  findProjects(where) {
    return _project2.default.findAll(this.db, _extends({}, where, { account_id: this.rowID }), 'name ASC');
  }

  findChoiceLists(where) {
    return _choiceList2.default.findAll(this.db, _extends({}, where, { account_id: this.rowID }), 'name ASC');
  }

  findClassificationSets(where) {
    return _classificationSet2.default.findAll(this.db, _extends({}, where, { account_id: this.rowID }), 'name ASC');
  }

  findRoles(where) {
    return _role2.default.findAll(this.db, _extends({}, where, { account_id: this.rowID }), 'name ASC');
  }

  findMemberships(where) {
    return _membership2.default.findAll(this.db, _extends({}, where, { account_id: this.rowID }), 'email ASC');
  }

  findFirstForm(where) {
    return _form2.default.findFirst(this.db, _extends({}, where, { account_id: this.rowID }), 'name ASC');
  }

  findFirstRecord(where) {
    return _record2.default.findFirst(this.db, _extends({}, where, { account_id: this.rowID }));
  }

  findEachRecord(where, callback) {
    return _record2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachPhoto(where, callback) {
    return _photo2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachVideo(where, callback) {
    return _video2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachAudio(where, callback) {
    return _audio2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachSignature(where, callback) {
    return _signature2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachChangeset(where, callback) {
    return _changeset2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachRole(where, callback) {
    return _role2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachChoiceList(where, callback) {
    return _choiceList2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachClassificationSet(where, callback) {
    return _classificationSet2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachForm(where, callback) {
    return _form2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachProject(where, callback) {
    return _project2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachMembership(where, callback) {
    return _membership2.default.findEach(this.db, { where: _extends({}, where, { account_id: this.rowID }) }, callback);
  }

  findEachBySQL(sql, values, callback) {
    return this.db.each(sql, values, callback);
  }

  findBySQL(sql, values, callback) {
    return this.db.all(sql, values, callback);
  }

  findActiveForms(where) {
    return _form2.default.findAll(this.db, _extends({}, where, { account_id: this.rowID, deleted_at: null }), 'name ASC');
  }

  projectByResourceID(projectId) {
    return _project2.default.findFirst(this.db, { account_id: this.rowID });
  }

  findSyncState(where) {
    return _syncState2.default.findOrCreate(this.db, _extends({}, where, { account_id: this.rowID }));
  }

  reset() {
    var _this = this;

    return _asyncToGenerator(function* () {
      yield _this.db.execute(`
      DELETE FROM columns WHERE table_name IN (
        SELECT name FROM tables WHERE name LIKE 'account_${_this.rowID}_%'
      );
    `);

      yield _this.db.execute(`
      DELETE FROM tables WHERE name LIKE 'account_${_this.rowID}_%';
    `);

      const viewNames = (yield _this.db.all(`
      SELECT tbl_name AS name FROM sqlite_master
      WHERE type = 'view' AND tbl_name LIKE 'account_${_this.rowID}_%'
      ORDER BY tbl_name;
    `)).map(function (o) {
        return o.name;
      });

      for (const viewName of viewNames) {
        yield _this.db.execute(`DROP VIEW ${_this.db.ident(viewName)};`);
      }

      const tableNames = (yield _this.db.all(`
      SELECT tbl_name AS name FROM sqlite_master
      WHERE type = 'table' AND tbl_name LIKE 'account_${_this.rowID}_%'
      ORDER BY tbl_name;
    `)).map(function (o) {
        return o.name;
      });

      for (const tableName of tableNames) {
        yield _this.db.execute(`DROP TABLE ${_this.db.ident(tableName)};`);
      }

      const accountTables = ['audio', 'changesets', 'choice_lists', 'classification_sets', 'forms', 'memberships', 'photos', 'projects', 'records', 'roles', 'signatures', 'videos'];

      for (const tableName of accountTables) {
        yield _this.db.execute(`DELETE FROM ${_this.db.ident(tableName)} WHERE account_id = ${_this.rowID};`);
      }

      yield _this.db.execute(`DELETE FROM sync_state WHERE account_id = ${_this.rowID};`);

      _this._lastSyncPhotos = null;
      _this._lastSyncVideos = null;
      _this._lastSyncAudio = null;
      _this._lastSyncSignatures = null;
      _this._lastSyncChangesets = null;

      yield _this.save();

      yield _this.db.execute('VACUUM');
    })();
  }
}

exports.default = Account;
_minidb.PersistentObject.register(Account);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL21vZGVscy9hY2NvdW50LmpzIl0sIm5hbWVzIjpbIkFjY291bnQiLCJ0YWJsZU5hbWUiLCJjb2x1bW5zIiwibmFtZSIsImNvbHVtbiIsInR5cGUiLCJudWxsIiwidXNlclJlc291cmNlSUQiLCJfdXNlclJlc291cmNlSUQiLCJvcmdhbml6YXRpb25SZXNvdXJjZUlEIiwiX29yZ2FuaXphdGlvblJlc291cmNlSUQiLCJvcmdhbml6YXRpb25OYW1lIiwiX29yZ2FuaXphdGlvbk5hbWUiLCJlbWFpbCIsIl9lbWFpbCIsImZpcnN0TmFtZSIsIl9maXJzdE5hbWUiLCJsYXN0TmFtZSIsIl9sYXN0TmFtZSIsInRva2VuIiwiX3Rva2VuIiwiZmluZEJ5VXNlckFuZE9yZ2FuaXphdGlvbiIsInVzZXJJRCIsIm9yZ2FuaXphdGlvbklEIiwiY2FsbGJhY2siLCJmaW5kRmlyc3QiLCJ1c2VyX3Jlc291cmNlX2lkIiwib3JnYW5pemF0aW9uX3Jlc291cmNlX2lkIiwiZmluZEZvcm1zIiwid2hlcmUiLCJmaW5kQWxsIiwiZGIiLCJhY2NvdW50X2lkIiwicm93SUQiLCJmaW5kUHJvamVjdHMiLCJmaW5kQ2hvaWNlTGlzdHMiLCJmaW5kQ2xhc3NpZmljYXRpb25TZXRzIiwiZmluZFJvbGVzIiwiZmluZE1lbWJlcnNoaXBzIiwiZmluZEZpcnN0Rm9ybSIsImZpbmRGaXJzdFJlY29yZCIsImZpbmRFYWNoUmVjb3JkIiwiZmluZEVhY2giLCJmaW5kRWFjaFBob3RvIiwiZmluZEVhY2hWaWRlbyIsImZpbmRFYWNoQXVkaW8iLCJmaW5kRWFjaFNpZ25hdHVyZSIsImZpbmRFYWNoQ2hhbmdlc2V0IiwiZmluZEVhY2hSb2xlIiwiZmluZEVhY2hDaG9pY2VMaXN0IiwiZmluZEVhY2hDbGFzc2lmaWNhdGlvblNldCIsImZpbmRFYWNoRm9ybSIsImZpbmRFYWNoUHJvamVjdCIsImZpbmRFYWNoTWVtYmVyc2hpcCIsImZpbmRFYWNoQnlTUUwiLCJzcWwiLCJ2YWx1ZXMiLCJlYWNoIiwiZmluZEJ5U1FMIiwiYWxsIiwiZmluZEFjdGl2ZUZvcm1zIiwiZGVsZXRlZF9hdCIsInByb2plY3RCeVJlc291cmNlSUQiLCJwcm9qZWN0SWQiLCJmaW5kU3luY1N0YXRlIiwiZmluZE9yQ3JlYXRlIiwicmVzZXQiLCJleGVjdXRlIiwidmlld05hbWVzIiwibWFwIiwibyIsInZpZXdOYW1lIiwiaWRlbnQiLCJ0YWJsZU5hbWVzIiwiYWNjb3VudFRhYmxlcyIsIl9sYXN0U3luY1Bob3RvcyIsIl9sYXN0U3luY1ZpZGVvcyIsIl9sYXN0U3luY0F1ZGlvIiwiX2xhc3RTeW5jU2lnbmF0dXJlcyIsIl9sYXN0U3luY0NoYW5nZXNldHMiLCJzYXZlIiwicmVnaXN0ZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRWUsTUFBTUEsT0FBTixDQUFjO0FBQzNCLGFBQVdDLFNBQVgsR0FBdUI7QUFDckIsV0FBTyxVQUFQO0FBQ0Q7O0FBRUQsYUFBV0MsT0FBWCxHQUFxQjtBQUNuQixXQUFPLENBQ0wsRUFBRUMsTUFBTSxnQkFBUixFQUEwQkMsUUFBUSxrQkFBbEMsRUFBc0RDLE1BQU0sUUFBNUQsRUFBc0VDLE1BQU0sS0FBNUUsRUFESyxFQUVMLEVBQUVILE1BQU0sd0JBQVIsRUFBa0NDLFFBQVEsMEJBQTFDLEVBQXNFQyxNQUFNLFFBQTVFLEVBQXNGQyxNQUFNLEtBQTVGLEVBRkssRUFHTCxFQUFFSCxNQUFNLGtCQUFSLEVBQTRCQyxRQUFRLG1CQUFwQyxFQUF5REMsTUFBTSxRQUEvRCxFQUF5RUMsTUFBTSxLQUEvRSxFQUhLLEVBSUwsRUFBRUgsTUFBTSxPQUFSLEVBQWlCQyxRQUFRLE9BQXpCLEVBQWtDQyxNQUFNLFFBQXhDLEVBQWtEQyxNQUFNLEtBQXhELEVBSkssRUFLTCxFQUFF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SzFDLEVBQUwsQ0FBUW9DLE9BQVIsQ0FBaUIsY0FBYSxNQUFLcEMsRUFBTCxDQUFReUMsS0FBUixDQUFjdkUsU0FBZCxDQUF5QixHQUF2RCxDQUFOO0FBQ0Q7O0FBRUQsWUFBTXlFLGdCQUFnQixDQUNwQixPQURvQixFQUVwQixZQUZvQixFQUdwQixjQUhvQixFQUlwQixxQkFKb0IsRUFLcEIsT0FMb0IsRUFNcEIsYUFOb0IsRUFPcEIsUUFQb0IsRUFRcEIsVUFSb0IsRUFTcEIsU0FUb0IsRUFVcEIsT0FWb0IsRUFXcEIsWUFYb0IsRUFZcEIsUUFab0IsQ0FBdEI7O0FBZUEsV0FBSyxNQUFNekUsU0FBWCxJQUF3QnlFLGFBQXhCLEVBQXVDO0FBQ3JDLGNBQU0sTUFBSzNDLEVBQUwsQ0FBUW9DLE9BQVIsQ0FBaUIsZUFBYyxNQUFLcEMsRUFBTCxDQUFReUMsS0FBUixDQUFjdkUsU0FBZCxDQUF5Qix1QkFBc0IsTUFBS2dDLEtBQU0sR0FBekYsQ0FBTjtBQUNEOztBQUVELFlBQU0sTUFBS0YsRUFBTCxDQUFRb0MsT0FBUixDQUFpQiw2Q0FBNEMsTUFBS2xDLEtBQU0sR0FBeEUsQ0FBTjs7QUFFQSxZQUFLMEMsZUFBTCxHQUF1QixJQUF2QjtBQUNBLFlBQUtDLGVBQUwsR0FBdUIsSUFBdkI7QUFDQSxZQUFLQyxjQUFMLEdBQXNCLElBQXRCO0FBQ0EsWUFBS0MsbUJBQUwsR0FBMkIsSUFBM0I7QUFDQSxZQUFLQyxtQkFBTCxHQUEyQixJQUEzQjs7QUFFQSxZQUFNLE1BQUtDLElBQUwsRUFBTjs7QUFFQSxZQUFNLE1BQUtqRCxFQUFMLENBQVFvQyxPQUFSLENBQWdCLFFBQWhCLENBQU47QUE1RFk7QUE2RGI7QUExTjBCOztrQkFBUm5FLE87QUE2TnJCLHlCQUFpQmlGLFFBQWpCLENBQTBCakYsT0FBMUIiLCJmaWxlIjoiYWNjb3VudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBlcnNpc3RlbnRPYmplY3QgfSBmcm9tICdtaW5pZGInO1xuaW1wb3J0IFByb2plY3QgZnJvbSAnLi9wcm9qZWN0JztcbmltcG9ydCBDaG9pY2VMaXN0IGZyb20gJy4vY2hvaWNlLWxpc3QnO1xuaW1wb3J0IENsYXNzaWZpY2F0aW9uU2V0IGZyb20gJy4vY2xhc3NpZmljYXRpb24tc2V0JztcbmltcG9ydCBGb3JtIGZyb20gJy4vZm9ybSc7XG5pbXBvcnQgUmVjb3JkIGZyb20gJy4vcmVjb3JkJztcbmltcG9ydCBSb2xlIGZyb20gJy4vcm9sZSc7XG5pbXBvcnQgTWVtYmVyc2hpcCBmcm9tICcuL21lbWJlcnNoaXAnO1xuaW1wb3J0IENoYW5nZXNldCBmcm9tICcuL2NoYW5nZXNldCc7XG5pbXBvcnQgUGhvdG8gZnJvbSAnLi9waG90byc7XG5pbXBvcnQgVmlkZW8gZnJvbSAnLi92aWRlbyc7XG5pbXBvcnQgQXVkaW8gZnJvbSAnLi9hdWRpbyc7XG5pbXBvcnQgU2lnbmF0dXJlIGZyb20gJy4vc2lnbmF0dXJlJztcbmltcG9ydCBTeW5jU3RhdGUgZnJvbSAnLi9zeW5jLXN0YXRlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWNjb3VudCB7XG4gIHN0YXRpYyBnZXQgdGFibGVOYW1lKCkge1xuICAgIHJldHVybiAnYWNjb3VudHMnO1xuICB9XG5cbiAgc3RhdGljIGdldCBjb2x1bW5zKCkge1xuICAgIHJldHVybiBbXG4gICAgICB7IG5hbWU6ICd1c2VyUmVzb3VyY2VJRCcsIGNvbHVtbjogJ3VzZXJfcmVzb3VyY2VfaWQnLCB0eXBlOiAnc3RyaW5nJywgbnVsbDogZmFsc2UgfSxcbiAgICAgIHsgbmFtZTogJ29yZ2FuaXphdGlvblJlc291cmNlSUQnLCBjb2x1bW46ICdvcmdhbml6YXRpb25fcmVzb3VyY2VfaWQnLCB0eXBlOiAnc3RyaW5nJywgbnVsbDogZmFsc2UgfSxcbiAgICAgIHsgbmFtZTogJ29yZ2FuaXphdGlvbk5hbWUnLCBjb2x1bW46ICdvcmdhbml6YXRpb25fbmFtZScsIHR5cGU6ICdzdHJpbmcnLCBudWxsOiBmYWxzZSB9LFxuICAgICAgeyBuYW1lOiAnZW1haWwnLCBjb2x1bW46ICdlbWFpbCcsIHR5cGU6ICdzdHJpbmcnLCBudWxsOiBmYWxzZSB9LFxuICAgICAgeyBuYW1lOiAnZGVzY3JpcHRpb24nLCBjb2x1bW46ICdkZXNjcmlwdGlvbicsIHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICB7IG5hbWU6ICdmaXJzdE5hbWUnLCBjb2x1bW46ICdmaXJzdF9uYW1lJywgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgIHsgbmFtZTogJ2xhc3ROYW1lJywgY29sdW1uOiAnbGFzdF9uYW1lJywgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgIHsgbmFtZTogJ2xhc3RTeW5jUGhvdG9zJywgY29sdW1uOiAnbGFzdF9zeW5jX3Bob3RvcycsIHR5cGU6ICdkYXRldGltZScgfSxcbiAgICAgIHsgbmFtZTogJ2xhc3RTeW5jVmlkZW9zJywgY29sdW1uOiAnbGFzdF9zeW5jX3ZpZGVvcycsIHR5cGU6ICdkYXRldGltZScgfSxcbiAgICAgIHsgbmFtZTogJ2xhc3RTeW5jQXVkaW8nLCBjb2x1bW46ICdsYXN0X3N5bmNfYXVkaW8nLCB0eXBlOiAnZGF0ZXRpbWUnIH0sXG4gICAgICB7IG5hbWU6ICdsYXN0U3luY1NpZ25hdHVyZXMnLCBjb2x1bW46ICdsYXN0X3N5bmNfc2lnbmF0dXJlcycsIHR5cGU6ICdkYXRldGltZScgfSxcbiAgICAgIHsgbmFtZTogJ2xhc3RTeW5jQ2hhbmdlc2V0cycsIGNvbHVtbjogJ2xhc3Rfc3luY19jaGFuZ2VzZXRzJywgdHlwZTogJ2RhdGV0aW1lJyB9LFxuICAgICAgeyBuYW1lOiAndG9rZW4nLCBjb2x1bW46ICd0b2tlbicsIHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICB7IG5hbWU6ICdkZWxldGVkQXQnLCBjb2x1bW46ICdkZWxldGVkX2F0JywgdHlwZTogJ2RhdGV0aW1lJyB9XG4gICAgXTtcbiAgfVxuXG4gIGdldCB1c2VyUmVzb3VyY2VJRCgpIHtcbiAgICByZXR1cm4gdGhpcy5fdXNlclJlc291cmNlSUQ7XG4gIH1cblxuICBnZXQgb3JnYW5pemF0aW9uUmVzb3VyY2VJRCgpIHtcbiAgICByZXR1cm4gdGhpcy5fb3JnYW5pemF0aW9uUmVzb3VyY2VJRDtcbiAgfVxuXG4gIGdldCBvcmdhbml6YXRpb25OYW1lKCkge1xuICAgIHJldHVybiB0aGlzLl9vcmdhbml6YXRpb25OYW1lO1xuICB9XG5cbiAgZ2V0IGVtYWlsKCkge1xuICAgIHJldHVybiB0aGlzLl9lbWFpbDtcbiAgfVxuXG4gIGdldCBmaXJzdE5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ZpcnN0TmFtZTtcbiAgfVxuXG4gIGdldCBsYXN0TmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGFzdE5hbWU7XG4gIH1cblxuICBnZXQgdG9rZW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Rva2VuO1xuICB9XG5cbiAgc3RhdGljIGZpbmRCeVVzZXJBbmRPcmdhbml6YXRpb24odXNlcklELCBvcmdhbml6YXRpb25JRCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gQWNjb3VudC5maW5kRmlyc3Qoe3VzZXJfcmVzb3VyY2VfaWQ6IHVzZXJJRCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yZ2FuaXphdGlvbl9yZXNvdXJjZV9pZDogb3JnYW5pemF0aW9uSUR9LCBjYWxsYmFjayk7XG4gIH1cblxuICBmaW5kRm9ybXMod2hlcmUpIHtcbiAgICByZXR1cm4gRm9ybS5maW5kQWxsKHRoaXMuZGIsIHsuLi53aGVyZSwgYWNjb3VudF9pZDogdGhpcy5yb3dJRH0sICduYW1lIEFTQycpO1xuICB9XG5cbiAgZmluZFByb2plY3RzKHdoZXJlKSB7XG4gICAgcmV0dXJuIFByb2plY3QuZmluZEFsbCh0aGlzLmRiLCB7Li4ud2hlcmUsIGFjY291bnRfaWQ6IHRoaXMucm93SUR9LCAnbmFtZSBBU0MnKTtcbiAgfVxuXG4gIGZpbmRDaG9pY2VMaXN0cyh3aGVyZSkge1xuICAgIHJldHVybiBDaG9pY2VMaXN0LmZpbmRBbGwodGhpcy5kYiwgey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfSwgJ25hbWUgQVNDJyk7XG4gIH1cblxuICBmaW5kQ2xhc3NpZmljYXRpb25TZXRzKHdoZXJlKSB7XG4gICAgcmV0dXJuIENsYXNzaWZpY2F0aW9uU2V0LmZpbmRBbGwodGhpcy5kYiwgey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfSwgJ25hbWUgQVNDJyk7XG4gIH1cblxuICBmaW5kUm9sZXMod2hlcmUpIHtcbiAgICByZXR1cm4gUm9sZS5maW5kQWxsKHRoaXMuZGIsIHsuLi53aGVyZSwgYWNjb3VudF9pZDogdGhpcy5yb3dJRH0sICduYW1lIEFTQycpO1xuICB9XG5cbiAgZmluZE1lbWJlcnNoaXBzKHdoZXJlKSB7XG4gICAgcmV0dXJuIE1lbWJlcnNoaXAuZmluZEFsbCh0aGlzLmRiLCB7Li4ud2hlcmUsIGFjY291bnRfaWQ6IHRoaXMucm93SUR9LCAnZW1haWwgQVNDJyk7XG4gIH1cblxuICBmaW5kRmlyc3RGb3JtKHdoZXJlKSB7XG4gICAgcmV0dXJuIEZvcm0uZmluZEZpcnN0KHRoaXMuZGIsIHsuLi53aGVyZSwgYWNjb3VudF9pZDogdGhpcy5yb3dJRH0sICduYW1lIEFTQycpO1xuICB9XG5cbiAgZmluZEZpcnN0UmVjb3JkKHdoZXJlKSB7XG4gICAgcmV0dXJuIFJlY29yZC5maW5kRmlyc3QodGhpcy5kYiwgey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfSk7XG4gIH1cblxuICBmaW5kRWFjaFJlY29yZCh3aGVyZSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gUmVjb3JkLmZpbmRFYWNoKHRoaXMuZGIsIHt3aGVyZTogey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfX0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZpbmRFYWNoUGhvdG8od2hlcmUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIFBob3RvLmZpbmRFYWNoKHRoaXMuZGIsIHt3aGVyZTogey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfX0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZpbmRFYWNoVmlkZW8od2hlcmUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIFZpZGVvLmZpbmRFYWNoKHRoaXMuZGIsIHt3aGVyZTogey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfX0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZpbmRFYWNoQXVkaW8od2hlcmUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIEF1ZGlvLmZpbmRFYWNoKHRoaXMuZGIsIHt3aGVyZTogey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfX0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZpbmRFYWNoU2lnbmF0dXJlKHdoZXJlLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBTaWduYXR1cmUuZmluZEVhY2godGhpcy5kYiwge3doZXJlOiB7Li4ud2hlcmUsIGFjY291bnRfaWQ6IHRoaXMucm93SUR9fSwgY2FsbGJhY2spO1xuICB9XG5cbiAgZmluZEVhY2hDaGFuZ2VzZXQod2hlcmUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIENoYW5nZXNldC5maW5kRWFjaCh0aGlzLmRiLCB7d2hlcmU6IHsuLi53aGVyZSwgYWNjb3VudF9pZDogdGhpcy5yb3dJRH19LCBjYWxsYmFjayk7XG4gIH1cblxuICBmaW5kRWFjaFJvbGUod2hlcmUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIFJvbGUuZmluZEVhY2godGhpcy5kYiwge3doZXJlOiB7Li4ud2hlcmUsIGFjY291bnRfaWQ6IHRoaXMucm93SUR9fSwgY2FsbGJhY2spO1xuICB9XG5cbiAgZmluZEVhY2hDaG9pY2VMaXN0KHdoZXJlLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBDaG9pY2VMaXN0LmZpbmRFYWNoKHRoaXMuZGIsIHt3aGVyZTogey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfX0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZpbmRFYWNoQ2xhc3NpZmljYXRpb25TZXQod2hlcmUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIENsYXNzaWZpY2F0aW9uU2V0LmZpbmRFYWNoKHRoaXMuZGIsIHt3aGVyZTogey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfX0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZpbmRFYWNoRm9ybSh3aGVyZSwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gRm9ybS5maW5kRWFjaCh0aGlzLmRiLCB7d2hlcmU6IHsuLi53aGVyZSwgYWNjb3VudF9pZDogdGhpcy5yb3dJRH19LCBjYWxsYmFjayk7XG4gIH1cblxuICBmaW5kRWFjaFByb2plY3Qod2hlcmUsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIFByb2plY3QuZmluZEVhY2godGhpcy5kYiwge3doZXJlOiB7Li4ud2hlcmUsIGFjY291bnRfaWQ6IHRoaXMucm93SUR9fSwgY2FsbGJhY2spO1xuICB9XG5cbiAgZmluZEVhY2hNZW1iZXJzaGlwKHdoZXJlLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBNZW1iZXJzaGlwLmZpbmRFYWNoKHRoaXMuZGIsIHt3aGVyZTogey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfX0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZpbmRFYWNoQnlTUUwoc3FsLCB2YWx1ZXMsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZGIuZWFjaChzcWwsIHZhbHVlcywgY2FsbGJhY2spO1xuICB9XG5cbiAgZmluZEJ5U1FMKHNxbCwgdmFsdWVzLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmRiLmFsbChzcWwsIHZhbHVlcywgY2FsbGJhY2spO1xuICB9XG5cbiAgZmluZEFjdGl2ZUZvcm1zKHdoZXJlKSB7XG4gICAgcmV0dXJuIEZvcm0uZmluZEFsbCh0aGlzLmRiLCB7Li4ud2hlcmUsIGFjY291bnRfaWQ6IHRoaXMucm93SUQsIGRlbGV0ZWRfYXQ6IG51bGx9LCAnbmFtZSBBU0MnKTtcbiAgfVxuXG4gIHByb2plY3RCeVJlc291cmNlSUQocHJvamVjdElkKSB7XG4gICAgcmV0dXJuIFByb2plY3QuZmluZEZpcnN0KHRoaXMuZGIsIHthY2NvdW50X2lkOiB0aGlzLnJvd0lEfSk7XG4gIH1cblxuICBmaW5kU3luY1N0YXRlKHdoZXJlKSB7XG4gICAgcmV0dXJuIFN5bmNTdGF0ZS5maW5kT3JDcmVhdGUodGhpcy5kYiwgey4uLndoZXJlLCBhY2NvdW50X2lkOiB0aGlzLnJvd0lEfSk7XG4gIH1cblxuICBhc3luYyByZXNldCgpIHtcbiAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoYFxuICAgICAgREVMRVRFIEZST00gY29sdW1ucyBXSEVSRSB0YWJsZV9uYW1lIElOIChcbiAgICAgICAgU0VMRUNUIG5hbWUgRlJPTSB0YWJsZXMgV0hFUkUgbmFtZSBMSUtFICdhY2NvdW50XyR7dGhpcy5yb3dJRH1fJSdcbiAgICAgICk7XG4gICAgYCk7XG5cbiAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoYFxuICAgICAgREVMRVRFIEZST00gdGFibGVzIFdIRVJFIG5hbWUgTElLRSAnYWNjb3VudF8ke3RoaXMucm93SUR9XyUnO1xuICAgIGApO1xuXG4gICAgY29uc3Qgdmlld05hbWVzID0gKGF3YWl0IHRoaXMuZGIuYWxsKGBcbiAgICAgIFNFTEVDVCB0YmxfbmFtZSBBUyBuYW1lIEZST00gc3FsaXRlX21hc3RlclxuICAgICAgV0hFUkUgdHlwZSA9ICd2aWV3JyBBTkQgdGJsX25hbWUgTElLRSAnYWNjb3VudF8ke3RoaXMucm93SUR9XyUnXG4gICAgICBPUkRFUiBCWSB0YmxfbmFtZTtcbiAgICBgKSkubWFwKG8gPT4gby5uYW1lKTtcblxuICAgIGZvciAoY29uc3Qgdmlld05hbWUgb2Ygdmlld05hbWVzKSB7XG4gICAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoYERST1AgVklFVyAke3RoaXMuZGIuaWRlbnQodmlld05hbWUpfTtgKTtcbiAgICB9XG5cbiAgICBjb25zdCB0YWJsZU5hbWVzID0gKGF3YWl0IHRoaXMuZGIuYWxsKGBcbiAgICAgIFNFTEVDVCB0YmxfbmFtZSBBUyBuYW1lIEZST00gc3FsaXRlX21hc3RlclxuICAgICAgV0hFUkUgdHlwZSA9ICd0YWJsZScgQU5EIHRibF9uYW1lIExJS0UgJ2FjY291bnRfJHt0aGlzLnJvd0lEfV8lJ1xuICAgICAgT1JERVIgQlkgdGJsX25hbWU7XG4gICAgYCkpLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgICBmb3IgKGNvbnN0IHRhYmxlTmFtZSBvZiB0YWJsZU5hbWVzKSB7XG4gICAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoYERST1AgVEFCTEUgJHt0aGlzLmRiLmlkZW50KHRhYmxlTmFtZSl9O2ApO1xuICAgIH1cblxuICAgIGNvbnN0IGFjY291bnRUYWJsZXMgPSBbXG4gICAgICAnYXVkaW8nLFxuICAgICAgJ2NoYW5nZXNldHMnLFxuICAgICAgJ2Nob2ljZV9saXN0cycsXG4gICAgICAnY2xhc3NpZmljYXRpb25fc2V0cycsXG4gICAgICAnZm9ybXMnLFxuICAgICAgJ21lbWJlcnNoaXBzJyxcbiAgICAgICdwaG90b3MnLFxuICAgICAgJ3Byb2plY3RzJyxcbiAgICAgICdyZWNvcmRzJyxcbiAgICAgICdyb2xlcycsXG4gICAgICAnc2lnbmF0dXJlcycsXG4gICAgICAndmlkZW9zJ1xuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHRhYmxlTmFtZSBvZiBhY2NvdW50VGFibGVzKSB7XG4gICAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoYERFTEVURSBGUk9NICR7dGhpcy5kYi5pZGVudCh0YWJsZU5hbWUpfSBXSEVSRSBhY2NvdW50X2lkID0gJHt0aGlzLnJvd0lEfTtgKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmRiLmV4ZWN1dGUoYERFTEVURSBGUk9NIHN5bmNfc3RhdGUgV0hFUkUgYWNjb3VudF9pZCA9ICR7dGhpcy5yb3dJRH07YCk7XG5cbiAgICB0aGlzLl9sYXN0U3luY1Bob3RvcyA9IG51bGw7XG4gICAgdGhpcy5fbGFzdFN5bmNWaWRlb3MgPSBudWxsO1xuICAgIHRoaXMuX2xhc3RTeW5jQXVkaW8gPSBudWxsO1xuICAgIHRoaXMuX2xhc3RTeW5jU2lnbmF0dXJlcyA9IG51bGw7XG4gICAgdGhpcy5fbGFzdFN5bmNDaGFuZ2VzZXRzID0gbnVsbDtcblxuICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuXG4gICAgYXdhaXQgdGhpcy5kYi5leGVjdXRlKCdWQUNVVU0nKTtcbiAgfVxufVxuXG5QZXJzaXN0ZW50T2JqZWN0LnJlZ2lzdGVyKEFjY291bnQpO1xuIl19