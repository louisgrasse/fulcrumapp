'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _progress = require('progress');

var _progress2 = _interopRequireDefault(_progress);

var _util = require('util');

var _app = require('../../app');

var _app2 = _interopRequireDefault(_app);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

class Task {
  constructor({ synchronizer, syncState }) {
    this._synchronizer = synchronizer;
    this._syncState = syncState;

    this._isSimpleShell = _app2.default.args.simpleOutput || process.platform === 'win32';
    this._noProgress = _app2.default.args.progress === false || !process.stdout.isTTY;
  }

  get synchronizer() {
    return this._synchronizer;
  }

  getSyncState(resource, scope = null) {
    return this._syncState.find(object => {
      return object.resource === resource && (object.scope == null && scope === '' || object.scope === scope);
    });
  }

  checkSyncState() {
    var _this = this;

    return _asyncToGenerator(function* () {
      const scope = _this.syncResourceScope || '';
      const resource = _this.syncResourceName;

      const oldState = yield _this.account.findSyncState({ resource, scope });
      const newState = _this.getSyncState(resource, scope || '');

      let needsUpdate = true;

      if (oldState && newState && oldState.hash === newState.hash) {
        needsUpdate = false;
      }

      const update = (() => {
        var _ref = _asyncToGenerator(function* () {
          if (oldState && newState) {
            oldState.hash = newState.hash;
            oldState.scope = oldState.scope || '';

            yield oldState.save();
          }
        });

        return function update() {
          return _ref.apply(this, arguments);
        };
      })();

      return { needsUpdate, state: oldState, update };
    })();
  }

  execute({ account, dataSource }) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      _this2.account = account;
      _this2.db = account.db;

      const syncName = _this2.syncResourceName;

      if (syncName) {
        yield _this2.trigger(`${syncName}:start`, { task: _this2 });
      }

      const result = yield _this2.run({ account, dataSource });

      if (_this2.bar) {
        console.log('');
      }

      if (syncName) {
        yield _this2.trigger(`${syncName}:finish`, { task: _this2 });
      }

