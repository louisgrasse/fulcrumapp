'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

require('colors');

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _account = require('../models/account');

var _account2 = _interopRequireDefault(_account);

var _client = require('../api/client');

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function prompt(questions) {
  return _inquirer2.default.prompt(questions);
}

const questions = [{
  type: 'input',
  name: 'email',
  message: 'Enter your Fulcrum email address'
}, {
  type: 'password',
  message: 'Enter your Fulcrum password',
  name: 'password'
}];

const againQuestion = {
  type: 'confirm',
  name: 'again',
  message: 'Try again? (just hit enter for YES)',
  'default': true
};

exports.default = class {
  constructor() {
    var _this = this;

    this.runCommand = _asyncToGenerator(function* () {
      let exit = false;

      while (!exit) {
        if (fulcrum.args.token) {
          yield _this.setupAccount({ token: fulcrum.args.token });
          return;
        }

        if (fulcrum.args.email && fulcrum.args.password) {
          yield _this.setupAccount({ email: fulcrum.args.email, password: fulcrum.args.password });
          return;
        }

        const answers = yield prompt(questions);

        const success = yield _this.setupAccount({ email: answers.email, password: answers.password });

        if (success) {
          exit = true;
        } else {
          let retry = yield prompt(againQuestion);

          if (!retry.again) {
            exit = true;
          }
        }
      }
    });

    this.setupAccount = (() => {
      var _ref2 = _asyncToGenerator(function* ({ email, password, token }) {
        const results = token ? yield _client2.default.authenticateWithToken(token) : yield _client2.default.authenticate(email, password);

        const response = results;
        const body = results.body;

        if (response.statusCode === 200) {
          const user = JSON.parse(body).user;

          fulcrum.logger.log(('Successfully authenticated with ' + user.email).green);

          const context = user.contexts.find(function (o) {
            return o.name === fulcrum.args.org;
          });

          if (!context) {
            fulcrum.logger.error(`Organization ${fulcrum.args.org} not found for this account.`.red);
            return false;
          }

          const isOwner = context.role.name === 'Owner' && context.role.is_system;

          if (!isOwner) {
            fulcrum.logger.error(`This account is not an owner of ${fulcrum.args.org}. You must be an account owner to use Fulcrum Desktop.`.red);
            return false;
          }

          const contextAttributes = {
            user_resource_id: user.id,
            organization_resource_id: context.id
          };

          const db = fulcrum.db;

          const account = yield _account2.default.findOrCreate(db, contextAttributes);

          account._organizationName = context.name;
          account._firstName = user.first_name;
          account._lastName = user.last_name;
          account._email = user.email;
          account._token = context.api_token;

          yield account.save();

          fulcrum.logger.log('✓'.green, context.name);

          return true;
        } else {
          fulcrum.logger.log('Username or password incorrect'.red);
        }

        return false;
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    })();
  }

  task(cli) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return cli.command({
        command: 'setup',
        desc: 'setup the local fulcrum database',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tYWluL2NvbW1hbmRzL3NldHVwLmpzIl0sIm5hbWVzIjpbInByb21wdCIsInF1ZXN0aW9ucyIsInR5cGUiLCJuYW1lIiwibWVzc2FnZSIsImFnYWluUXVlc3Rpb24iLCJydW5Db21tYW5kIiwiZXhpdCIsImZ1bGNydW0iLCJhcmdzIiwidG9rZW4iLCJzZXR1cEFjY291bnQiLCJlbWFpbCIsInBhc3N3b3JkIiwiYW5zd2VycyIsInN1Y2Nlc3MiLCJyZXRyeSIsImFnYWluIiwicmVzdWx0cyIsImF1dGhlbnRpY2F0ZVdpdGhUb2tlbiIsImF1dGhlbnRpY2F0ZSIsInJlc3BvbnNlIiwiYm9keSIsInN0YXR1c0NvZGUiLCJ1c2VyIiwiSlNPTiIsInBhcnNlIiwibG9nZ2VyIiwibG9nIiwiZ3JlZW4iLCJjb250ZXh0IiwiY29udGV4dHMiLCJmaW5kIiwibyIsIm9yZyIsImVycm9yIiwicmVkIiwiaXNPd25lciIsInJvbGUiLCJpc19zeXN0ZW0iLCJjb250ZXh0QXR0cmlidXRlcyIsInVzZXJfcmVzb3VyY2VfaWQiLCJpZCIsIm9yZ2FuaXphdGlvbl9yZXNvdXJjZV9pZCIsImRiIiwiYWNjb3VudCIsImZpbmRPckNyZWF0ZSIsIl9vcmdhbml6YXRpb25OYW1lIiwiX2ZpcnN0TmFtZSIsImZpcnN0X25hbWUiLCJfbGFzdE5hbWUiLCJsYXN0X25hbWUiLCJfZW1haWwiLCJfdG9rZW4iLCJhcGlfdG9rZW4iLCJzYXZlIiwidGFzayIsImNsaSIsImNvbW1hbmQiLCJkZXNjIiwiYnVpbGRlciIsInJlcXVpcmVkIiwiaGFuZGxlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7OztBQUVBLFNBQVNBLE1BQVQsQ0FBZ0JDLFNBQWhCLEVBQTJCO0FBQ3pCLFNBQU8sbUJBQVNELE1BQVQsQ0FBZ0JDLFNBQWhCLENBQVA7QUFDRDs7QUFFRCxNQUFNQSxZQUFZLENBQ2hCO0FBQ0VDLFFBQU0sT0FEUjtBQUVF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OiJzZXR1cC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnY29sb3JzJztcbmltcG9ydCBpbnF1aXJlciBmcm9tICdpbnF1aXJlcic7XG5pbXBvcnQgQWNjb3VudCBmcm9tICcuLi9tb2RlbHMvYWNjb3VudCc7XG5pbXBvcnQgQ2xpZW50IGZyb20gJy4uL2FwaS9jbGllbnQnO1xuXG5mdW5jdGlvbiBwcm9tcHQocXVlc3Rpb25zKSB7XG4gIHJldHVybiBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKTtcbn1cblxuY29uc3QgcXVlc3Rpb25zID0gW1xuICB7XG4gICAgdHlwZTogJ2lucHV0JyxcbiAgICBuYW1lOiAnZW1haWwnLFxuICAgIG1lc3NhZ2U6ICdFbnRlciB5b3VyIEZ1bGNydW0gZW1haWwgYWRkcmVzcydcbiAgfSwge1xuICAgIHR5cGU6ICdwYXNzd29yZCcsXG4gICAgbWVzc2FnZTogJ0VudGVyIHlvdXIgRnVsY3J1bSBwYXNzd29yZCcsXG4gICAgbmFtZTogJ3Bhc3N3b3JkJ1xuICB9XG5dO1xuXG5jb25zdCBhZ2FpblF1ZXN0aW9uID0ge1xuICB0eXBlOiAnY29uZmlybScsXG4gIG5hbWU6ICdhZ2FpbicsXG4gIG1lc3NhZ2U6ICdUcnkgYWdhaW4/IChqdXN0IGhpdCBlbnRlciBmb3IgWUVTKScsXG4gICdkZWZhdWx0JzogdHJ1ZVxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBhc3luYyB0YXNrKGNsaSkge1xuICAgIHJldHVybiBjbGkuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiAnc2V0dXAnLFxuICAgICAgZGVzYzogJ3NldHVwIHRoZSBsb2NhbCBmdWxjcnVtIGRhdGFiYXNlJyxcbiAgICAgIGJ1aWxkZXI6IHtcbiAgICAgICAgb3JnOiB7XG4gICAgICAgICAgZGVzYzogJ29yZ2FuaXphdGlvbiBuYW1lJyxcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaGFuZGxlcjogdGhpcy5ydW5Db21tYW5kXG4gICAgfSk7XG4gIH1cblxuICBydW5Db21tYW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCBleGl0ID0gZmFsc2U7XG5cbiAgICB3aGlsZSAoIWV4aXQpIHtcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MudG9rZW4pIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXR1cEFjY291bnQoe3Rva2VuOiBmdWxjcnVtLmFyZ3MudG9rZW59KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmVtYWlsICYmIGZ1bGNydW0uYXJncy5wYXNzd29yZCkge1xuICAgICAgICBhd2FpdCB0aGlzLnNldHVwQWNjb3VudCh7ZW1haWw6IGZ1bGNydW0uYXJncy5lbWFpbCwgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5wYXNzd29yZH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFuc3dlcnMgPSBhd2FpdCBwcm9tcHQocXVlc3Rpb25zKTtcblxuICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IHRoaXMuc2V0dXBBY2NvdW50KHtlbWFpbDogYW5zd2Vycy5lbWFpbCwgcGFzc3dvcmQ6IGFuc3dlcnMucGFzc3dvcmR9KTtcblxuICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgZXhpdCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmV0cnkgPSBhd2FpdCBwcm9tcHQoYWdhaW5RdWVzdGlvbik7XG5cbiAgICAgICAgaWYgKCFyZXRyeS5hZ2Fpbikge1xuICAgICAgICAgIGV4aXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2V0dXBBY2NvdW50ID0gYXN5bmMgKHtlbWFpbCwgcGFzc3dvcmQsIHRva2VufSkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdHMgPSB0b2tlbiA/IGF3YWl0IENsaWVudC5hdXRoZW50aWNhdGVXaXRoVG9rZW4odG9rZW4pXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDogYXdhaXQgQ2xpZW50LmF1dGhlbnRpY2F0ZShlbWFpbCwgcGFzc3dvcmQpO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSByZXN1bHRzO1xuICAgIGNvbnN0IGJvZHkgPSByZXN1bHRzLmJvZHk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG4gICAgICBjb25zdCB1c2VyID0gSlNPTi5wYXJzZShib2R5KS51c2VyO1xuXG4gICAgICBmdWxjcnVtLmxvZ2dlci5sb2coKCdTdWNjZXNzZnVsbHkgYXV0aGVudGljYXRlZCB3aXRoICcgKyB1c2VyLmVtYWlsKS5ncmVlbik7XG5cbiAgICAgIGNvbnN0IGNvbnRleHQgPSB1c2VyLmNvbnRleHRzLmZpbmQobyA9PiBvLm5hbWUgPT09IGZ1bGNydW0uYXJncy5vcmcpO1xuXG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgZnVsY3J1bS5sb2dnZXIuZXJyb3IoYE9yZ2FuaXphdGlvbiAkeyBmdWxjcnVtLmFyZ3Mub3JnIH0gbm90IGZvdW5kIGZvciB0aGlzIGFjY291bnQuYC5yZWQpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzT3duZXIgPSBjb250ZXh0LnJvbGUubmFtZSA9PT0gJ093bmVyJyAmJiBjb250ZXh0LnJvbGUuaXNfc3lzdGVtO1xuXG4gICAgICBpZiAoIWlzT3duZXIpIHtcbiAgICAgICAgZnVsY3J1bS5sb2dnZXIuZXJyb3IoYFRoaXMgYWNjb3VudCBpcyBub3QgYW4gb3duZXIgb2YgJHsgZnVsY3J1bS5hcmdzLm9yZyB9LiBZb3UgbXVzdCBiZSBhbiBhY2NvdW50IG93bmVyIHRvIHVzZSBGdWxjcnVtIERlc2t0b3AuYC5yZWQpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbnRleHRBdHRyaWJ1dGVzID0ge1xuICAgICAgICB1c2VyX3Jlc291cmNlX2lkOiB1c2VyLmlkLFxuICAgICAgICBvcmdhbml6YXRpb25fcmVzb3VyY2VfaWQ6IGNvbnRleHQuaWRcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGRiID0gZnVsY3J1bS5kYjtcblxuICAgICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IEFjY291bnQuZmluZE9yQ3JlYXRlKGRiLCBjb250ZXh0QXR0cmlidXRlcyk7XG5cbiAgICAgIGFjY291bnQuX29yZ2FuaXphdGlvbk5hbWUgPSBjb250ZXh0Lm5hbWU7XG4gICAgICBhY2NvdW50Ll9maXJzdE5hbWUgPSB1c2VyLmZpcnN0X25hbWU7XG4gICAgICBhY2NvdW50Ll9sYXN0TmFtZSA9IHVzZXIubGFzdF9uYW1lO1xuICAgICAgYWNjb3VudC5fZW1haWwgPSB1c2VyLmVtYWlsO1xuICAgICAgYWNjb3VudC5fdG9rZW4gPSBjb250ZXh0LmFwaV90b2tlbjtcblxuICAgICAgYXdhaXQgYWNjb3VudC5zYXZlKCk7XG5cbiAgICAgIGZ1bGNydW0ubG9nZ2VyLmxvZygn4pyTJy5ncmVlbiwgY29udGV4dC5uYW1lKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGNydW0ubG9nZ2VyLmxvZygnVXNlcm5hbWUgb3IgcGFzc3dvcmQgaW5jb3JyZWN0Jy5yZWQpO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19