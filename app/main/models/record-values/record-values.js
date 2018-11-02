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

  static maybeAssignArray(values, key, value, disableArrays, disableComplexTypes) {
    if (value == null) {
      return;
    }

    const disabledArrayValue = _lodash2.default.isArray(value) && disableArrays ? value.join(',') : value;

    const isSimple = _lodash2.default.isNumber(value) || _lodash2.default.isString(value) || _lodash2.default.isDate(value) || _lodash2.default.isBoolean(value);

    values[key] = !isSimple && disableComplexTypes === true ? JSON.stringify(value) : value;
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

        this.maybeAssignArray(values, 'f' + formValue.element.key.toLowerCase(), columnValue, options.disableArrays, options.disableComplexTypes);
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
        for (const key of Object.keys(columnValue)) {
          this.maybeAssignArray(columnValue, key, columnValue[key], options.disableArrays, options.disableComplexTypes);
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

    this.setupSearch(values, feature, options);

    if (feature.hasCoordinate) {
      values.geometry = this.setupPoint(values, feature.latitude, feature.longitude, options);
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
      values.created_geometry = this.setupPoint(values, feature.createdLatitude, feature.createdLongitude, options);
    }

    values.updated_latitude = feature.updatedLatitude;
    values.updated_longitude = feature.updatedLongitude;
    values.updated_altitude = feature.updatedAltitude;
    values.updated_horizontal_accuracy = feature.updatedAccuracy;

    if (feature.hasUpdatedCoordinate) {
      values.updated_geometry = this.setupPoint(values, feature.updatedLatitude, feature.updatedLongitude, options);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tYWluL21vZGVscy9yZWNvcmQtdmFsdWVzL3JlY29yZC12YWx1ZXMuanMiXSwibmFtZXMiOlsiUmVjb3JkVmFsdWVzIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsImRiIiwicmVjb3JkIiwib3B0aW9ucyIsInN0YXRlbWVudHMiLCJwdXNoIiwiYXBwbHkiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwiZm9ybSIsImluc2VydEZvclJlY29yZFN0YXRlbWVudHMiLCJpbnNlcnRSb3dGb3JGZWF0dXJlU3RhdGVtZW50IiwiaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzIiwiaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImZlYXR1cmUiLCJwYXJlbnRGZWF0dXJlIiwidmFsdWVzIiwiY29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJPYmplY3QiLCJhc3NpZ24iLCJ0YWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybSIsIl9lbGVtZW50IiwidmFsdWVzVHJhbnNmb3JtZXIiLCJpbnNlcnRTdGF0ZW1lbnQiLCJwayIsImZvcm1WYWx1ZSIsImZvcm1WYWx1ZXMiLCJhbGwiLCJlbGVtZW50IiwiaXNSZXBlYXRhYmxlRWxlbWVudCIsInJlcGVhdGFibGVJdGVtIiwiX2l0ZW1zIiwibWF5YmVBc3NpZ25BcnJheSIsImtleSIsInZhbHVlIiwiZGlzYWJsZUFycmF5cyIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJkaXNhYmxlZEFycmF5VmFsdWUiLCJpc0FycmF5Iiwiam9pbiIsImlzU2ltcGxlIiwiaXNOdW1iZXIiLCJpc1N0cmluZyIsImlzRGF0ZSIsImlzQm9vbGVhbiIsIkpTT04iLCJzdHJpbmdpZnkiLCJpc0VtcHR5IiwiY29sdW1uVmFsdWUiLCJnZXRGdWxsWWVhciIsInRleHRWYWx1ZSIsInRvTG93ZXJDYXNlIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJpc1Bob3RvRWxlbWVudCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJwcmVmaXgiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJrZXlzIiwibXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlIiwibXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtIiwicGFyZW50UmVzb3VyY2VJZCIsImlkIiwibXVsdGlwbGVWYWx1ZUl0ZW0iLCJpbnNlcnRWYWx1ZXMiLCJ0ZXh0X3ZhbHVlIiwicmVjb3JkX2lkIiwicm93SUQiLCJyZWNvcmRfcmVzb3VyY2VfaWQiLCJwYXJlbnRfcmVzb3VyY2VfaWQiLCJmZWF0dXJlVmFsdWVzIiwibXVsdGlwbGVWYWx1ZXMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJyZXBvcnRfdXJsIiwiX3Byb2plY3RSb3dJRCIsInByb2plY3RfaWQiLCJwcm9qZWN0SUQiLCJwcm9qZWN0X3Jlc291cmNlX2lkIiwiX2Fzc2lnbmVkVG9Sb3dJRCIsImFzc2lnbmVkX3RvX2lkIiwiYXNzaWduZWRUb0lEIiwiYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQiLCJfY3JlYXRlZEJ5Um93SUQiLCJjcmVhdGVkX2J5X2lkIiwiY3JlYXRlZEJ5SUQiLCJjcmVhdGVkX2J5X3Jlc291cmNlX2lkIiwiX3VwZGF0ZWRCeVJvd0lEIiwidXBkYXRlZF9ieV9pZCIsInVwZGF0ZWRCeUlEIiwidXBkYXRlZF9ieV9yZXNvdXJjZV9pZCIsIl9jaGFuZ2VzZXRSb3dJRCIsImNoYW5nZXNldF9pZCIsImNoYW5nZXNldElEIiwiY2hhbmdlc2V0X3Jlc291cmNlX2lkIiwic3RhdHVzIiwibGF0aXR1ZGUiLCJsb25naXR1ZGUiLCJhbHRpdHVkZSIsInNwZWVkIiwiY291cnNlIiwidmVydGljYWxfYWNjdXJhY3kiLCJ2ZXJ0aWNhbEFjY3VyYWN5IiwiaG9yaXpvbnRhbF9hY2N1cmFjeSIsImhvcml6b250YWxBY2N1cmFjeSIsInJlc291cmNlX2lkIiwiaW5kZXgiLCJoYXNDb29yZGluYXRlIiwicmVjb3JkX3N0YXR1cyIsInJlY29yZF9wcm9qZWN0X2lkIiwicmVjb3JkX3Byb2plY3RfcmVzb3VyY2VfaWQiLCJyZWNvcmRfYXNzaWduZWRfdG9faWQiLCJyZWNvcmRfYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQiLCJjcmVhdGVkQnkiLCJ1cGRhdGVkQnkiLCJjaGFuZ2VzZXQiLCJ0aXRsZSIsImRpc3BsYXlWYWx1ZSIsImZvcm1fdmFsdWVzIiwidG9KU09OIiwic2V0dXBTZWFyY2giLCJnZW9tZXRyeSIsInNldHVwUG9pbnQiLCJjcmVhdGVkX2F0IiwiY2xpZW50Q3JlYXRlZEF0IiwiY3JlYXRlZEF0IiwidXBkYXRlZF9hdCIsImNsaWVudFVwZGF0ZWRBdCIsInVwZGF0ZWRBdCIsInZlcnNpb24iLCJzZXJ2ZXJfY3JlYXRlZF9hdCIsInNlcnZlcl91cGRhdGVkX2F0IiwiY3JlYXRlZF9kdXJhdGlvbiIsImNyZWF0ZWREdXJhdGlvbiIsInVwZGF0ZWRfZHVyYXRpb24iLCJ1cGRhdGVkRHVyYXRpb24iLCJlZGl0ZWRfZHVyYXRpb24iLCJlZGl0ZWREdXJhdGlvbiIsImNyZWF0ZWRfbGF0aXR1ZGUiLCJjcmVhdGVkTGF0aXR1ZGUiLCJjcmVhdGVkX2xvbmdpdHVkZSIsImNyZWF0ZWRMb25naXR1ZGUiLCJjcmVhdGVkX2FsdGl0dWRlIiwiY3JlYXRlZEFsdGl0dWRlIiwiY3JlYXRlZF9ob3Jpem9udGFsX2FjY3VyYWN5IiwiY3JlYXRlZEFjY3VyYWN5IiwiaGFzQ3JlYXRlZENvb3JkaW5hdGUiLCJjcmVhdGVkX2dlb21ldHJ5IiwidXBkYXRlZF9sYXRpdHVkZSIsInVwZGF0ZWRMYXRpdHVkZSIsInVwZGF0ZWRfbG9uZ2l0dWRlIiwidXBkYXRlZExvbmdpdHVkZSIsInVwZGF0ZWRfYWx0aXR1ZGUiLCJ1cGRhdGVkQWx0aXR1ZGUiLCJ1cGRhdGVkX2hvcml6b250YWxfYWNjdXJhY3kiLCJ1cGRhdGVkQWNjdXJhY3kiLCJoYXNVcGRhdGVkQ29vcmRpbmF0ZSIsInVwZGF0ZWRfZ2VvbWV0cnkiLCJkZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50IiwiZGVsZXRlU3RhdGVtZW50IiwiZGVsZXRlUm93c1N0YXRlbWVudCIsInJlcGVhdGFibGVzIiwiZWxlbWVudHNPZlR5cGUiLCJyZXBlYXRhYmxlIiwiZGVsZXRlRm9yRm9ybVN0YXRlbWVudHMiLCJzY2hlbWEiLCJfYWNjb3VudFJvd0lEIiwic2VhcmNoYWJsZVZhbHVlIiwicmVjb3JkX2luZGV4X3RleHQiLCJyZWNvcmRfaW5kZXgiLCJyYXciLCJ3a3QiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVlLE1BQU1BLFlBQU4sQ0FBbUI7QUFDaEMsU0FBT0MseUJBQVAsQ0FBaUNDLEVBQWpDLEVBQXFDQyxNQUFyQyxFQUE2Q0MsVUFBVSxFQUF2RCxFQUEyRDtBQUN6RCxVQUFNQyxhQUFhLEVBQW5COztBQUVBQSxlQUFXQyxJQUFYLENBQWdCQyxLQUFoQixDQUFzQkYsVUFBdEIsRUFBa0MsS0FBS0cseUJBQUwsQ0FBK0JOLEVBQS9CLEVBQW1DQyxNQUFuQyxFQUEyQ0EsT0FBT00sSUFBbEQsRUFBd0RMLE9BQXhELENBQWxDO0FBQ0FDLGVBQVdDLElBQVgsQ0FBZ0JDLEtBQWhCLENBQXNCRixVQUF0QixFQUFrQyxLQUFLSyx5QkFBTCxDQUErQlIsRUFBL0IsRUFBbUNDLE1BQW5DLEVBQTJDQSxPQUFPTSxJQUFsRCxFQUF3REwsT0FBeEQsQ0FBbEM7O0FBRUEsV0FBT0MsVUFBUDtBQUNEOztBQUVELFNBQU9LLHlCQUFQLENBQWlDUixFQUFqQyxFQUFxQ0MsTUFBckMsRUFBNkNNLElBQTdDLEVBQW1ETCxVQUFVLEVBQTdELEVBQWlFO0FBQy9ELFVBQU1DLGFBQWEsRUFBbkI7O0FBRUFBLGVBQVdDLElBQVgsQ0FBZ0IsS0FBS0ssNEJBQUwsQ0FBa0NULEVBQWxDLEVBQXNDTyxJQUF0QyxFQUE0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bkUsRUFBMEUrRixXQUFXakksR0FBckYsQ0FBUDtBQUNEOztBQUVELFNBQU9zRixXQUFQLENBQW1CMUcsTUFBbkIsRUFBMkJGLE9BQTNCLEVBQW9DO0FBQ2xDLFVBQU0ySixrQkFBa0IzSixRQUFRMkosZUFBaEM7O0FBRUF6SixXQUFPMEosaUJBQVAsR0FBMkJELGVBQTNCO0FBQ0F6SixXQUFPMkosWUFBUCxHQUFzQixFQUFDQyxLQUFNLGVBQWUsd0JBQVMsSUFBVCxFQUFlSCxlQUFmLENBQWlDLEdBQXZELEVBQXRCOztBQUVBLFdBQU96SixNQUFQO0FBQ0Q7O0FBRUQsU0FBTzRHLFVBQVAsQ0FBa0I1RyxNQUFsQixFQUEwQmtGLFFBQTFCLEVBQW9DQyxTQUFwQyxFQUErQztBQUM3QyxVQUFNMEUsTUFBTSx3QkFBUyxjQUFULEVBQXlCMUUsU0FBekIsRUFBb0NELFFBQXBDLENBQVo7O0FBRUEsV0FBTyxFQUFDMEUsS0FBTSwwQ0FBMENDLEdBQUssWUFBdEQsRUFBUDtBQUNEO0FBOWErQjtrQkFBYjlLLFkiLCJmaWxlIjoicmVjb3JkLXZhbHVlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IFJlY29yZCwgUmVwZWF0YWJsZUl0ZW1WYWx1ZSB9IGZyb20gJ2Z1bGNydW0tY29yZSc7XG5pbXBvcnQgcGdmb3JtYXQgZnJvbSAncGctZm9ybWF0JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkVmFsdWVzIHtcbiAgc3RhdGljIHVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMoZGIsIHJlY29yZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyhkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgb3B0aW9ucykpO1xuICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydEZvclJlY29yZFN0YXRlbWVudHMoZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIG9wdGlvbnMpKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIGluc2VydEZvclJlY29yZFN0YXRlbWVudHMoZGIsIHJlY29yZCwgZm9ybSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuaW5zZXJ0Um93Rm9yRmVhdHVyZVN0YXRlbWVudChkYiwgZm9ybSwgcmVjb3JkLCBudWxsLCByZWNvcmQsIG9wdGlvbnMpKTtcbiAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRDaGlsZEZlYXR1cmVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIHJlY29yZCwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVjb3JkLCByZWNvcmQsIG9wdGlvbnMpKTtcbiAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRDaGlsZE11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIHJlY29yZCwgcmVjb3JkLCBvcHRpb25zKSk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRSb3dGb3JGZWF0dXJlU3RhdGVtZW50KGRiLCBmb3JtLCBmZWF0dXJlLCBwYXJlbnRGZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMuY29sdW1uVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCBvcHRpb25zKTtcbiAgICBjb25zdCBzeXN0ZW1WYWx1ZXMgPSB0aGlzLnN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUoZmVhdHVyZSwgcGFyZW50RmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zKTtcblxuICAgIE9iamVjdC5hc3NpZ24odmFsdWVzLCBzeXN0ZW1WYWx1ZXMpO1xuXG4gICAgbGV0IHRhYmxlTmFtZSA9IG51bGw7XG5cbiAgICBpZiAoZmVhdHVyZSBpbnN0YW5jZW9mIFJlcGVhdGFibGVJdGVtVmFsdWUpIHtcbiAgICAgIC8vIFRPRE8oemhtKSBhZGQgcHVibGljIGludGVyZmFjZSBmb3IgYWNjZXNzaW5nIF9lbGVtZW50LCBsaWtlIGBnZXQgcmVwZWF0YWJsZUVsZW1lbnQoKWBcbiAgICAgIHRhYmxlTmFtZSA9IHRoaXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgZmVhdHVyZS5fZWxlbWVudCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhYmxlTmFtZSA9IHRoaXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgbnVsbCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudmFsdWVzVHJhbnNmb3JtZXIpIHtcbiAgICAgIG9wdGlvbnMudmFsdWVzVHJhbnNmb3JtZXIoe2RiLCBmb3JtLCBmZWF0dXJlLCBwYXJlbnRGZWF0dXJlLCByZWNvcmQsIHZhbHVlc30pO1xuICAgIH1cblxuICAgIHJldHVybiBkYi5pbnNlcnRTdGF0ZW1lbnQodGFibGVOYW1lLCB2YWx1ZXMsIHtwazogJ2lkJ30pO1xuICB9XG5cbiAgc3RhdGljIGluc2VydENoaWxkRmVhdHVyZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgZmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1WYWx1ZSBvZiBmZWF0dXJlLmZvcm1WYWx1ZXMuYWxsKSB7XG4gICAgICBpZiAoZm9ybVZhbHVlLmVsZW1lbnQuaXNSZXBlYXRhYmxlRWxlbWVudCkge1xuICAgICAgICAvLyBUT0RPKHpobSkgYWRkIHB1YmxpYyBpbnRlcmZhY2UgZm9yIF9pdGVtc1xuICAgICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGVJdGVtIG9mIGZvcm1WYWx1ZS5faXRlbXMpIHtcbiAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5pbnNlcnRSb3dGb3JGZWF0dXJlU3RhdGVtZW50KGRiLCBmb3JtLCByZXBlYXRhYmxlSXRlbSwgZmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZXBlYXRhYmxlSXRlbSwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBtYXliZUFzc2lnbkFycmF5KHZhbHVlcywga2V5LCB2YWx1ZSwgZGlzYWJsZUFycmF5cywgZGlzYWJsZUNvbXBsZXhUeXBlcykge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlzYWJsZWRBcnJheVZhbHVlID0gKF8uaXNBcnJheSh2YWx1ZSkgJiYgZGlzYWJsZUFycmF5cykgPyB2YWx1ZS5qb2luKCcsJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHZhbHVlO1xuXG4gICAgY29uc3QgaXNTaW1wbGUgPSBfLmlzTnVtYmVyKHZhbHVlKSB8fCBfLmlzU3RyaW5nKHZhbHVlKSB8fCBfLmlzRGF0ZSh2YWx1ZSkgfHwgXy5pc0Jvb2xlYW4odmFsdWUpO1xuXG4gICAgdmFsdWVzW2tleV0gPSAhaXNTaW1wbGUgJiYgZGlzYWJsZUNvbXBsZXhUeXBlcyA9PT0gdHJ1ZSA/IEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6IHZhbHVlO1xuICB9XG5cbiAgc3RhdGljIGNvbHVtblZhbHVlc0ZvckZlYXR1cmUoZmVhdHVyZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFsdWVzID0ge307XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1WYWx1ZSBvZiBmZWF0dXJlLmZvcm1WYWx1ZXMuYWxsKSB7XG4gICAgICBpZiAoZm9ybVZhbHVlLmlzRW1wdHkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBjb2x1bW5WYWx1ZSA9IGZvcm1WYWx1ZS5jb2x1bW5WYWx1ZTtcblxuICAgICAgaWYgKF8uaXNOdW1iZXIoY29sdW1uVmFsdWUpIHx8IF8uaXNTdHJpbmcoY29sdW1uVmFsdWUpIHx8IF8uaXNBcnJheShjb2x1bW5WYWx1ZSkgfHwgXy5pc0RhdGUoY29sdW1uVmFsdWUpKSB7XG4gICAgICAgIC8vIGRvbid0IGFsbG93IGRhdGVzIGdyZWF0ZXIgdGhhbiA5OTk5LCB5ZXMgLSB0aGV5IGV4aXN0IGluIHRoZSB3aWxkXG4gICAgICAgIGlmIChfLmlzRGF0ZShjb2x1bW5WYWx1ZSkpIHtcbiAgICAgICAgICBjb2x1bW5WYWx1ZSA9IGNvbHVtblZhbHVlLmdldEZ1bGxZZWFyKCkgPiA5OTk5ID8gbnVsbCA6IGZvcm1WYWx1ZS50ZXh0VmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1heWJlQXNzaWduQXJyYXkodmFsdWVzLCAnZicgKyBmb3JtVmFsdWUuZWxlbWVudC5rZXkudG9Mb3dlckNhc2UoKSwgY29sdW1uVmFsdWUsIG9wdGlvbnMuZGlzYWJsZUFycmF5cywgb3B0aW9ucy5kaXNhYmxlQ29tcGxleFR5cGVzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29sdW1uVmFsdWUpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGZvcm1WYWx1ZS5lbGVtZW50O1xuXG4gICAgICAgIGlmIChlbGVtZW50ICYmIG9wdGlvbnMubWVkaWFVUkxGb3JtYXR0ZXIpIHtcbiAgICAgICAgICBpZiAoZWxlbWVudC5pc1Bob3RvRWxlbWVudCB8fCBlbGVtZW50LmlzVmlkZW9FbGVtZW50IHx8IGVsZW1lbnQuaXNBdWRpb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZWZpeCA9ICdmJyArIGZvcm1WYWx1ZS5lbGVtZW50LmtleS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgICAgICBjb2x1bW5WYWx1ZVtwcmVmaXggKyAnX3VybHMnXSA9IG9wdGlvbnMubWVkaWFVUkxGb3JtYXR0ZXIoZm9ybVZhbHVlKTtcblxuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWVkaWFWaWV3VVJMRm9ybWF0dGVyKSB7XG4gICAgICAgICAgICAgIGNvbHVtblZhbHVlW3ByZWZpeCArICdfdmlld191cmwnXSA9IG9wdGlvbnMubWVkaWFWaWV3VVJMRm9ybWF0dGVyKGZvcm1WYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgYXJyYXkgdHlwZXMgYXJlIGRpc2FibGVkLCBjb252ZXJ0IGFsbCB0aGUgcHJvcHMgdG8gZGVsaW1pdGVkIHZhbHVlc1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjb2x1bW5WYWx1ZSkpIHtcbiAgICAgICAgICB0aGlzLm1heWJlQXNzaWduQXJyYXkoY29sdW1uVmFsdWUsIGtleSwgY29sdW1uVmFsdWVba2V5XSwgb3B0aW9ucy5kaXNhYmxlQXJyYXlzLCBvcHRpb25zLmRpc2FibGVDb21wbGV4VHlwZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbih2YWx1ZXMsIGNvbHVtblZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9XG5cbiAgc3RhdGljIGluc2VydE11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIGZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgY29uc3QgdmFsdWVzID0gdGhpcy5tdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmUoZmVhdHVyZSwgcmVjb3JkKTtcblxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHRoaXMubXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG9wdGlvbnMpO1xuXG4gICAgbGV0IHBhcmVudFJlc291cmNlSWQgPSBudWxsO1xuXG4gICAgaWYgKGZlYXR1cmUgaW5zdGFuY2VvZiBSZXBlYXRhYmxlSXRlbVZhbHVlKSB7XG4gICAgICBwYXJlbnRSZXNvdXJjZUlkID0gZmVhdHVyZS5pZDtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG11bHRpcGxlVmFsdWVJdGVtIG9mIHZhbHVlcykge1xuICAgICAgY29uc3QgaW5zZXJ0VmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwge2tleTogbXVsdGlwbGVWYWx1ZUl0ZW0uZWxlbWVudC5rZXksIHRleHRfdmFsdWU6IG11bHRpcGxlVmFsdWVJdGVtLnZhbHVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3JlY29yZF9pZDogcmVjb3JkLnJvd0lELCByZWNvcmRfcmVzb3VyY2VfaWQ6IHJlY29yZC5pZCwgcGFyZW50X3Jlc291cmNlX2lkOiBwYXJlbnRSZXNvdXJjZUlkfSk7XG5cbiAgICAgIHN0YXRlbWVudHMucHVzaChkYi5pbnNlcnRTdGF0ZW1lbnQodGFibGVOYW1lLCBpbnNlcnRWYWx1ZXMsIHtwazogJ2lkJ30pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRDaGlsZE11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIGZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBmb3JtVmFsdWUgb2YgZmVhdHVyZS5mb3JtVmFsdWVzLmFsbCkge1xuICAgICAgaWYgKGZvcm1WYWx1ZS5pc1JlcGVhdGFibGVFbGVtZW50KSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZUl0ZW0gb2YgZm9ybVZhbHVlLl9pdGVtcykge1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydE11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIHJlcGVhdGFibGVJdGVtLCByZWNvcmQsIG9wdGlvbnMpKTtcbiAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRDaGlsZE11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIHJlcGVhdGFibGVJdGVtLCByZWNvcmQsIG9wdGlvbnMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIG11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCByZWNvcmQpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgZm9ybVZhbHVlIG9mIGZlYXR1cmUuZm9ybVZhbHVlcy5hbGwpIHtcbiAgICAgIGlmIChmb3JtVmFsdWUuaXNFbXB0eSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmVhdHVyZVZhbHVlcyA9IGZvcm1WYWx1ZS5tdWx0aXBsZVZhbHVlcztcblxuICAgICAgaWYgKGZlYXR1cmVWYWx1ZXMpIHtcbiAgICAgICAgdmFsdWVzLnB1c2guYXBwbHkodmFsdWVzLCBmZWF0dXJlVmFsdWVzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9XG5cbiAgc3RhdGljIHN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUoZmVhdHVyZSwgcGFyZW50RmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSB7fTtcblxuICAgIHZhbHVlcy5yZWNvcmRfaWQgPSByZWNvcmQucm93SUQ7XG4gICAgdmFsdWVzLnJlY29yZF9yZXNvdXJjZV9pZCA9IHJlY29yZC5pZDtcblxuICAgIGlmIChvcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlcikge1xuICAgICAgdmFsdWVzLnJlcG9ydF91cmwgPSBvcHRpb25zLnJlcG9ydFVSTEZvcm1hdHRlcihmZWF0dXJlKTtcbiAgICB9XG5cbiAgICBpZiAoZmVhdHVyZSBpbnN0YW5jZW9mIFJlY29yZCkge1xuICAgICAgaWYgKHJlY29yZC5fcHJvamVjdFJvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5wcm9qZWN0X2lkID0gcmVjb3JkLl9wcm9qZWN0Um93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQucHJvamVjdElEKSB7XG4gICAgICAgIHZhbHVlcy5wcm9qZWN0X3Jlc291cmNlX2lkID0gcmVjb3JkLnByb2plY3RJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5fYXNzaWduZWRUb1Jvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5hc3NpZ25lZF90b19pZCA9IHJlY29yZC5fYXNzaWduZWRUb1Jvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLmFzc2lnbmVkVG9JRCkge1xuICAgICAgICB2YWx1ZXMuYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQgPSByZWNvcmQuYXNzaWduZWRUb0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9jcmVhdGVkQnlSb3dJRCkge1xuICAgICAgICB2YWx1ZXMuY3JlYXRlZF9ieV9pZCA9IHJlY29yZC5fY3JlYXRlZEJ5Um93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuY3JlYXRlZEJ5SUQpIHtcbiAgICAgICAgdmFsdWVzLmNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgPSByZWNvcmQuY3JlYXRlZEJ5SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX3VwZGF0ZWRCeVJvd0lEKSB7XG4gICAgICAgIHZhbHVlcy51cGRhdGVkX2J5X2lkID0gcmVjb3JkLl91cGRhdGVkQnlSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC51cGRhdGVkQnlJRCkge1xuICAgICAgICB2YWx1ZXMudXBkYXRlZF9ieV9yZXNvdXJjZV9pZCA9IHJlY29yZC51cGRhdGVkQnlJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5fY2hhbmdlc2V0Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9pZCA9IHJlY29yZC5fY2hhbmdlc2V0Um93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuY2hhbmdlc2V0SUQpIHtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9yZXNvdXJjZV9pZCA9IHJlY29yZC5jaGFuZ2VzZXRJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5zdGF0dXMpIHtcbiAgICAgICAgdmFsdWVzLnN0YXR1cyA9IHJlY29yZC5zdGF0dXM7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQubGF0aXR1ZGUgIT0gbnVsbCkge1xuICAgICAgICB2YWx1ZXMubGF0aXR1ZGUgPSByZWNvcmQubGF0aXR1ZGU7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQubG9uZ2l0dWRlICE9IG51bGwpIHtcbiAgICAgICAgdmFsdWVzLmxvbmdpdHVkZSA9IHJlY29yZC5sb25naXR1ZGU7XG4gICAgICB9XG5cbiAgICAgIHZhbHVlcy5hbHRpdHVkZSA9IHJlY29yZC5hbHRpdHVkZTtcbiAgICAgIHZhbHVlcy5zcGVlZCA9IHJlY29yZC5zcGVlZDtcbiAgICAgIHZhbHVlcy5jb3Vyc2UgPSByZWNvcmQuY291cnNlO1xuICAgICAgdmFsdWVzLnZlcnRpY2FsX2FjY3VyYWN5ID0gcmVjb3JkLnZlcnRpY2FsQWNjdXJhY3k7XG4gICAgICB2YWx1ZXMuaG9yaXpvbnRhbF9hY2N1cmFjeSA9IHJlY29yZC5ob3Jpem9udGFsQWNjdXJhY3k7XG4gICAgfSBlbHNlIGlmIChmZWF0dXJlIGluc3RhbmNlb2YgUmVwZWF0YWJsZUl0ZW1WYWx1ZSkge1xuICAgICAgdmFsdWVzLnJlc291cmNlX2lkID0gZmVhdHVyZS5pZDtcbiAgICAgIHZhbHVlcy5pbmRleCA9IGZlYXR1cmUuaW5kZXg7XG4gICAgICB2YWx1ZXMucGFyZW50X3Jlc291cmNlX2lkID0gcGFyZW50RmVhdHVyZS5pZDtcblxuICAgICAgaWYgKGZlYXR1cmUuaGFzQ29vcmRpbmF0ZSkge1xuICAgICAgICB2YWx1ZXMubGF0aXR1ZGUgPSBmZWF0dXJlLmxhdGl0dWRlO1xuICAgICAgICB2YWx1ZXMubG9uZ2l0dWRlID0gZmVhdHVyZS5sb25naXR1ZGU7XG4gICAgICB9XG5cbiAgICAgIC8vIHJlY29yZCB2YWx1ZXNcbiAgICAgIGlmIChyZWNvcmQuc3RhdHVzKSB7XG4gICAgICAgIHZhbHVlcy5yZWNvcmRfc3RhdHVzID0gcmVjb3JkLnN0YXR1cztcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5fcHJvamVjdFJvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5yZWNvcmRfcHJvamVjdF9pZCA9IHJlY29yZC5fcHJvamVjdFJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLnByb2plY3RJRCkge1xuICAgICAgICB2YWx1ZXMucmVjb3JkX3Byb2plY3RfcmVzb3VyY2VfaWQgPSByZWNvcmQucHJvamVjdElEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9hc3NpZ25lZFRvUm93SUQpIHtcbiAgICAgICAgdmFsdWVzLnJlY29yZF9hc3NpZ25lZF90b19pZCA9IHJlY29yZC5fYXNzaWduZWRUb1Jvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLmFzc2lnbmVkVG9JRCkge1xuICAgICAgICB2YWx1ZXMucmVjb3JkX2Fzc2lnbmVkX3RvX3Jlc291cmNlX2lkID0gcmVjb3JkLmFzc2lnbmVkVG9JRDtcbiAgICAgIH1cblxuICAgICAgLy8gbGlua2VkIGZpZWxkc1xuICAgICAgaWYgKGZlYXR1cmUuY3JlYXRlZEJ5KSB7XG4gICAgICAgIHZhbHVlcy5jcmVhdGVkX2J5X2lkID0gZmVhdHVyZS5jcmVhdGVkQnkucm93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChmZWF0dXJlLmNyZWF0ZWRCeUlEKSB7XG4gICAgICAgIHZhbHVlcy5jcmVhdGVkX2J5X3Jlc291cmNlX2lkID0gZmVhdHVyZS5jcmVhdGVkQnlJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKGZlYXR1cmUudXBkYXRlZEJ5KSB7XG4gICAgICAgIHZhbHVlcy51cGRhdGVkX2J5X2lkID0gZmVhdHVyZS51cGRhdGVkQnkucm93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChmZWF0dXJlLnVwZGF0ZWRCeUlEKSB7XG4gICAgICAgIHZhbHVlcy51cGRhdGVkX2J5X3Jlc291cmNlX2lkID0gZmVhdHVyZS51cGRhdGVkQnlJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKGZlYXR1cmUuY2hhbmdlc2V0KSB7XG4gICAgICAgIHZhbHVlcy5jaGFuZ2VzZXRfaWQgPSBmZWF0dXJlLmNoYW5nZXNldC5yb3dJRDtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9yZXNvdXJjZV9pZCA9IGZlYXR1cmUuY2hhbmdlc2V0SUQ7XG4gICAgICB9IGVsc2UgaWYgKHJlY29yZC5fY2hhbmdlc2V0Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9pZCA9IHJlY29yZC5fY2hhbmdlc2V0Um93SUQ7XG4gICAgICAgIHZhbHVlcy5jaGFuZ2VzZXRfcmVzb3VyY2VfaWQgPSByZWNvcmQuY2hhbmdlc2V0SUQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFsdWVzLnRpdGxlID0gZmVhdHVyZS5kaXNwbGF5VmFsdWU7XG5cbiAgICB2YWx1ZXMuZm9ybV92YWx1ZXMgPSBKU09OLnN0cmluZ2lmeShmZWF0dXJlLmZvcm1WYWx1ZXMudG9KU09OKCkpO1xuXG4gICAgdGhpcy5zZXR1cFNlYXJjaCh2YWx1ZXMsIGZlYXR1cmUsIG9wdGlvbnMpO1xuXG4gICAgaWYgKGZlYXR1cmUuaGFzQ29vcmRpbmF0ZSkge1xuICAgICAgdmFsdWVzLmdlb21ldHJ5ID0gdGhpcy5zZXR1cFBvaW50KHZhbHVlcywgZmVhdHVyZS5sYXRpdHVkZSwgZmVhdHVyZS5sb25naXR1ZGUsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZXMuZ2VvbWV0cnkgPSBudWxsO1xuICAgIH1cblxuICAgIHZhbHVlcy5jcmVhdGVkX2F0ID0gZmVhdHVyZS5jbGllbnRDcmVhdGVkQXQgfHwgZmVhdHVyZS5jcmVhdGVkQXQ7XG4gICAgdmFsdWVzLnVwZGF0ZWRfYXQgPSBmZWF0dXJlLmNsaWVudFVwZGF0ZWRBdCB8fCBmZWF0dXJlLnVwZGF0ZWRBdDtcbiAgICB2YWx1ZXMudmVyc2lvbiA9IGZlYXR1cmUudmVyc2lvbjtcblxuICAgIGlmICh2YWx1ZXMuY3JlYXRlZF9ieV9pZCA9PSBudWxsKSB7XG4gICAgICB2YWx1ZXMuY3JlYXRlZF9ieV9pZCA9IC0xO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZXMudXBkYXRlZF9ieV9pZCA9PSBudWxsKSB7XG4gICAgICB2YWx1ZXMudXBkYXRlZF9ieV9pZCA9IC0xO1xuICAgIH1cblxuICAgIHZhbHVlcy5zZXJ2ZXJfY3JlYXRlZF9hdCA9IGZlYXR1cmUuY3JlYXRlZEF0O1xuICAgIHZhbHVlcy5zZXJ2ZXJfdXBkYXRlZF9hdCA9IGZlYXR1cmUudXBkYXRlZEF0O1xuXG4gICAgdmFsdWVzLmNyZWF0ZWRfZHVyYXRpb24gPSBmZWF0dXJlLmNyZWF0ZWREdXJhdGlvbjtcbiAgICB2YWx1ZXMudXBkYXRlZF9kdXJhdGlvbiA9IGZlYXR1cmUudXBkYXRlZER1cmF0aW9uO1xuICAgIHZhbHVlcy5lZGl0ZWRfZHVyYXRpb24gPSBmZWF0dXJlLmVkaXRlZER1cmF0aW9uO1xuXG4gICAgdmFsdWVzLmNyZWF0ZWRfbGF0aXR1ZGUgPSBmZWF0dXJlLmNyZWF0ZWRMYXRpdHVkZTtcbiAgICB2YWx1ZXMuY3JlYXRlZF9sb25naXR1ZGUgPSBmZWF0dXJlLmNyZWF0ZWRMb25naXR1ZGU7XG4gICAgdmFsdWVzLmNyZWF0ZWRfYWx0aXR1ZGUgPSBmZWF0dXJlLmNyZWF0ZWRBbHRpdHVkZTtcbiAgICB2YWx1ZXMuY3JlYXRlZF9ob3Jpem9udGFsX2FjY3VyYWN5ID0gZmVhdHVyZS5jcmVhdGVkQWNjdXJhY3k7XG5cbiAgICBpZiAoZmVhdHVyZS5oYXNDcmVhdGVkQ29vcmRpbmF0ZSkge1xuICAgICAgdmFsdWVzLmNyZWF0ZWRfZ2VvbWV0cnkgPSB0aGlzLnNldHVwUG9pbnQodmFsdWVzLCBmZWF0dXJlLmNyZWF0ZWRMYXRpdHVkZSwgZmVhdHVyZS5jcmVhdGVkTG9uZ2l0dWRlLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICB2YWx1ZXMudXBkYXRlZF9sYXRpdHVkZSA9IGZlYXR1cmUudXBkYXRlZExhdGl0dWRlO1xuICAgIHZhbHVlcy51cGRhdGVkX2xvbmdpdHVkZSA9IGZlYXR1cmUudXBkYXRlZExvbmdpdHVkZTtcbiAgICB2YWx1ZXMudXBkYXRlZF9hbHRpdHVkZSA9IGZlYXR1cmUudXBkYXRlZEFsdGl0dWRlO1xuICAgIHZhbHVlcy51cGRhdGVkX2hvcml6b250YWxfYWNjdXJhY3kgPSBmZWF0dXJlLnVwZGF0ZWRBY2N1cmFjeTtcblxuICAgIGlmIChmZWF0dXJlLmhhc1VwZGF0ZWRDb29yZGluYXRlKSB7XG4gICAgICB2YWx1ZXMudXBkYXRlZF9nZW9tZXRyeSA9IHRoaXMuc2V0dXBQb2ludCh2YWx1ZXMsIGZlYXR1cmUudXBkYXRlZExhdGl0dWRlLCBmZWF0dXJlLnVwZGF0ZWRMb25naXR1ZGUsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH1cblxuICBzdGF0aWMgZGVsZXRlUm93c0ZvclJlY29yZFN0YXRlbWVudChkYiwgcmVjb3JkLCB0YWJsZU5hbWUpIHtcbiAgICByZXR1cm4gZGIuZGVsZXRlU3RhdGVtZW50KHRhYmxlTmFtZSwge3JlY29yZF9yZXNvdXJjZV9pZDogcmVjb3JkLmlkfSk7XG4gIH1cblxuICBzdGF0aWMgZGVsZXRlUm93c1N0YXRlbWVudChkYiwgdGFibGVOYW1lKSB7XG4gICAgcmV0dXJuIGRiLmRlbGV0ZVN0YXRlbWVudCh0YWJsZU5hbWUsIHt9KTtcbiAgfVxuXG4gIHN0YXRpYyBkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIGZvcm0sIG9wdGlvbnMpIHtcbiAgICBjb25zdCByZXBlYXRhYmxlcyA9IGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIGxldCB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG51bGwsIG9wdGlvbnMpO1xuXG4gICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuZGVsZXRlUm93c0ZvclJlY29yZFN0YXRlbWVudChkYiwgcmVjb3JkLCB0YWJsZU5hbWUpKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiByZXBlYXRhYmxlcykge1xuICAgICAgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlLCBvcHRpb25zKTtcblxuICAgICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuZGVsZXRlUm93c0ZvclJlY29yZFN0YXRlbWVudChkYiwgcmVjb3JkLCB0YWJsZU5hbWUpKTtcbiAgICB9XG5cbiAgICB0YWJsZU5hbWUgPSB0aGlzLm11bHRpcGxlVmFsdWVUYWJsZU5hbWVXaXRoRm9ybShmb3JtLCBvcHRpb25zKTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NGb3JSZWNvcmRTdGF0ZW1lbnQoZGIsIHJlY29yZCwgdGFibGVOYW1lKSk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBkZWxldGVGb3JGb3JtU3RhdGVtZW50cyhkYiwgZm9ybSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHJlcGVhdGFibGVzID0gZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgbGV0IHRhYmxlTmFtZSA9IHRoaXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgbnVsbCwgb3B0aW9ucyk7XG5cbiAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzU3RhdGVtZW50KGRiLCB0YWJsZU5hbWUpKTtcblxuICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZSBvZiByZXBlYXRhYmxlcykge1xuICAgICAgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlLCBvcHRpb25zKTtcblxuICAgICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuZGVsZXRlUm93c1N0YXRlbWVudChkYiwgdGFibGVOYW1lKSk7XG4gICAgfVxuXG4gICAgdGFibGVOYW1lID0gdGhpcy5tdWx0aXBsZVZhbHVlVGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgb3B0aW9ucyk7XG5cbiAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzU3RhdGVtZW50KGRiLCB0YWJsZU5hbWUpKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIG11bHRpcGxlVmFsdWVUYWJsZU5hbWVXaXRoRm9ybShmb3JtLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcHJlZml4ID0gb3B0aW9ucyAmJiBvcHRpb25zLnNjaGVtYSA/IG9wdGlvbnMuc2NoZW1hICsgJy4nIDogJyc7XG5cbiAgICByZXR1cm4gZm9ybWF0KCclc2FjY291bnRfJXNfZm9ybV8lc192YWx1ZXMnLCBwcmVmaXgsIGZvcm0uX2FjY291bnRSb3dJRCwgZm9ybS5yb3dJRCk7XG4gIH1cblxuICBzdGF0aWMgdGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHByZWZpeCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5zY2hlbWEgPyBvcHRpb25zLnNjaGVtYSArICcuJyA6ICcnO1xuXG4gICAgaWYgKHJlcGVhdGFibGUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZvcm1hdCgnJXNhY2NvdW50XyVzX2Zvcm1fJXMnLCBwcmVmaXgsIGZvcm0uX2FjY291bnRSb3dJRCwgZm9ybS5yb3dJRCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvcm1hdCgnJXNhY2NvdW50XyVzX2Zvcm1fJXNfJXMnLCBwcmVmaXgsIGZvcm0uX2FjY291bnRSb3dJRCwgZm9ybS5yb3dJRCwgcmVwZWF0YWJsZS5rZXkpO1xuICB9XG5cbiAgc3RhdGljIHNldHVwU2VhcmNoKHZhbHVlcywgZmVhdHVyZSkge1xuICAgIGNvbnN0IHNlYXJjaGFibGVWYWx1ZSA9IGZlYXR1cmUuc2VhcmNoYWJsZVZhbHVlO1xuXG4gICAgdmFsdWVzLnJlY29yZF9pbmRleF90ZXh0ID0gc2VhcmNoYWJsZVZhbHVlO1xuICAgIHZhbHVlcy5yZWNvcmRfaW5kZXggPSB7cmF3OiBgdG9fdHN2ZWN0b3IoJHsgcGdmb3JtYXQoJyVMJywgc2VhcmNoYWJsZVZhbHVlKSB9KWB9O1xuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHN0YXRpYyBzZXR1cFBvaW50KHZhbHVlcywgbGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICAgIGNvbnN0IHdrdCA9IHBnZm9ybWF0KCdQT0lOVCglcyAlcyknLCBsb25naXR1ZGUsIGxhdGl0dWRlKTtcblxuICAgIHJldHVybiB7cmF3OiBgU1RfRm9yY2UyRChTVF9TZXRTUklEKFNUX0dlb21Gcm9tVGV4dCgnJHsgd2t0IH0nKSwgNDMyNikpYH07XG4gIH1cbn1cbiJdfQ==