      return result;
    })();
  }

  trigger(name, args) {
    return _app2.default.emit(name, _extends({ account: this.account }, args));
  }

  get downloading() {
    return this._isSimpleShell ? '[downloading]' : '😀 ';
  }

  get processing() {
    return this._isSimpleShell ? '[processing]' : '🤔 ';
  }

  get finished() {
    return this._isSimpleShell ? '[finished]' : '😎 ';
  }

  progress({ message, count, total }) {
    if (this._noProgress) {
      if (message !== this._lastMessage) {
        fulcrum.logger.log(message);
        this._lastMessage = message;
      }

      return;
    }

    let fmt = '';

    if (total === -1) {
      fmt = (0, _util.format)('%s (:current) :elapsed', message.green);
    } else if (count != null) {
      fmt = (0, _util.format)('%s :bar :percent (:current/:total) :etas :elapsed', message.green);
    } else {
      fmt = (0, _util.format)('%s', message.green);
    }
    // const fmt = count != null ? format('%s :bar :percent (:current/:total) :etas :elapsed', message.green)
    //                           : format('%s', message.green);

    if (!this.bar) {
      const options = {
        width: 40,
        total: total || 1,
        complete: '▇'.green,
        incomplete: '-',
        clear: false
      };

      this.bar = new _progress2.default(fmt, options);
      this.bar.tick(0);
    }

    this.bar.fmt = fmt;

    if (total != null) {
      this.bar.total = total || 1;
    }

    if (this._message !== message) {
      this.bar.curr = 0;
      this.bar.render();
      this._message = message;
    }

    if (count != null) {
      this.bar.curr = count;
      this.bar.render();
    }
  }

  markDeletedObjects(localObjects, newObjects, typeName, propName) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // delete all objects that don't exist on the server anymore
      for (const object of localObjects) {
        let objectExistsOnServer = false;

        for (const attributes of newObjects) {
          if (attributes.id === object.id) {
            objectExistsOnServer = true;
            break;
          }
        }

        if (!objectExistsOnServer) {
          const isChanged = object._deletedAt == null;

          object._deletedAt = object._deletedAt ? object._deletedAt : new Date();

          yield object.save();

          if (isChanged) {
            yield _this3.trigger(`${typeName}:delete`, { [propName || typeName]: object });
          }
        }
      }
    })();
  }

  lookup(record, resourceID, propName, getter) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (resourceID) {
        const object = yield new Promise(function (resolve) {
          _this4.dataSource[getter](resourceID, function (err, object) {
            return resolve(object);
          });
        });

        if (object) {
          record[propName] = object.rowID;
        }
      }
    })();
  }
}
exports.default = Task;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tYWluL3N5bmMvdGFza3MvdGFzay5qcyJdLCJuYW1lcyI6WyJUYXNrIiwiY29uc3RydWN0b3IiLCJzeW5jaHJvbml6ZXIiLCJzeW5jU3RhdGUiLCJfc3luY2hyb25pemVyIiwiX3N5bmNTdGF0ZSIsIl9pc1NpbXBsZVNoZWxsIiwiYXJncyIsInNpbXBsZU91dHB1dCIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsIl9ub1Byb2dyZXNzIiwicHJvZ3Jlc3MiLCJzdGRvdXQiLCJpc1RUWSIsImdldFN5bmNTdGF0ZSIsInJlc291cmNlIiwic2NvcGUiLCJmaW5kIiwib2JqZWN0IiwiY2hlY2tTeW5jU3RhdGUiLCJzeW5jUmVzb3VyY2VTY29wZSIsInN5bmNSZXNvdXJjZU5hbWUiLCJvbGRTdGF0ZSIsImFjY291bnQiLCJmaW5kU3luY1N0YXRlIiwibmV3U3RhdGUiLCJuZWVkc1VwZGF0ZSIsImhhc2giLCJ1cGRhdGUiLCJzYXZlIiwic3RhdGUiLCJleGVjdXRlIiwiZGF0YVNvdXJjZSIsImRiIiwic3luY05hbWUiLCJ0cmlnZ2VyIiwidGFzayIsInJlc3VsdCIsInJ1biIsImJhciIsImNvbnNvbGUiLCJsb2ciLCJuYW1lIiwiZW1pdCIsImRvd25sb2FkaW5nIiwicHJvY2Vzc2luZyIsImZpbmlzaGVkIiwibWVzc2FnZSIsImNvdW50IiwidG90YWwiLCJfbGFzdE1lc3NhZ2UiLCJmdWxjcnVtIiwibG9nZ2VyIiwiZm10IiwiZ3JlZW4iLCJvcHRpb25zIiwid2lkdGgiLCJjb21wbGV0ZSIsImluY29tcGxldGUiLCJjbGVhciIsInRpY2siLCJfbWVzc2FnZSIsImN1cnIiLCJyZW5kZXIiLCJtYXJrRGVsZXRlZE9iamVjdHMiLCJsb2NhbE9iamVjdHMiLCJuZXdPYmplY3RzIiwidHlwZU5hbWUiLCJwcm9wTmFtZSIsIm9iamVjdEV4aXN0c09uU2VydmVyIiwiYXR0cmlidXRlcyIsImlkIiwiaXNDaGFuZ2VkIiwiX2RlbGV0ZWRBdCIsIkRhdGUiLCJsb29rdXAiLCJyZWNvcmQiLCJyZXNvdXJjZUlEIiwiZ2V0dGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJlcnIiLCJyb3dJRCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOztBQUNBOzs7Ozs7OztBQUVlLE1BQU1BLElBQU4sQ0FBVztBQUN4QkMsY0FBWSxFQUFDQyxZQUFELEVBQWVDLFNBQWYsRUFBWixFQUF1QztBQUNyQyxTQUFLQyxhQUFMLEdBQXFCRixZQUFyQjtBQUNBLFNBQUtHLFVBQUwsR0FBa0JGLFNBQWxCOztBQUVBLFNBQUtHLGNBQUwsR0FBc0IsY0FBSUMsSUFBSixDQUFTQyxZQUFULElBQXlCQyxRQUFRQyxRQUFSLEtBQXFCLE9BQXBFO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixjQUFJSixJQUFKLENBQVNLLFFBQVQsS0FBc0IsS0FBdEIsSUFBK0IsQ0FBQ0gsUUFBUUksTUFBUixDQUFlQyxLQUFsRTtBQUNEOztBQUVELE1BQUlaLFlBQUosR0FBbUI7QUFDakIsV0FBTyxLQUFLRSxhQUFaO0FBQ0Q7O0FBRURXLGVBQWFDLFFBQWIsRUFBdUJDLFFBQVEsSUFBL0IsRUFBcUM7QUFDbkMsV0FBTyxLQUFLWixVQUFMLENBQWdCYSxJQUFoQixDQUFzQkMsTUFBRCxJQUFZO0FBQ3RDLGFBQU9BLE9BQU9ILFFBQVAsS0FBb0JBLFFBQXBCLEtBQWtDRyxPQUFPRixLQUFQLElBQWdCLElBQWhCLElBQXdCQSxVQUFVLEVBQW5DLElBQTBDRSxPQUFPRixLQUFQLEtBQWlCQSxLQUE1RixDQUFQO0FBQ0QsS0FGTSxDQUFQO0FBR0Q7O0FBRUtHLGdCQUFOLEdBQXVCO0FBQUE7O0FBQUE7QUFDckIsWUFBTUgsUUFBUSxNQUFLSSxpQkFBTCxJQUEwQixFQUF4QztBQUNBLFlBQU1MLFdBQVcsTUFBS00sZ0JBQXRCOztBQUVBLFlBQU1DLFdBQVcsTUFBTSxNQUFLQyxPQUFMLENBQWFDLGFBQWIsQ0FBMkIsRUFBQ1QsUUFBRCxFQUFXQyxLQUFYLEVBQTNCLENBQXZCO0FBQ0EsWUFBTVMsV0FBVyxNQUFLWCxZQUFMLENBQWtCQyxRQUFsQixFQUE0QkMsU0FBUyxFQUFyQyxDQUFqQjs7QUFFQSxVQUFJVSxjQUFjLElBQWxCOztBQUVBLFVBQUlKLFlBQVlHLFFBQVosSUFBd0JILFNBQVNLLElBQVQsS0FBa0JGLFNBQVNFLElBQXZELEVBQTZEO0FBQzNERCxzQkFBYyxLQUFkO0FBQ0Q7O0FBRUQsWUFBTUU7QUFBQSxxQ0FBUyxhQUFZO0FBQ3pCLGNBQUlOLFlBQVlHLFFBQWhCLEVBQTBCO0FBQ3hCSCxxQkFBU0ssSUFBVCxHQUFnQkYsU0FBU0UsSUFBekI7QUFDQUwscUJBQVNOLEtBQVQsR0FBaUJNLFNBQVNOLEtBQVQsSUFBa0IsRUFBbkM7O0FBRUEsa0JBQU1NLFNBQVNPLElBQVQsRUFBTjtBQUNEO0FBQ0YsU0FQSzs7QUFBQTtBQUFBO0FBQUE7QUFBQSxVQUFOOztBQVNBLGFBQU8sRUFBRUgsV0FBRixFQUFlSSxPQUFPUixRQUF0QixFQUFnQ00sTUFBaEMsRUFBUDtBQXRCcUI7QUF1QnRCOztBQUVLRyxTQUFOLENBQWMsRUFBQ1IsT0FBRCxFQUFVUyxVQUFWLEVBQWQsRUFBcUM7QUFBQTs7QUFBQTtBQUNuQyxhQUFLVCxPQUFMLEdBQWVBLE9BQWY7QUFDQSxhQUFLVSxFQUFMLEdBQVVWLFFBQVFVLEVBQWxCOztBQUVBLFlBQU1DLFdBQVcsT0FBS2IsZ0JBQXRCOztBQUVBLFVBQUlhLFFBQUosRUFBYztBQUNaLGNBQU0sT0FBS0MsT0FBTCxDQUFjLEdBQUVELFFBQVMsUUFBekIsRUFBa0MsRUFBQ0UsWUFBRCxFQUFsQyxDQUFOO0FBQ0Q7O0FBRUQsWUFBTUMsU0FBUyxNQUFNLE9BQUtDLEdBQUwsQ0FBUyxFQUFDZixPQUFELEVBQVVTLFVBQVYsRUFBVCxDQUFyQjs7QUFFQSxVQUFJLE9BQUtPLEdBQVQsRUFBYztBQUNaQyxnQkFBUUMsR0FBUixDQUFZLEVBQVo7QUFDRDs7QUFFRCxVQUFJUCxRQUFKLEVBQWM7QUFDWixjQUFNLE9BQUtDLE9BQUwsQ0FBYyxHQUFFRCxRQUFTLFNBQXpCLEVBQW1DLEVBQUNFLFlBQUQsRUFBbkMsQ0FBTjtBQUNEOztBQUVELGFBQU9DLE1BQVA7QUFwQm1DO0FBcUJwQzs7QUFFREYsVUFBUU8sSUFBUixFQUFjcEMsSUFBZCxFQUFvQjtBQUNsQixXQUFPLGNBQUlxQyxJQUFKLENBQVNELElBQVQsYUFBZ0JuQixTQUFTLEtBQUtBLE9BQTlCLElBQTBDakIsSUFBMUMsRUFBUDtBQUNEOztBQUVELE1BQUlzQyxXQUFKLEdBQWtCO0FBQ2hCLFdBQU8sS0FBS3ZDLGNBQUwsR0FBc0IsZUFBdEIsR0FBd0MsS0FBL0M7QUFDRDs7QUFFRCxNQUFJd0MsVUFBSixHQUFpQjtBQUNmLFdBQU8sS0FBS3hDLGNBQUwsR0FBc0IsY0FBdEIsR0FBdUMsS0FBOUM7QUFDRDs7QUFFRCxNQUFJeUMsUUFBSixHQUFlO0FBQ2IsV0FBTyxLQUFLekMsY0FBTCxHQUFzQixZQUF0QixHQUFxQyxLQUE1QztBQUNEOztBQUVETSxXQUFTLEVBQUNvQyxPQUFELEVBQVVDLEtBQVYsRUFBaUJDLEtBQWpCLEVBQVQsRUFBa0M7QUFDaEMsUUFBSSxLQUFLdkMsV0FBVCxFQUFzQjtBQUNwQixVQUFJcUMsWUFBWSxLQUFLRyxZQUFyQixFQUFtQztBQUNqQ0MsZ0JBQVFDLE1BQVIsQ0FBZVgsR0FBZixDQUFtQk0sT0FBbkI7QUFDQSxhQUFLRyxZQUFMLEdBQW9CSCxPQUFwQjtBQUNEOztBQUVEO0FBQ0Q7O0FBRUQsUUFBSU0sTUFBTSxFQUFWOztBQUVBLFFBQUlKLFVBQVUsQ0FBQyxDQUFmLEVBQWtCO0FBQ2hCSSxZQUFNLGtCQUFPLHdCQUFQLEVBQWlDTixRQUFRTyxLQUF6QyxDQUFOO0FBQ0QsS0FGRCxNQUVPLElBQUlOLFNBQVMsSUFBYixFQUFtQjtBQUN4QkssWUFBTSxrQkFBTyxtREFBUCxFQUE0RE4sUUFBUU8sS0FBcEUsQ0FBTjtBQUNELEtBRk0sTUFFQTtBQUNMRCxZQUFNLGtCQUFPLElBQVAsRUFBYU4sUUFBUU8sS0FBckIsQ0FBTjtBQUNEO0FBQ0Q7QUFDQTs7QUFFQSxRQUFJLENBQUMsS0FBS2YsR0FBVixFQUFlO0FBQ2IsWUFBTWdCLFVBQVU7QUFDZEMsZUFBTyxFQURPO0FBRWRQLGVBQU9BLFNBQVMsQ0FGRjtBQUdkUSxrQkFBVSxJQUFJSCxLQUhBO0FBSWRJLG9CQUFZLEdBSkU7QUFLZEMsZUFBTztBQUxPLE9BQWhCOztBQVFBLFdBQUtwQixHQUFMLEdBQVcsdUJBQWdCYyxHQUFoQixFQUFxQkUsT0FBckIsQ0FBWDtBQUNBLFdBQUtoQixHQUFMLENBQVNxQixJQUFULENBQWMsQ0FBZDtBQUNEOztBQUVELFNBQUtyQixHQUFMLENBQVNjLEdBQVQsR0FBZUEsR0FBZjs7QUFFQSxRQUFJSixTQUFTLElBQWIsRUFBbUI7QUFDakIsV0FBS1YsR0FBTCxDQUFTVSxLQUFULEdBQWlCQSxTQUFTLENBQTFCO0FBQ0Q7O0FBRUQsUUFBSSxLQUFLWSxRQUFMLEtBQWtCZCxPQUF0QixFQUErQjtBQUM3QixXQUFLUixHQUFMLENBQVN1QixJQUFULEdBQWdCLENBQWhCO0FBQ0EsV0FBS3ZCLEdBQUwsQ0FBU3dCLE1BQVQ7QUFDQSxXQUFLRixRQUFMLEdBQWdCZCxPQUFoQjtBQUNEOztBQUVELFFBQUlDLFNBQVMsSUFBYixFQUFtQjtBQUNqQixXQUFLVCxHQUFMLENBQVN1QixJQUFULEdBQWdCZCxLQUFoQjtBQUNBLFdBQUtULEdBQUwsQ0FBU3dCLE1BQVQ7QUFDRDtBQUNGOztBQUVLQyxvQkFBTixDQUF5QkMsWUFBekIsRUFBdUNDLFVBQXZDLEVBQW1EQyxRQUFuRCxFQUE2REMsUUFBN0QsRUFBdUU7QUFBQTs7QUFBQTtBQUNyRTtBQUNBLFdBQUssTUFBTWxELE1BQVgsSUFBcUIrQyxZQUFyQixFQUFtQztBQUNqQyxZQUFJSSx1QkFBdUIsS0FBM0I7O0FBRUEsYUFBSyxNQUFNQyxVQUFYLElBQXlCSixVQUF6QixFQUFxQztBQUNuQyxjQUFJSSxXQUFXQyxFQUFYLEtBQWtCckQsT0FBT3FELEVBQTdCLEVBQWlDO0FBQy9CRixtQ0FBdUIsSUFBdkI7QUFDQTtBQUNEO0FBQ0Y7O0FBRUQsWUFBSSxDQUFDQSxvQkFBTCxFQUEyQjtBQUN6QixnQkFBTUcsWUFBWXRELE9BQU91RCxVQUFQLElBQXFCLElBQXZDOztBQUVBdkQsaUJBQU91RCxVQUFQLEdBQW9CdkQsT0FBT3VELFVBQVAsR0FBb0J2RCxPQUFPdUQsVUFBM0IsR0FBd0MsSUFBSUMsSUFBSixFQUE1RDs7QUFFQSxnQkFBTXhELE9BQU9XLElBQVAsRUFBTjs7QUFFQSxjQUFJMkMsU0FBSixFQUFlO0FBQ2Isa0JBQU0sT0FBS3JDLE9BQUwsQ0FBYyxHQUFHZ0MsUUFBVSxTQUEzQixFQUFxQyxFQUFDLENBQUNDLFlBQVlELFFBQWIsR0FBd0JqRCxNQUF6QixFQUFyQyxDQUFOO0FBQ0Q7QUFDRjtBQUNGO0FBdkJvRTtBQXdCdEU7O0FBRUt5RCxRQUFOLENBQWFDLE1BQWIsRUFBcUJDLFVBQXJCLEVBQWlDVCxRQUFqQyxFQUEyQ1UsTUFBM0MsRUFBbUQ7QUFBQTs7QUFBQTtBQUNqRCxVQUFJRCxVQUFKLEVBQWdCO0FBQ2QsY0FBTTNELFNBQVMsTUFBTSxJQUFJNkQsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBYTtBQUM1QyxpQkFBS2hELFVBQUwsQ0FBZ0I4QyxNQUFoQixFQUF3QkQsVUFBeEIsRUFBb0MsVUFBQ0ksR0FBRCxFQUFNL0QsTUFBTjtBQUFBLG1CQUFpQjhELFFBQVE5RCxNQUFSLENBQWpCO0FBQUEsV0FBcEM7QUFDRCxTQUZvQixDQUFyQjs7QUFJQSxZQUFJQSxNQUFKLEVBQVk7QUFDVjBELGlCQUFPUixRQUFQLElBQW1CbEQsT0FBT2dFLEtBQTFCO0FBQ0Q7QUFDRjtBQVRnRDtBQVVsRDtBQTVLdUI7a0JBQUxuRixJIiwiZmlsZSI6InRhc2suanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUHJvZ3Jlc3NCYXIgZnJvbSAncHJvZ3Jlc3MnO1xuaW1wb3J0IHtmb3JtYXR9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IGFwcCBmcm9tICcuLi8uLi9hcHAnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYXNrIHtcbiAgY29uc3RydWN0b3Ioe3N5bmNocm9uaXplciwgc3luY1N0YXRlfSkge1xuICAgIHRoaXMuX3N5bmNocm9uaXplciA9IHN5bmNocm9uaXplcjtcbiAgICB0aGlzLl9zeW5jU3RhdGUgPSBzeW5jU3RhdGU7XG5cbiAgICB0aGlzLl9pc1NpbXBsZVNoZWxsID0gYXBwLmFyZ3Muc2ltcGxlT3V0cHV0IHx8IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG4gICAgdGhpcy5fbm9Qcm9ncmVzcyA9IGFwcC5hcmdzLnByb2dyZXNzID09PSBmYWxzZSB8fCAhcHJvY2Vzcy5zdGRvdXQuaXNUVFk7XG4gIH1cblxuICBnZXQgc3luY2hyb25pemVyKCkge1xuICAgIHJldHVybiB0aGlzLl9zeW5jaHJvbml6ZXI7XG4gIH1cblxuICBnZXRTeW5jU3RhdGUocmVzb3VyY2UsIHNjb3BlID0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLl9zeW5jU3RhdGUuZmluZCgob2JqZWN0KSA9PiB7XG4gICAgICByZXR1cm4gb2JqZWN0LnJlc291cmNlID09PSByZXNvdXJjZSAmJiAoKG9iamVjdC5zY29wZSA9PSBudWxsICYmIHNjb3BlID09PSAnJykgfHwgb2JqZWN0LnNjb3BlID09PSBzY29wZSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBjaGVja1N5bmNTdGF0ZSgpIHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc3luY1Jlc291cmNlU2NvcGUgfHwgJyc7XG4gICAgY29uc3QgcmVzb3VyY2UgPSB0aGlzLnN5bmNSZXNvdXJjZU5hbWU7XG5cbiAgICBjb25zdCBvbGRTdGF0ZSA9IGF3YWl0IHRoaXMuYWNjb3VudC5maW5kU3luY1N0YXRlKHtyZXNvdXJjZSwgc2NvcGV9KTtcbiAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuZ2V0U3luY1N0YXRlKHJlc291cmNlLCBzY29wZSB8fCAnJyk7XG5cbiAgICBsZXQgbmVlZHNVcGRhdGUgPSB0cnVlO1xuXG4gICAgaWYgKG9sZFN0YXRlICYmIG5ld1N0YXRlICYmIG9sZFN0YXRlLmhhc2ggPT09IG5ld1N0YXRlLmhhc2gpIHtcbiAgICAgIG5lZWRzVXBkYXRlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgdXBkYXRlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKG9sZFN0YXRlICYmIG5ld1N0YXRlKSB7XG4gICAgICAgIG9sZFN0YXRlLmhhc2ggPSBuZXdTdGF0ZS5oYXNoO1xuICAgICAgICBvbGRTdGF0ZS5zY29wZSA9IG9sZFN0YXRlLnNjb3BlIHx8ICcnO1xuXG4gICAgICAgIGF3YWl0IG9sZFN0YXRlLnNhdmUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHsgbmVlZHNVcGRhdGUsIHN0YXRlOiBvbGRTdGF0ZSwgdXBkYXRlIH07XG4gIH1cblxuICBhc3luYyBleGVjdXRlKHthY2NvdW50LCBkYXRhU291cmNlfSkge1xuICAgIHRoaXMuYWNjb3VudCA9IGFjY291bnQ7XG4gICAgdGhpcy5kYiA9IGFjY291bnQuZGI7XG5cbiAgICBjb25zdCBzeW5jTmFtZSA9IHRoaXMuc3luY1Jlc291cmNlTmFtZTtcblxuICAgIGlmIChzeW5jTmFtZSkge1xuICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyKGAke3N5bmNOYW1lfTpzdGFydGAsIHt0YXNrOiB0aGlzfSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5ydW4oe2FjY291bnQsIGRhdGFTb3VyY2V9KTtcblxuICAgIGlmICh0aGlzLmJhcikge1xuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgIH1cblxuICAgIGlmIChzeW5jTmFtZSkge1xuICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyKGAke3N5bmNOYW1lfTpmaW5pc2hgLCB7dGFzazogdGhpc30pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICB0cmlnZ2VyKG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gYXBwLmVtaXQobmFtZSwge2FjY291bnQ6IHRoaXMuYWNjb3VudCwgLi4uYXJnc30pO1xuICB9XG5cbiAgZ2V0IGRvd25sb2FkaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl9pc1NpbXBsZVNoZWxsID8gJ1tkb3dubG9hZGluZ10nIDogJ/CfmIAgJztcbiAgfVxuXG4gIGdldCBwcm9jZXNzaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl9pc1NpbXBsZVNoZWxsID8gJ1twcm9jZXNzaW5nXScgOiAn8J+klCAnO1xuICB9XG5cbiAgZ2V0IGZpbmlzaGVkKCkge1xuICAgIHJldHVybiB0aGlzLl9pc1NpbXBsZVNoZWxsID8gJ1tmaW5pc2hlZF0nIDogJ/CfmI4gJztcbiAgfVxuXG4gIHByb2dyZXNzKHttZXNzYWdlLCBjb3VudCwgdG90YWx9KSB7XG4gICAgaWYgKHRoaXMuX25vUHJvZ3Jlc3MpIHtcbiAgICAgIGlmIChtZXNzYWdlICE9PSB0aGlzLl9sYXN0TWVzc2FnZSkge1xuICAgICAgICBmdWxjcnVtLmxvZ2dlci5sb2cobWVzc2FnZSk7XG4gICAgICAgIHRoaXMuX2xhc3RNZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBmbXQgPSAnJztcblxuICAgIGlmICh0b3RhbCA9PT0gLTEpIHtcbiAgICAgIGZtdCA9IGZvcm1hdCgnJXMgKDpjdXJyZW50KSA6ZWxhcHNlZCcsIG1lc3NhZ2UuZ3JlZW4pO1xuICAgIH0gZWxzZSBpZiAoY291bnQgIT0gbnVsbCkge1xuICAgICAgZm10ID0gZm9ybWF0KCclcyA6YmFyIDpwZXJjZW50ICg6Y3VycmVudC86dG90YWwpIDpldGFzIDplbGFwc2VkJywgbWVzc2FnZS5ncmVlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZtdCA9IGZvcm1hdCgnJXMnLCBtZXNzYWdlLmdyZWVuKTtcbiAgICB9XG4gICAgLy8gY29uc3QgZm10ID0gY291bnQgIT0gbnVsbCA/IGZvcm1hdCgnJXMgOmJhciA6cGVyY2VudCAoOmN1cnJlbnQvOnRvdGFsKSA6ZXRhcyA6ZWxhcHNlZCcsIG1lc3NhZ2UuZ3JlZW4pXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICA6IGZvcm1hdCgnJXMnLCBtZXNzYWdlLmdyZWVuKTtcblxuICAgIGlmICghdGhpcy5iYXIpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIHdpZHRoOiA0MCxcbiAgICAgICAgdG90YWw6IHRvdGFsIHx8IDEsXG4gICAgICAgIGNvbXBsZXRlOiAn4paHJy5ncmVlbixcbiAgICAgICAgaW5jb21wbGV0ZTogJy0nLFxuICAgICAgICBjbGVhcjogZmFsc2VcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuYmFyID0gbmV3IFByb2dyZXNzQmFyKGZtdCwgb3B0aW9ucyk7XG4gICAgICB0aGlzLmJhci50aWNrKDApO1xuICAgIH1cblxuICAgIHRoaXMuYmFyLmZtdCA9IGZtdDtcblxuICAgIGlmICh0b3RhbCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmJhci50b3RhbCA9IHRvdGFsIHx8IDE7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX21lc3NhZ2UgIT09IG1lc3NhZ2UpIHtcbiAgICAgIHRoaXMuYmFyLmN1cnIgPSAwO1xuICAgICAgdGhpcy5iYXIucmVuZGVyKCk7XG4gICAgICB0aGlzLl9tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB9XG5cbiAgICBpZiAoY291bnQgIT0gbnVsbCkge1xuICAgICAgdGhpcy5iYXIuY3VyciA9IGNvdW50O1xuICAgICAgdGhpcy5iYXIucmVuZGVyKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbWFya0RlbGV0ZWRPYmplY3RzKGxvY2FsT2JqZWN0cywgbmV3T2JqZWN0cywgdHlwZU5hbWUsIHByb3BOYW1lKSB7XG4gICAgLy8gZGVsZXRlIGFsbCBvYmplY3RzIHRoYXQgZG9uJ3QgZXhpc3Qgb24gdGhlIHNlcnZlciBhbnltb3JlXG4gICAgZm9yIChjb25zdCBvYmplY3Qgb2YgbG9jYWxPYmplY3RzKSB7XG4gICAgICBsZXQgb2JqZWN0RXhpc3RzT25TZXJ2ZXIgPSBmYWxzZTtcblxuICAgICAgZm9yIChjb25zdCBhdHRyaWJ1dGVzIG9mIG5ld09iamVjdHMpIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMuaWQgPT09IG9iamVjdC5pZCkge1xuICAgICAgICAgIG9iamVjdEV4aXN0c09uU2VydmVyID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIW9iamVjdEV4aXN0c09uU2VydmVyKSB7XG4gICAgICAgIGNvbnN0IGlzQ2hhbmdlZCA9IG9iamVjdC5fZGVsZXRlZEF0ID09IG51bGw7XG5cbiAgICAgICAgb2JqZWN0Ll9kZWxldGVkQXQgPSBvYmplY3QuX2RlbGV0ZWRBdCA/IG9iamVjdC5fZGVsZXRlZEF0IDogbmV3IERhdGUoKTtcblxuICAgICAgICBhd2FpdCBvYmplY3Quc2F2ZSgpO1xuXG4gICAgICAgIGlmIChpc0NoYW5nZWQpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXIoYCR7IHR5cGVOYW1lIH06ZGVsZXRlYCwge1twcm9wTmFtZSB8fCB0eXBlTmFtZV06IG9iamVjdH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbG9va3VwKHJlY29yZCwgcmVzb3VyY2VJRCwgcHJvcE5hbWUsIGdldHRlcikge1xuICAgIGlmIChyZXNvdXJjZUlEKSB7XG4gICAgICBjb25zdCBvYmplY3QgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICB0aGlzLmRhdGFTb3VyY2VbZ2V0dGVyXShyZXNvdXJjZUlELCAoZXJyLCBvYmplY3QpID0+IHJlc29sdmUob2JqZWN0KSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKG9iamVjdCkge1xuICAgICAgICByZWNvcmRbcHJvcE5hbWVdID0gb2JqZWN0LnJvd0lEO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19