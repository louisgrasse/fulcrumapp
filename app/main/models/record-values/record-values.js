'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require('util');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _fulcrumCore = require('fulcrum-core');

var _pgFormat = require('pg-format');

var _pgFormat2 = _interopRequireDefault(_pgFormat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class RecordValues {
  static updateForRecordStatements(db, record, options = {}) {
    const statements = [];

    statements.push.apply(statements, this.deleteForRecordStatements(db, record, record.form, options));
    statements.push.apply(statements, this.insertForRecordStatements(db, record, record.form, options));

    return statements;
  }

  static insertForRecordStatements(db, record, form, options = {}) {
    const statements = [];

    statements.push(this.insertRowForFeatureStatement(db, form, record, null, record, options));
    statements.push.apply(statements, this.insertChildFeaturesForFeatureStatements(db, form, record, record, options));
    statements.push.apply(statements, this.insertMultipleValuesForFeatureStatements(db, form, record, record, options));
    statements.push.apply(statements, this.insertChildMultipleValuesForFeatureStatements(db, form, record, record, options));

    return statements;
  }

  static insertRowForFeatureStatement(db, form, feature, parentFeature, record, options = {}) {
    const values = this.columnValuesForFeature(feature, options);
    const systemValues = this.systemColumnValuesForFeature(feature, parentFeature, record, options);

    Object.assign(values, systemValues);

    let tableName = null;

    if (feature instanceof _fulcrumCore.RepeatableItemValue) {
      // TODO(zhm) add public interface for accessing _element, like `get repeatableElement()`
      tableName = this.tableNameWithForm(form, feature._element, options);
    } else {
      tableName = this.tableNameWithForm(form, null, options);
    }

    if (options.valuesTransformer) {
      options.valuesTransformer({ db, form, feature, parentFeature, record, values });
    }

    return db.insertStatement(tableName, values, { pk: 'id' });
  }

  static insertChildFeaturesForFeatureStatements(db, form, feature, record, options = {}) {
    const statements = [];

    for (const formValue of feature.formValues.all) {
      if (formValue.element.isRepeatableElement) {
        // TODO(zhm) add public interface for _items
        for (const repeatableItem of formValue._items) {
          statements.push(this.insertRowForFeatureStatement(db, form, repeatableItem, feature, record, options));
          statements.push.apply(statements, this.insertChildFeaturesForFeatureStatements(db, form, repeatableItem, record, options));
        }
      }
    }

    return statements;
  }

  static maybeAssignArray(values, key, value, disableArrays) {
    if (value == null) {
      return;
    }

    values[key] = _lodash2.default.isArray(value) && disableArrays ? value.join(',') : value;
  }

  static columnValuesForFeature(feature, options = {}) {
    const values = {};

    for (const formValue of feature.formValues.all) {
      if (formValue.isEmpty) {
        continue;
      }

      let columnValue = formValue.columnValue;

      if (_lodash2.default.isNumber(columnValue) || _lodash2.default.isString(columnValue) || _lodash2.default.isArray(columnValue) || _lodash2.default.isDate(columnValue)) {
        // don't allow dates greater than 9999, yes - they exist in the wild
        if (_lodash2.default.isDate(columnValue)) {
          columnValue = columnValue.getFullYear() > 9999 ? null : formValue.textValue;
        }

        this.maybeAssignArray(values, 'f' + formValue.element.key.toLowerCase(), columnValue, options.disableArrays);
      } else if (columnValue) {
        const element = formValue.element;

        if (element && options.mediaURLFormatter) {
          if (element.isPhotoElement || element.isVideoElement || element.isAudioElement) {
            const prefix = 'f' + formValue.element.key.toLowerCase();

            columnValue[prefix + '_urls'] = options.mediaURLFormatter(formValue);

            if (options.mediaViewURLFormatter) {
              columnValue[prefix + '_view_url'] = options.mediaViewURLFormatter(formValue);
            }
          }
        }

        // if array types are disabled, convert all the props to delimited values
        if (options.disableArrays) {
          for (const key of Object.keys(columnValue)) {
            this.maybeAssignArray(columnValue, key, columnValue[key], options.disableArrays);
          }
        }

        Object.assign(values, columnValue);
      }
    }

    return values;
  }

  static insertMultipleValuesForFeatureStatements(db, form, feature, record, options = {}) {
    const statements = [];

    const values = this.multipleValuesForFeature(feature, record);

    const tableName = this.multipleValueTableNameWithForm(form, options);

    let parentResourceId = null;

    if (feature instanceof _fulcrumCore.RepeatableItemValue) {
      parentResourceId = feature.id;
    }

    for (const multipleValueItem of values) {
      const insertValues = Object.assign({}, { key: multipleValueItem.element.key, text_value: multipleValueItem.value }, { record_id: record.rowID, record_resource_id: record.id, parent_resource_id: parentResourceId });

      statements.push(db.insertStatement(tableName, insertValues, { pk: 'id' }));
    }

    return statements;
  }

  static insertChildMultipleValuesForFeatureStatements(db, form, feature, record, options = {}) {
    const statements = [];

    for (const formValue of feature.formValues.all) {
      if (formValue.isRepeatableElement) {
        for (const repeatableItem of formValue._items) {
          statements.push.apply(statements, this.insertMultipleValuesForFeatureStatements(db, form, repeatableItem, record, options));
          statements.push.apply(statements, this.insertChildMultipleValuesForFeatureStatements(db, form, repeatableItem, record, options));
        }
      }
    }

    return statements;
  }

  static multipleValuesForFeature(feature, record) {
    const values = [];

    for (const formValue of feature.formValues.all) {
      if (formValue.isEmpty) {
        continue;
      }

      const featureValues = formValue.multipleValues;

      if (featureValues) {
        values.push.apply(values, featureValues);
      }
    }

    return values;
  }

  static systemColumnValuesForFeature(feature, parentFeature, record, options = {}) {
    const values = {};

    values.record_id = record.rowID;
    values.record_resource_id = record.id;

    if (options.reportURLFormatter) {
      values.report_url = options.reportURLFormatter(feature);
    }

    if (feature instanceof _fulcrumCore.Record) {
      if (record._projectRowID) {
        values.project_id = record._projectRowID;
      }

      if (record.projectID) {
        values.project_resource_id = record.projectID;
      }

      if (record._assignedToRowID) {
        values.assigned_to_id = record._assignedToRowID;
      }

      if (record.assignedToID) {
        values.assigned_to_resource_id = record.assignedToID;
      }

      if (record._createdByRowID) {
        values.created_by_id = record._createdByRowID;
      }

      if (record.createdByID) {
        values.created_by_resource_id = record.createdByID;
      }

      if (record._updatedByRowID) {
        values.updated_by_id = record._updatedByRowID;
      }

      if (record.updatedByID) {
        values.updated_by_resource_id = record.updatedByID;
      }

      if (record._changesetRowID) {
        values.changeset_id = record._changesetRowID;
      }

      if (record.changesetID) {
        values.changeset_resource_id = record.changesetID;
      }

      if (record.status) {
        values.status = record.status;
      }

      if (record.latitude != null) {
        values.latitude = record.latitude;
      }

      if (record.longitude != null) {
        values.longitude = record.longitude;
      }

      values.altitude = record.altitude;
      values.speed = record.speed;
      values.course = record.course;
      values.vertical_accuracy = record.verticalAccuracy;
      values.horizontal_accuracy = record.horizontalAccuracy;
    } else if (feature instanceof _fulcrumCore.RepeatableItemValue) {
      values.resource_id = feature.id;
      values.index = feature.index;
      values.parent_resource_id = parentFeature.id;

      if (feature.hasCoordinate) {
        values.latitude = feature.latitude;
        values.longitude = feature.longitude;
      }

      // record values
      if (record.status) {
        values.record_status = record.status;
      }

      if (record._projectRowID) {
        values.record_project_id = record._projectRowID;
      }

      if (record.projectID) {
        values.record_project_resource_id = record.projectID;
      }

      if (record._assignedToRowID) {
        values.record_assigned_to_id = record._assignedToRowID;
      }

      if (record.assignedToID) {
        values.record_assigned_to_resource_id = record.assignedToID;
      }

      // linked fields
      if (feature.createdBy) {
        values.created_by_id = feature.createdBy.rowID;
      }

      if (feature.createdByID) {
        values.created_by_resource_id = feature.createdByID;
      }

      if (feature.updatedBy) {
        values.updated_by_id = feature.updatedBy.rowID;
      }

      if (feature.updatedByID) {
        values.updated_by_resource_id = feature.updatedByID;
      }

      if (feature.changeset) {
        values.changeset_id = feature.changeset.rowID;
        values.changeset_resource_id = feature.changesetID;
      } else if (record._changesetRowID) {
        values.changeset_id = record._changesetRowID;
        values.changeset_resource_id = record.changesetID;
      }
    }

    values.title = feature.displayValue;

    values.form_values = JSON.stringify(feature.formValues.toJSON());

    this.setupSearch(values, feature);

    if (feature.hasCoordinate) {
      values.geometry = this.setupPoint(values, feature.latitude, feature.longitude);
    } else {
      values.geometry = null;
    }

    values.created_at = feature.clientCreatedAt || feature.createdAt;
    values.updated_at = feature.clientUpdatedAt || feature.updatedAt;
    values.version = feature.version;

    if (values.created_by_id == null) {
      values.created_by_id = -1;
    }

    if (values.updated_by_id == null) {
      values.updated_by_id = -1;
    }

    values.server_created_at = feature.createdAt;
    values.server_updated_at = feature.updatedAt;

    values.created_duration = feature.createdDuration;
    values.updated_duration = feature.updatedDuration;
    values.edited_duration = feature.editedDuration;

    values.created_latitude = feature.createdLatitude;
    values.created_longitude = feature.createdLongitude;
    values.created_altitude = feature.createdAltitude;
    values.created_horizontal_accuracy = feature.createdAccuracy;

    if (feature.hasCreatedCoordinate) {
      values.created_geometry = this.setupPoint(values, feature.createdLatitude, feature.createdLongitude);
    }

    values.updated_latitude = feature.updatedLatitude;
    values.updated_longitude = feature.updatedLongitude;
    values.updated_altitude = feature.updatedAltitude;
    values.updated_horizontal_accuracy = feature.updatedAccuracy;

    if (feature.hasUpdatedCoordinate) {
      values.updated_geometry = this.setupPoint(values, feature.updatedLatitude, feature.updatedLongitude);
    }

    return values;
  }

  static deleteRowsForRecordStatement(db, record, tableName) {
    return db.deleteStatement(tableName, { record_resource_id: record.id });
  }

  static deleteRowsStatement(db, tableName) {
    return db.deleteStatement(tableName, {});
  }

  static deleteForRecordStatements(db, record, form, options) {
    const repeatables = form.elementsOfType('Repeatable');

    const statements = [];

    let tableName = this.tableNameWithForm(form, null, options);

    statements.push(this.deleteRowsForRecordStatement(db, record, tableName));

    for (const repeatable of repeatables) {
      tableName = this.tableNameWithForm(form, repeatable, options);

      statements.push(this.deleteRowsForRecordStatement(db, record, tableName));
    }

    tableName = this.multipleValueTableNameWithForm(form, options);

    statements.push(this.deleteRowsForRecordStatement(db, record, tableName));

    return statements;
  }

  static deleteForFormStatements(db, form, options) {
    const repeatables = form.elementsOfType('Repeatable');

    const statements = [];

    let tableName = this.tableNameWithForm(form, null, options);

    statements.push(this.deleteRowsStatement(db, tableName));

    for (const repeatable of repeatables) {
      tableName = this.tableNameWithForm(form, repeatable, options);

      statements.push(this.deleteRowsStatement(db, tableName));
    }

    tableName = this.multipleValueTableNameWithForm(form, options);

    statements.push(this.deleteRowsStatement(db, tableName));

    return statements;
  }

  static multipleValueTableNameWithForm(form, options) {
    const prefix = options && options.schema ? options.schema + '.' : '';

    return (0, _util.format)('%saccount_%s_form_%s_values', prefix, form._accountRowID, form.rowID);
  }

  static tableNameWithForm(form, repeatable, options) {
    const prefix = options && options.schema ? options.schema + '.' : '';

    if (repeatable == null) {
      return (0, _util.format)('%saccount_%s_form_%s', prefix, form._accountRowID, form.rowID);
    }

    return (0, _util.format)('%saccount_%s_form_%s_%s', prefix, form._accountRowID, form.rowID, repeatable.key);
  }

  static setupSearch(values, feature) {
    const searchableValue = feature.searchableValue;

    values.record_index_text = searchableValue;
    values.record_index = { raw: `to_tsvector(${(0, _pgFormat2.default)('%L', searchableValue)})` };

    return values;
  }

  static setupPoint(values, latitude, longitude) {
    const wkt = (0, _pgFormat2.default)('POINT(%s %s)', longitude, latitude);

    return { raw: `ST_Force2D(ST_SetSRID(ST_GeomFromText('${wkt}'), 4326))` };
  }
}
exports.default = RecordValues;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tYWluL21vZGVscy9yZWNvcmQtdmFsdWVzL3JlY29yZC12YWx1ZXMuanMiXSwibmFtZXMiOlsiUmVjb3JkVmFsdWVzIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsImRiIiwicmVjb3JkIiwib3B0aW9ucyIsInN0YXRlbWVudHMiLCJwdXNoIiwiYXBwbHkiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwiZm9ybSIsImluc2VydEZvclJlY29yZFN0YXRlbWVudHMiLCJpbnNlcnRSb3dGb3JGZWF0dXJlU3RhdGVtZW50IiwiaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzIiwiaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImZlYXR1cmUiLCJwYXJlbnRGZWF0dXJlIiwidmFsdWVzIiwiY29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJPYmplY3QiLCJhc3NpZ24iLCJ0YWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybSIsIl9lbGVtZW50IiwidmFsdWVzVHJhbnNmb3JtZXIiLCJpbnNlcnRTdGF0ZW1lbnQiLCJwayIsImZvcm1WYWx1ZSIsImZvcm1WYWx1ZXMiLCJhbGwiLCJlbGVtZW50IiwiaXNSZXBlYXRhYmxlRWxlbWVudCIsInJlcGVhdGFibGVJdGVtIiwiX2l0ZW1zIiwibWF5YmVBc3NpZ25BcnJheSIsImtleSIsInZhbHVlIiwiZGlzYWJsZUFycmF5cyIsImlzQXJyYXkiLCJqb2luIiwiaXNFbXB0eSIsImNvbHVtblZhbHVlIiwiaXNOdW1iZXIiLCJpc1N0cmluZyIsImlzRGF0ZSIsImdldEZ1bGxZZWFyIiwidGV4dFZhbHVlIiwidG9Mb3dlckNhc2UiLCJtZWRpYVVSTEZvcm1hdHRlciIsImlzUGhvdG9FbGVtZW50IiwiaXNWaWRlb0VsZW1lbnQiLCJpc0F1ZGlvRWxlbWVudCIsInByZWZpeCIsIm1lZGlhVmlld1VSTEZvcm1hdHRlciIsImtleXMiLCJtdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmUiLCJtdWx0aXBsZVZhbHVlVGFibGVOYW1lV2l0aEZvcm0iLCJwYXJlbnRSZXNvdXJjZUlkIiwiaWQiLCJtdWx0aXBsZVZhbHVlSXRlbSIsImluc2VydFZhbHVlcyIsInRleHRfdmFsdWUiLCJyZWNvcmRfaWQiLCJyb3dJRCIsInJlY29yZF9yZXNvdXJjZV9pZCIsInBhcmVudF9yZXNvdXJjZV9pZCIsImZlYXR1cmVWYWx1ZXMiLCJtdWx0aXBsZVZhbHVlcyIsInJlcG9ydFVSTEZvcm1hdHRlciIsInJlcG9ydF91cmwiLCJfcHJvamVjdFJvd0lEIiwicHJvamVjdF9pZCIsInByb2plY3RJRCIsInByb2plY3RfcmVzb3VyY2VfaWQiLCJfYXNzaWduZWRUb1Jvd0lEIiwiYXNzaWduZWRfdG9faWQiLCJhc3NpZ25lZFRvSUQiLCJhc3NpZ25lZF90b19yZXNvdXJjZV9pZCIsIl9jcmVhdGVkQnlSb3dJRCIsImNyZWF0ZWRfYnlfaWQiLCJjcmVhdGVkQnlJRCIsImNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQiLCJfdXBkYXRlZEJ5Um93SUQiLCJ1cGRhdGVkX2J5X2lkIiwidXBkYXRlZEJ5SUQiLCJ1cGRhdGVkX2J5X3Jlc291cmNlX2lkIiwiX2NoYW5nZXNldFJvd0lEIiwiY2hhbmdlc2V0X2lkIiwiY2hhbmdlc2V0SUQiLCJjaGFuZ2VzZXRfcmVzb3VyY2VfaWQiLCJzdGF0dXMiLCJsYXRpdHVkZSIsImxvbmdpdHVkZSIsImFsdGl0dWRlIiwic3BlZWQiLCJjb3Vyc2UiLCJ2ZXJ0aWNhbF9hY2N1cmFjeSIsInZlcnRpY2FsQWNjdXJhY3kiLCJob3Jpem9udGFsX2FjY3VyYWN5IiwiaG9yaXpvbnRhbEFjY3VyYWN5IiwicmVzb3VyY2VfaWQiLCJpbmRleCIsImhhc0Nvb3JkaW5hdGUiLCJyZWNvcmRfc3RhdHVzIiwicmVjb3JkX3Byb2plY3RfaWQiLCJyZWNvcmRfcHJvamVjdF9yZXNvdXJjZV9pZCIsInJlY29yZF9hc3NpZ25lZF90b19pZCIsInJlY29yZF9hc3NpZ25lZF90b19yZXNvdXJjZV9pZCIsImNyZWF0ZWRCeSIsInVwZGF0ZWRCeSIsImNoYW5nZXNldCIsInRpdGxlIiwiZGlzcGxheVZhbHVlIiwiZm9ybV92YWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwidG9KU09OIiwic2V0dXBTZWFyY2giLCJnZW9tZXRyeSIsInNldHVwUG9pbnQiLCJjcmVhdGVkX2F0IiwiY2xpZW50Q3JlYXRlZEF0IiwiY3JlYXRlZEF0IiwidXBkYXRlZF9hdCIsImNsaWVudFVwZGF0ZWRBdCIsInVwZGF0ZWRBdCIsInZlcnNpb24iLCJzZXJ2ZXJfY3JlYXRlZF9hdCIsInNlcnZlcl91cGRhdGVkX2F0IiwiY3JlYXRlZF9kdXJhdGlvbiIsImNyZWF0ZWREdXJhdGlvbiIsInVwZGF0ZWRfZHVyYXRpb24iLCJ1cGRhdGVkRHVyYXRpb24iLCJlZGl0ZWRfZHVyYXRpb24iLCJlZGl0ZWREdXJhdGlvbiIsImNyZWF0ZWRfbGF0aXR1ZGUiLCJjcmVhdGVkTGF0aXR1ZGUiLCJjcmVhdGVkX2xvbmdpdHVkZSIsImNyZWF0ZWRMb25naXR1ZGUiLCJjcmVhdGVkX2FsdGl0dWRlIiwiY3JlYXRlZEFsdGl0dWRlIiwiY3JlYXRlZF9ob3Jpem9udGFsX2FjY3VyYWN5IiwiY3JlYXRlZEFjY3VyYWN5IiwiaGFzQ3JlYXRlZENvb3JkaW5hdGUiLCJjcmVhdGVkX2dlb21ldHJ5IiwidXBkYXRlZF9sYXRpdHVkZSIsInVwZGF0ZWRMYXRpdHVkZSIsInVwZGF0ZWRfbG9uZ2l0dWRlIiwidXBkYXRlZExvbmdpdHVkZSIsInVwZGF0ZWRfYWx0aXR1ZGUiLCJ1cGRhdGVkQWx0aXR1ZGUiLCJ1cGRhdGVkX2hvcml6b250YWxfYWNjdXJhY3kiLCJ1cGRhdGVkQWNjdXJhY3kiLCJoYXNVcGRhdGVkQ29vcmRpbmF0ZSIsInVwZGF0ZWRfZ2VvbWV0cnkiLCJkZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50IiwiZGVsZXRlU3RhdGVtZW50IiwiZGVsZXRlUm93c1N0YXRlbWVudCIsInJlcGVhdGFibGVzIiwiZWxlbWVudHNPZlR5cGUiLCJyZXBlYXRhYmxlIiwiZGVsZXRlRm9yRm9ybVN0YXRlbWVudHMiLCJzY2hlbWEiLCJfYWNjb3VudFJvd0lEIiwic2VhcmNoYWJsZVZhbHVlIiwicmVjb3JkX2luZGV4X3RleHQiLCJyZWNvcmRfaW5kZXgiLCJyYXciLCJ3a3QiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVlLE1BQU1BLFlBQU4sQ0FBbUI7QUFDaEMsU0FBT0MseUJBQVAsQ0FBaUNDLEVBQWpDLEVBQXFDQyxNQUFyQyxFQUE2Q0MsVUFBVSxFQUF2RCxFQUEyRDtBQUN6RCxVQUFNQyxhQUFhLEVBQW5COztBQUVBQSxlQUFXQyxJQUFYLENBQWdCQyxLQUFoQixDQUFzQkYsVUFBdEIsRUFBa0MsS0FBS0cseUJBQUwsQ0FBK0JOLEVBQS9CLEVBQW1DQyxNQUFuQyxFQUEyQ0EsT0FBT00sSUFBbEQsRUFBd0RMLE9BQXhELENBQWxDO0FBQ0FDLGVBQVdDLElBQVgsQ0FBZ0JDLEtBQWhCLENBQXNCRixVQUF0QixFQUFrQyxLQUFLSyx5QkFBTCxDQUErQlIsRUFBL0IsRUFBbUNDLE1BQW5DLEVBQTJDQSxPQUFPTSxJQUFsRCxFQUF3REwsT0FBeEQsQ0FBbEM7O0FBRUEsV0FBT0MsVUFBUDtBQUNEOztBQUVELFNBQU9LLHlCQUFQLENBQWlDUixFQUFqQyxFQUFxQ0MsTUFBckMsRUFBNkNNLElBQTdDLEVBQW1ETCxVQUFVLEVBQTdELEVBQWlFO0FBQy9ELFVBQU1DLGFBQWEsRUFBbkI7O0FBRUFBLGVBQVdDLElBQVgsQ0FBZ0IsS0FBS0ssNEJBQUwsQ0FBa0NULEVBQWxDLEVBQXNDTyxJQUF0QyxFQUE0Q04sTUFBNUMsRUFBb0QsSUFBcEQsRUFBMERBLE1BQTFELEVBQWtFQyxPQUFsRSxDQUFoQjtBQUNBQyxlQUFXQyxJ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QU8sRUFBQzRFLEtBQU0sMENBQTBDQyxHQUFLLFlBQXRELEVBQVA7QUFDRDtBQTVhK0I7a0JBQWIxSyxZIiwiZmlsZSI6InJlY29yZC12YWx1ZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgeyBSZWNvcmQsIFJlcGVhdGFibGVJdGVtVmFsdWUgfSBmcm9tICdmdWxjcnVtLWNvcmUnO1xuaW1wb3J0IHBnZm9ybWF0IGZyb20gJ3BnLWZvcm1hdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZFZhbHVlcyB7XG4gIHN0YXRpYyB1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMoZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIG9wdGlvbnMpKTtcbiAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIHJlY29yZC5mb3JtLCBvcHRpb25zKSk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIGZvcm0sIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmluc2VydFJvd0ZvckZlYXR1cmVTdGF0ZW1lbnQoZGIsIGZvcm0sIHJlY29yZCwgbnVsbCwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZWNvcmQsIHJlY29yZCwgb3B0aW9ucykpO1xuICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydE11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIHJlY29yZCwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0Q2hpbGRNdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZWNvcmQsIHJlY29yZCwgb3B0aW9ucykpO1xuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0Um93Rm9yRmVhdHVyZVN0YXRlbWVudChkYiwgZm9ybSwgZmVhdHVyZSwgcGFyZW50RmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLmNvbHVtblZhbHVlc0ZvckZlYXR1cmUoZmVhdHVyZSwgb3B0aW9ucyk7XG4gICAgY29uc3Qgc3lzdGVtVmFsdWVzID0gdGhpcy5zeXN0ZW1Db2x1bW5WYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIHBhcmVudEZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyk7XG5cbiAgICBPYmplY3QuYXNzaWduKHZhbHVlcywgc3lzdGVtVmFsdWVzKTtcblxuICAgIGxldCB0YWJsZU5hbWUgPSBudWxsO1xuXG4gICAgaWYgKGZlYXR1cmUgaW5zdGFuY2VvZiBSZXBlYXRhYmxlSXRlbVZhbHVlKSB7XG4gICAgICAvLyBUT0RPKHpobSkgYWRkIHB1YmxpYyBpbnRlcmZhY2UgZm9yIGFjY2Vzc2luZyBfZWxlbWVudCwgbGlrZSBgZ2V0IHJlcGVhdGFibGVFbGVtZW50KClgXG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIGZlYXR1cmUuX2VsZW1lbnQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG51bGwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnZhbHVlc1RyYW5zZm9ybWVyKSB7XG4gICAgICBvcHRpb25zLnZhbHVlc1RyYW5zZm9ybWVyKHtkYiwgZm9ybSwgZmVhdHVyZSwgcGFyZW50RmVhdHVyZSwgcmVjb3JkLCB2YWx1ZXN9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGIuaW5zZXJ0U3RhdGVtZW50KHRhYmxlTmFtZSwgdmFsdWVzLCB7cGs6ICdpZCd9KTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRDaGlsZEZlYXR1cmVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIGZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBmb3JtVmFsdWUgb2YgZmVhdHVyZS5mb3JtVmFsdWVzLmFsbCkge1xuICAgICAgaWYgKGZvcm1WYWx1ZS5lbGVtZW50LmlzUmVwZWF0YWJsZUVsZW1lbnQpIHtcbiAgICAgICAgLy8gVE9ETyh6aG0pIGFkZCBwdWJsaWMgaW50ZXJmYWNlIGZvciBfaXRlbXNcbiAgICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlSXRlbSBvZiBmb3JtVmFsdWUuX2l0ZW1zKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuaW5zZXJ0Um93Rm9yRmVhdHVyZVN0YXRlbWVudChkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIGZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydENoaWxkRmVhdHVyZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgbWF5YmVBc3NpZ25BcnJheSh2YWx1ZXMsIGtleSwgdmFsdWUsIGRpc2FibGVBcnJheXMpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhbHVlc1trZXldID0gKF8uaXNBcnJheSh2YWx1ZSkgJiYgZGlzYWJsZUFycmF5cykgPyB2YWx1ZS5qb2luKCcsJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdmFsdWU7XG4gIH1cblxuICBzdGF0aWMgY29sdW1uVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSB7fTtcblxuICAgIGZvciAoY29uc3QgZm9ybVZhbHVlIG9mIGZlYXR1cmUuZm9ybVZhbHVlcy5hbGwpIHtcbiAgICAgIGlmIChmb3JtVmFsdWUuaXNFbXB0eSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IGNvbHVtblZhbHVlID0gZm9ybVZhbHVlLmNvbHVtblZhbHVlO1xuXG4gICAgICBpZiAoXy5pc051bWJlcihjb2x1bW5WYWx1ZSkgfHwgXy5pc1N0cmluZyhjb2x1bW5WYWx1ZSkgfHwgXy5pc0FycmF5KGNvbHVtblZhbHVlKSB8fCBfLmlzRGF0ZShjb2x1bW5WYWx1ZSkpIHtcbiAgICAgICAgLy8gZG9uJ3QgYWxsb3cgZGF0ZXMgZ3JlYXRlciB0aGFuIDk5OTksIHllcyAtIHRoZXkgZXhpc3QgaW4gdGhlIHdpbGRcbiAgICAgICAgaWYgKF8uaXNEYXRlKGNvbHVtblZhbHVlKSkge1xuICAgICAgICAgIGNvbHVtblZhbHVlID0gY29sdW1uVmFsdWUuZ2V0RnVsbFllYXIoKSA+IDk5OTkgPyBudWxsIDogZm9ybVZhbHVlLnRleHRWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWF5YmVBc3NpZ25BcnJheSh2YWx1ZXMsICdmJyArIGZvcm1WYWx1ZS5lbGVtZW50LmtleS50b0xvd2VyQ2FzZSgpLCBjb2x1bW5WYWx1ZSwgb3B0aW9ucy5kaXNhYmxlQXJyYXlzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29sdW1uVmFsdWUpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGZvcm1WYWx1ZS5lbGVtZW50O1xuXG4gICAgICAgIGlmIChlbGVtZW50ICYmIG9wdGlvbnMubWVkaWFVUkxGb3JtYXR0ZXIpIHtcbiAgICAgICAgICBpZiAoZWxlbWVudC5pc1Bob3RvRWxlbWVudCB8fCBlbGVtZW50LmlzVmlkZW9FbGVtZW50IHx8IGVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZWZpeCA9ICdmJyArIGZvcm1WYWx1ZS5lbGVtZW50LmtleS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgICAgICBjb2x1bW5WYWx1ZVtwcmVmaXggKyAnX3VybHMnXSA9IG9wdGlvbnMubWVkaWFVUkxGb3JtYXR0ZXIoZm9ybVZhbHVlKTtcblxuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWVkaWFWaWV3VVJMRm9ybWF0dGVyKSB7XG4gICAgICAgICAgICAgIGNvbHVtblZhbHVlW3ByZWZpeCArICdfdmlld191cmwnXSA9IG9wdGlvbnMubWVkaWFWaWV3VVJMRm9ybWF0dGVyKGZvcm1WYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgYXJyYXkgdHlwZXMgYXJlIGRpc2FibGVkLCBjb252ZXJ0IGFsbCB0aGUgcHJvcHMgdG8gZGVsaW1pdGVkIHZhbHVlc1xuICAgICAgICBpZiAob3B0aW9ucy5kaXNhYmxlQXJyYXlzKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY29sdW1uVmFsdWUpKSB7XG4gICAgICAgICAgICB0aGlzLm1heWJlQXNzaWduQXJyYXkoY29sdW1uVmFsdWUsIGtleSwgY29sdW1uVmFsdWVba2V5XSwgb3B0aW9ucy5kaXNhYmxlQXJyYXlzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHZhbHVlcywgY29sdW1uVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgZmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLm11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCByZWNvcmQpO1xuXG4gICAgY29uc3QgdGFibGVOYW1lID0gdGhpcy5tdWx0aXBsZVZhbHVlVGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgb3B0aW9ucyk7XG5cbiAgICBsZXQgcGFyZW50UmVzb3VyY2VJZCA9IG51bGw7XG5cbiAgICBpZiAoZmVhdHVyZSBpbnN0YW5jZW9mIFJlcGVhdGFibGVJdGVtVmFsdWUpIHtcbiAgICAgIHBhcmVudFJlc291cmNlSWQgPSBmZWF0dXJlLmlkO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgbXVsdGlwbGVWYWx1ZUl0ZW0gb2YgdmFsdWVzKSB7XG4gICAgICBjb25zdCBpbnNlcnRWYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCB7a2V5OiBtdWx0aXBsZVZhbHVlSXRlbS5lbGVtZW50LmtleSwgdGV4dF92YWx1ZTogbXVsdGlwbGVWYWx1ZUl0ZW0udmFsdWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cmVjb3JkX2lkOiByZWNvcmQucm93SUQsIHJlY29yZF9yZXNvdXJjZV9pZDogcmVjb3JkLmlkLCBwYXJlbnRfcmVzb3VyY2VfaWQ6IHBhcmVudFJlc291cmNlSWR9KTtcblxuICAgICAgc3RhdGVtZW50cy5wdXNoKGRiLmluc2VydFN0YXRlbWVudCh0YWJsZU5hbWUsIGluc2VydFZhbHVlcywge3BrOiAnaWQnfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIGluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgZmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1WYWx1ZSBvZiBmZWF0dXJlLmZvcm1WYWx1ZXMuYWxsKSB7XG4gICAgICBpZiAoZm9ybVZhbHVlLmlzUmVwZWF0YWJsZUVsZW1lbnQpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlSXRlbSBvZiBmb3JtVmFsdWUuX2l0ZW1zKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgbXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIHJlY29yZCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBmb3JtVmFsdWUgb2YgZmVhdHVyZS5mb3JtVmFsdWVzLmFsbCkge1xuICAgICAgaWYgKGZvcm1WYWx1ZS5pc0VtcHR5KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmZWF0dXJlVmFsdWVzID0gZm9ybVZhbHVlLm11bHRpcGxlVmFsdWVzO1xuXG4gICAgICBpZiAoZmVhdHVyZVZhbHVlcykge1xuICAgICAgICB2YWx1ZXMucHVzaC5hcHBseSh2YWx1ZXMsIGZlYXR1cmVWYWx1ZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH1cblxuICBzdGF0aWMgc3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCBwYXJlbnRGZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZhbHVlcyA9IHt9O1xuXG4gICAgdmFsdWVzLnJlY29yZF9pZCA9IHJlY29yZC5yb3dJRDtcbiAgICB2YWx1ZXMucmVjb3JkX3Jlc291cmNlX2lkID0gcmVjb3JkLmlkO1xuXG4gICAgaWYgKG9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyKSB7XG4gICAgICB2YWx1ZXMucmVwb3J0X3VybCA9IG9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyKGZlYXR1cmUpO1xuICAgIH1cblxuICAgIGlmIChmZWF0dXJlIGluc3RhbmNlb2YgUmVjb3JkKSB7XG4gICAgICBpZiAocmVjb3JkLl9wcm9qZWN0Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLnByb2plY3RfaWQgPSByZWNvcmQuX3Byb2plY3RSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5wcm9qZWN0SUQpIHtcbiAgICAgICAgdmFsdWVzLnByb2plY3RfcmVzb3VyY2VfaWQgPSByZWNvcmQucHJvamVjdElEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9hc3NpZ25lZFRvUm93SUQpIHtcbiAgICAgICAgdmFsdWVzLmFzc2lnbmVkX3RvX2lkID0gcmVjb3JkLl9hc3NpZ25lZFRvUm93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuYXNzaWduZWRUb0lEKSB7XG4gICAgICAgIHZhbHVlcy5hc3NpZ25lZF90b19yZXNvdXJjZV9pZCA9IHJlY29yZC5hc3NpZ25lZFRvSUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX2NyZWF0ZWRCeVJvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5jcmVhdGVkX2J5X2lkID0gcmVjb3JkLl9jcmVhdGVkQnlSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5jcmVhdGVkQnlJRCkge1xuICAgICAgICB2YWx1ZXMuY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCA9IHJlY29yZC5jcmVhdGVkQnlJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5fdXBkYXRlZEJ5Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfaWQgPSByZWNvcmQuX3VwZGF0ZWRCeVJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLnVwZGF0ZWRCeUlEKSB7XG4gICAgICAgIHZhbHVlcy51cGRhdGVkX2J5X3Jlc291cmNlX2lkID0gcmVjb3JkLnVwZGF0ZWRCeUlEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9jaGFuZ2VzZXRSb3dJRCkge1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X2lkID0gcmVjb3JkLl9jaGFuZ2VzZXRSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5jaGFuZ2VzZXRJRCkge1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X3Jlc291cmNlX2lkID0gcmVjb3JkLmNoYW5nZXNldElEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLnN0YXR1cykge1xuICAgICAgICB2YWx1ZXMuc3RhdHVzID0gcmVjb3JkLnN0YXR1cztcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5sYXRpdHVkZSAhPSBudWxsKSB7XG4gICAgICAgIHZhbHVlcy5sYXRpdHVkZSA9IHJlY29yZC5sYXRpdHVkZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5sb25naXR1ZGUgIT0gbnVsbCkge1xuICAgICAgICB2YWx1ZXMubG9uZ2l0dWRlID0gcmVjb3JkLmxvbmdpdHVkZTtcbiAgICAgIH1cblxuICAgICAgdmFsdWVzLmFsdGl0dWRlID0gcmVjb3JkLmFsdGl0dWRlO1xuICAgICAgdmFsdWVzLnNwZWVkID0gcmVjb3JkLnNwZWVkO1xuICAgICAgdmFsdWVzLmNvdXJzZSA9IHJlY29yZC5jb3Vyc2U7XG4gICAgICB2YWx1ZXMudmVydGljYWxfYWNjdXJhY3kgPSByZWNvcmQudmVydGljYWxBY2N1cmFjeTtcbiAgICAgIHZhbHVlcy5ob3Jpem9udGFsX2FjY3VyYWN5ID0gcmVjb3JkLmhvcml6b250YWxBY2N1cmFjeTtcbiAgICB9IGVsc2UgaWYgKGZlYXR1cmUgaW5zdGFuY2VvZiBSZXBlYXRhYmxlSXRlbVZhbHVlKSB7XG4gICAgICB2YWx1ZXMucmVzb3VyY2VfaWQgPSBmZWF0dXJlLmlkO1xuICAgICAgdmFsdWVzLmluZGV4ID0gZmVhdHVyZS5pbmRleDtcbiAgICAgIHZhbHVlcy5wYXJlbnRfcmVzb3VyY2VfaWQgPSBwYXJlbnRGZWF0dXJlLmlkO1xuXG4gICAgICBpZiAoZmVhdHVyZS5oYXNDb29yZGluYXRlKSB7XG4gICAgICAgIHZhbHVlcy5sYXRpdHVkZSA9IGZlYXR1cmUubGF0aXR1ZGU7XG4gICAgICAgIHZhbHVlcy5sb25naXR1ZGUgPSBmZWF0dXJlLmxvbmdpdHVkZTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVjb3JkIHZhbHVlc1xuICAgICAgaWYgKHJlY29yZC5zdGF0dXMpIHtcbiAgICAgICAgdmFsdWVzLnJlY29yZF9zdGF0dXMgPSByZWNvcmQuc3RhdHVzO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9wcm9qZWN0Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLnJlY29yZF9wcm9qZWN0X2lkID0gcmVjb3JkLl9wcm9qZWN0Um93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQucHJvamVjdElEKSB7XG4gICAgICAgIHZhbHVlcy5yZWNvcmRfcHJvamVjdF9yZXNvdXJjZV9pZCA9IHJlY29yZC5wcm9qZWN0SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX2Fzc2lnbmVkVG9Sb3dJRCkge1xuICAgICAgICB2YWx1ZXMucmVjb3JkX2Fzc2lnbmVkX3RvX2lkID0gcmVjb3JkLl9hc3NpZ25lZFRvUm93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuYXNzaWduZWRUb0lEKSB7XG4gICAgICAgIHZhbHVlcy5yZWNvcmRfYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQgPSByZWNvcmQuYXNzaWduZWRUb0lEO1xuICAgICAgfVxuXG4gICAgICAvLyBsaW5rZWQgZmllbGRzXG4gICAgICBpZiAoZmVhdHVyZS5jcmVhdGVkQnkpIHtcbiAgICAgICAgdmFsdWVzLmNyZWF0ZWRfYnlfaWQgPSBmZWF0dXJlLmNyZWF0ZWRCeS5yb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKGZlYXR1cmUuY3JlYXRlZEJ5SUQpIHtcbiAgICAgICAgdmFsdWVzLmNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgPSBmZWF0dXJlLmNyZWF0ZWRCeUlEO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmVhdHVyZS51cGRhdGVkQnkpIHtcbiAgICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfaWQgPSBmZWF0dXJlLnVwZGF0ZWRCeS5yb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKGZlYXR1cmUudXBkYXRlZEJ5SUQpIHtcbiAgICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgPSBmZWF0dXJlLnVwZGF0ZWRCeUlEO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmVhdHVyZS5jaGFuZ2VzZXQpIHtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9pZCA9IGZlYXR1cmUuY2hhbmdlc2V0LnJvd0lEO1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X3Jlc291cmNlX2lkID0gZmVhdHVyZS5jaGFuZ2VzZXRJRDtcbiAgICAgIH0gZWxzZSBpZiAocmVjb3JkLl9jaGFuZ2VzZXRSb3dJRCkge1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X2lkID0gcmVjb3JkLl9jaGFuZ2VzZXRSb3dJRDtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9yZXNvdXJjZV9pZCA9IHJlY29yZC5jaGFuZ2VzZXRJRDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YWx1ZXMudGl0bGUgPSBmZWF0dXJlLmRpc3BsYXlWYWx1ZTtcblxuICAgIHZhbHVlcy5mb3JtX3ZhbHVlcyA9IEpTT04uc3RyaW5naWZ5KGZlYXR1cmUuZm9ybVZhbHVlcy50b0pTT04oKSk7XG5cbiAgICB0aGlzLnNldHVwU2VhcmNoKHZhbHVlcywgZmVhdHVyZSk7XG5cbiAgICBpZiAoZmVhdHVyZS5oYXNDb29yZGluYXRlKSB7XG4gICAgICB2YWx1ZXMuZ2VvbWV0cnkgPSB0aGlzLnNldHVwUG9pbnQodmFsdWVzLCBmZWF0dXJlLmxhdGl0dWRlLCBmZWF0dXJlLmxvbmdpdHVkZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlcy5nZW9tZXRyeSA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFsdWVzLmNyZWF0ZWRfYXQgPSBmZWF0dXJlLmNsaWVudENyZWF0ZWRBdCB8fCBmZWF0dXJlLmNyZWF0ZWRBdDtcbiAgICB2YWx1ZXMudXBkYXRlZF9hdCA9IGZlYXR1cmUuY2xpZW50VXBkYXRlZEF0IHx8IGZlYXR1cmUudXBkYXRlZEF0O1xuICAgIHZhbHVlcy52ZXJzaW9uID0gZmVhdHVyZS52ZXJzaW9uO1xuXG4gICAgaWYgKHZhbHVlcy5jcmVhdGVkX2J5X2lkID09IG51bGwpIHtcbiAgICAgIHZhbHVlcy5jcmVhdGVkX2J5X2lkID0gLTE7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlcy51cGRhdGVkX2J5X2lkID09IG51bGwpIHtcbiAgICAgIHZhbHVlcy51cGRhdGVkX2J5X2lkID0gLTE7XG4gICAgfVxuXG4gICAgdmFsdWVzLnNlcnZlcl9jcmVhdGVkX2F0ID0gZmVhdHVyZS5jcmVhdGVkQXQ7XG4gICAgdmFsdWVzLnNlcnZlcl91cGRhdGVkX2F0ID0gZmVhdHVyZS51cGRhdGVkQXQ7XG5cbiAgICB2YWx1ZXMuY3JlYXRlZF9kdXJhdGlvbiA9IGZlYXR1cmUuY3JlYXRlZER1cmF0aW9uO1xuICAgIHZhbHVlcy51cGRhdGVkX2R1cmF0aW9uID0gZmVhdHVyZS51cGRhdGVkRHVyYXRpb247XG4gICAgdmFsdWVzLmVkaXRlZF9kdXJhdGlvbiA9IGZlYXR1cmUuZWRpdGVkRHVyYXRpb247XG5cbiAgICB2YWx1ZXMuY3JlYXRlZF9sYXRpdHVkZSA9IGZlYXR1cmUuY3JlYXRlZExhdGl0dWRlO1xuICAgIHZhbHVlcy5jcmVhdGVkX2xvbmdpdHVkZSA9IGZlYXR1cmUuY3JlYXRlZExvbmdpdHVkZTtcbiAgICB2YWx1ZXMuY3JlYXRlZF9hbHRpdHVkZSA9IGZlYXR1cmUuY3JlYXRlZEFsdGl0dWRlO1xuICAgIHZhbHVlcy5jcmVhdGVkX2hvcml6b250YWxfYWNjdXJhY3kgPSBmZWF0dXJlLmNyZWF0ZWRBY2N1cmFjeTtcblxuICAgIGlmIChmZWF0dXJlLmhhc0NyZWF0ZWRDb29yZGluYXRlKSB7XG4gICAgICB2YWx1ZXMuY3JlYXRlZF9nZW9tZXRyeSA9IHRoaXMuc2V0dXBQb2ludCh2YWx1ZXMsIGZlYXR1cmUuY3JlYXRlZExhdGl0dWRlLCBmZWF0dXJlLmNyZWF0ZWRMb25naXR1ZGUpO1xuICAgIH1cblxuICAgIHZhbHVlcy51cGRhdGVkX2xhdGl0dWRlID0gZmVhdHVyZS51cGRhdGVkTGF0aXR1ZGU7XG4gICAgdmFsdWVzLnVwZGF0ZWRfbG9uZ2l0dWRlID0gZmVhdHVyZS51cGRhdGVkTG9uZ2l0dWRlO1xuICAgIHZhbHVlcy51cGRhdGVkX2FsdGl0dWRlID0gZmVhdHVyZS51cGRhdGVkQWx0aXR1ZGU7XG4gICAgdmFsdWVzLnVwZGF0ZWRfaG9yaXpvbnRhbF9hY2N1cmFjeSA9IGZlYXR1cmUudXBkYXRlZEFjY3VyYWN5O1xuXG4gICAgaWYgKGZlYXR1cmUuaGFzVXBkYXRlZENvb3JkaW5hdGUpIHtcbiAgICAgIHZhbHVlcy51cGRhdGVkX2dlb21ldHJ5ID0gdGhpcy5zZXR1cFBvaW50KHZhbHVlcywgZmVhdHVyZS51cGRhdGVkTGF0aXR1ZGUsIGZlYXR1cmUudXBkYXRlZExvbmdpdHVkZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHN0YXRpYyBkZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50KGRiLCByZWNvcmQsIHRhYmxlTmFtZSkge1xuICAgIHJldHVybiBkYi5kZWxldGVTdGF0ZW1lbnQodGFibGVOYW1lLCB7cmVjb3JkX3Jlc291cmNlX2lkOiByZWNvcmQuaWR9KTtcbiAgfVxuXG4gIHN0YXRpYyBkZWxldGVSb3dzU3RhdGVtZW50KGRiLCB0YWJsZU5hbWUpIHtcbiAgICByZXR1cm4gZGIuZGVsZXRlU3RhdGVtZW50KHRhYmxlTmFtZSwge30pO1xuICB9XG5cbiAgc3RhdGljIGRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMoZGIsIHJlY29yZCwgZm9ybSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHJlcGVhdGFibGVzID0gZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgbGV0IHRhYmxlTmFtZSA9IHRoaXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgbnVsbCwgb3B0aW9ucyk7XG5cbiAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50KGRiLCByZWNvcmQsIHRhYmxlTmFtZSkpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIHJlcGVhdGFibGVzKSB7XG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUsIG9wdGlvbnMpO1xuXG4gICAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50KGRiLCByZWNvcmQsIHRhYmxlTmFtZSkpO1xuICAgIH1cblxuICAgIHRhYmxlTmFtZSA9IHRoaXMubXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG9wdGlvbnMpO1xuXG4gICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuZGVsZXRlUm93c0ZvclJlY29yZFN0YXRlbWVudChkYiwgcmVjb3JkLCB0YWJsZU5hbWUpKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIGRlbGV0ZUZvckZvcm1TdGF0ZW1lbnRzKGRiLCBmb3JtLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcmVwZWF0YWJsZXMgPSBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJyk7XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBsZXQgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCBudWxsLCBvcHRpb25zKTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NTdGF0ZW1lbnQoZGIsIHRhYmxlTmFtZSkpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIHJlcGVhdGFibGVzKSB7XG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUsIG9wdGlvbnMpO1xuXG4gICAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzU3RhdGVtZW50KGRiLCB0YWJsZU5hbWUpKTtcbiAgICB9XG5cbiAgICB0YWJsZU5hbWUgPSB0aGlzLm11bHRpcGxlVmFsdWVUYWJsZU5hbWVXaXRoRm9ybShmb3JtLCBvcHRpb25zKTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NTdGF0ZW1lbnQoZGIsIHRhYmxlTmFtZSkpO1xuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgbXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG9wdGlvbnMpIHtcbiAgICBjb25zdCBwcmVmaXggPSBvcHRpb25zICYmIG9wdGlvbnMuc2NoZW1hID8gb3B0aW9ucy5zY2hlbWEgKyAnLicgOiAnJztcblxuICAgIHJldHVybiBmb3JtYXQoJyVzYWNjb3VudF8lc19mb3JtXyVzX3ZhbHVlcycsIHByZWZpeCwgZm9ybS5fYWNjb3VudFJvd0lELCBmb3JtLnJvd0lEKTtcbiAgfVxuXG4gIHN0YXRpYyB0YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcHJlZml4ID0gb3B0aW9ucyAmJiBvcHRpb25zLnNjaGVtYSA/IG9wdGlvbnMuc2NoZW1hICsgJy4nIDogJyc7XG5cbiAgICBpZiAocmVwZWF0YWJsZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZm9ybWF0KCclc2FjY291bnRfJXNfZm9ybV8lcycsIHByZWZpeCwgZm9ybS5fYWNjb3VudFJvd0lELCBmb3JtLnJvd0lEKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZm9ybWF0KCclc2FjY291bnRfJXNfZm9ybV8lc18lcycsIHByZWZpeCwgZm9ybS5fYWNjb3VudFJvd0lELCBmb3JtLnJvd0lELCByZXBlYXRhYmxlLmtleSk7XG4gIH1cblxuICBzdGF0aWMgc2V0dXBTZWFyY2godmFsdWVzLCBmZWF0dXJlKSB7XG4gICAgY29uc3Qgc2VhcmNoYWJsZVZhbHVlID0gZmVhdHVyZS5zZWFyY2hhYmxlVmFsdWU7XG5cbiAgICB2YWx1ZXMucmVjb3JkX2luZGV4X3RleHQgPSBzZWFyY2hhYmxlVmFsdWU7XG4gICAgdmFsdWVzLnJlY29yZF9pbmRleCA9IHtyYXc6IGB0b190c3ZlY3RvcigkeyBwZ2Zvcm1hdCgnJUwnLCBzZWFyY2hhYmxlVmFsdWUpIH0pYH07XG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9XG5cbiAgc3RhdGljIHNldHVwUG9pbnQodmFsdWVzLCBsYXRpdHVkZSwgbG9uZ2l0dWRlKSB7XG4gICAgY29uc3Qgd2t0ID0gcGdmb3JtYXQoJ1BPSU5UKCVzICVzKScsIGxvbmdpdHVkZSwgbGF0aXR1ZGUpO1xuXG4gICAgcmV0dXJuIHtyYXc6IGBTVF9Gb3JjZTJEKFNUX1NldFNSSUQoU1RfR2VvbUZyb21UZXh0KCckeyB3a3QgfScpLCA0MzI2KSlgfTtcbiAgfVxufVxuIl19