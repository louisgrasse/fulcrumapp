'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _client = require('../../api/client');

var _client2 = _interopRequireDefault(_client);

var _classificationSet = require('../../models/classification-set');

var _classificationSet2 = _interopRequireDefault(_classificationSet);

var _downloadResource = require('./download-resource');

var _downloadResource2 = _interopRequireDefault(_downloadResource);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class DownloadClassificationSets extends _downloadResource2.default {
  get resourceName() {
    return 'classification_sets';
  }

  get typeName() {
    return 'classification-set';
  }

  get propertyName() {
    return 'classificationSet';
  }

  fetchObjects(lastSync, sequence) {
    return _client2.default.getClassificationSets(this.account);
  }

  fetchLocalObjects() {
    return this.account.findClassificationSets();
  }

  findOrCreate(database, attributes) {
    return _classificationSet2.default.findOrCreate(database, { resource_id: attributes.id, account_id: this.account.rowID });
  }
}
exports.default = DownloadClassificationSets;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tYWluL3N5bmMvdGFza3MvZG93bmxvYWQtY2xhc3NpZmljYXRpb24tc2V0cy5qcyJdLCJuYW1lcyI6WyJEb3dubG9hZENsYXNzaWZpY2F0aW9uU2V0cyIsInJlc291cmNlTmFtZSIsInR5cGVOYW1lIiwicHJvcGVydHlOYW1lIiwiZmV0Y2hPYmplY3RzIiwibGFzdFN5bmMiLCJzZXF1ZW5jZSIsImdldENsYXNzaWZpY2F0aW9uU2V0cyIsImFjY291bnQiLCJmZXRjaExvY2FsT2JqZWN0cyIsImZpbmRDbGFzc2lmaWNhdGlvblNldHMiLCJmaW5kT3JDcmVhdGUiLCJkYXRhYmFzZSIsImF0dHJpYnV0ZXMiLCJyZXNvdXJjZV9pZCIsImlkIiwiYWNjb3VudF9pZCIsInJvd0lEIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVlLE1BQU1BLDBCQUFOLG9DQUEwRDtBQUN2RSxNQUFJQyxZQUFKLEdBQW1CO0FBQ2pCLFdBQU8scUJBQVA7QUFDRDs7QUFFRCxNQUFJQyxRQUFKLEdBQWU7QUFDYixXQUFPLG9CQUFQO0FBQ0Q7O0FBRUQsTUFBSUMsWUFBSixHQUFtQjtBQUNqQixXQUFPLG1CQUFQO0FBQ0Q7O0FBRURDLGVBQWFDLFFBQWIsRUFBdUJDLFFBQXZCLEVBQWlDO0FBQy9CLFdBQU8saUJBQU9DLHFCQUFQLENBQTZCLEtBQUtDLE9BQWxDLENBQVA7QUFDRDs7QUFFREMsc0JBQW9CO0FBQ2xCLFdBQU8sS0FBS0QsT0FBTCxDQUFhRSxzQkFBYixFQUFQO0FBQ0Q7O0FBRURDLGVBQWFDLFFBQWIsRUFBdUJDLFVBQXZCLEVBQW1DO0FBQ2pDLFdBQU8sNEJBQWtCRixZQUFsQixDQUErQkMsUUFBL0IsRUFBeUMsRUFBQ0UsYUFBYUQsV0FBV0UsRUFBekIsRUFBNkJDLFlBQVksS0FBS1IsT0FBTCxDQUFhUyxLQUF0RCxFQUF6QyxDQUFQO0FBQ0Q7QUF2QnNFO2tCQUFwRGpCLDBCIiwiZmlsZSI6ImRvd25sb2FkLWNsYXNzaWZpY2F0aW9uLXNldHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2xpZW50IGZyb20gJy4uLy4uL2FwaS9jbGllbnQnO1xuaW1wb3J0IENsYXNzaWZpY2F0aW9uU2V0IGZyb20gJy4uLy4uL21vZGVscy9jbGFzc2lmaWNhdGlvbi1zZXQnO1xuaW1wb3J0IERvd25sb2FkUmVzb3VyY2UgZnJvbSAnLi9kb3dubG9hZC1yZXNvdXJjZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERvd25sb2FkQ2xhc3NpZmljYXRpb25TZXRzIGV4dGVuZHMgRG93bmxvYWRSZXNvdXJjZSB7XG4gIGdldCByZXNvdXJjZU5hbWUoKSB7XG4gICAgcmV0dXJuICdjbGFzc2lmaWNhdGlvbl9zZXRzJztcbiAgfVxuXG4gIGdldCB0eXBlTmFtZSgpIHtcbiAgICByZXR1cm4gJ2NsYXNzaWZpY2F0aW9uLXNldCc7XG4gIH1cblxuICBnZXQgcHJvcGVydHlOYW1lKCkge1xuICAgIHJldHVybiAnY2xhc3NpZmljYXRpb25TZXQnO1xuICB9XG5cbiAgZmV0Y2hPYmplY3RzKGxhc3RTeW5jLCBzZXF1ZW5jZSkge1xuICAgIHJldHVybiBDbGllbnQuZ2V0Q2xhc3NpZmljYXRpb25TZXRzKHRoaXMuYWNjb3VudCk7XG4gIH1cblxuICBmZXRjaExvY2FsT2JqZWN0cygpIHtcbiAgICByZXR1cm4gdGhpcy5hY2NvdW50LmZpbmRDbGFzc2lmaWNhdGlvblNldHMoKTtcbiAgfVxuXG4gIGZpbmRPckNyZWF0ZShkYXRhYmFzZSwgYXR0cmlidXRlcykge1xuICAgIHJldHVybiBDbGFzc2lmaWNhdGlvblNldC5maW5kT3JDcmVhdGUoZGF0YWJhc2UsIHtyZXNvdXJjZV9pZDogYXR0cmlidXRlcy5pZCwgYWNjb3VudF9pZDogdGhpcy5hY2NvdW50LnJvd0lEfSk7XG4gIH1cbn1cbiJdfQ==