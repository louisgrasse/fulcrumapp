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
      tableName = this.tableNameWithFormAndSchema(form, feature._element, options);
    } else {
      tableName = this.tableNameWithFormAndSchema(form, null, options);
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

      const element = formValue.element;

      let columnValue = formValue.columnValue;

      if (_lodash2.default.isNumber(columnValue) || _lodash2.default.isString(columnValue) || _lodash2.default.isArray(columnValue) || _lodash2.default.isDate(columnValue)) {
        if (options.calculatedFieldDateFormat === 'date' && element.isCalculatedElement && element.display.isDate) {
          columnValue = _fulcrumCore.DateUtils.parseDate(formValue.textValue);
        }

        // don't allow dates greater than 9999, yes - they exist in the wild
        if (_lodash2.default.isDate(columnValue)) {
          columnValue = columnValue.getFullYear() > 9999 ? null : formValue.textValue;
        }

        this.maybeAssignArray(values, 'f' + formValue.element.key.toLowerCase(), columnValue, options.disableArrays, options.disableComplexTypes);
      } else if (columnValue) {

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

    let tableName = this.tableNameWithFormAndSchema(form, null, options);

    statements.push(this.deleteRowsForRecordStatement(db, record, tableName));

    for (const repeatable of repeatables) {
      tableName = this.tableNameWithFormAndSchema(form, repeatable, options);

      statements.push(this.deleteRowsForRecordStatement(db, record, tableName));
    }

    tableName = this.multipleValueTableNameWithForm(form, options);

    statements.push(this.deleteRowsForRecordStatement(db, record, tableName));

    return statements;
  }

  static deleteForFormStatements(db, form, options) {
    const repeatables = form.elementsOfType('Repeatable');

    const statements = [];

    let tableName = this.tableNameWithFormAndSchema(form, null, options);

    statements.push(this.deleteRowsStatement(db, tableName));

    for (const repeatable of repeatables) {
      tableName = this.tableNameWithFormAndSchema(form, repeatable, options);

      statements.push(this.deleteRowsStatement(db, tableName));
    }

    tableName = this.multipleValueTableNameWithForm(form, options);

    statements.push(this.deleteRowsStatement(db, tableName));

    return statements;
  }

  static multipleValueTableNameWithForm(form, options) {
    return this.tableNameWithFormAndSchema(form, null, options, '_values');
  }

  static tableNameWithFormAndSchema(form, repeatable, options, suffix) {
    const tableName = this.tableNameWithForm(form, repeatable, options);

    suffix = suffix || '';

    if (options.schema) {
      return options.escapeIdentifier(options.schema) + '.' + options.escapeIdentifier(tableName + suffix);
    }

    return options.escapeIdentifier(tableName + suffix);
  }

  static tableNameWithForm(form, repeatable, options) {
    if (repeatable == null) {
      return (0, _util.format)('%sform_%s', this.accountPrefix(form, options), this.formIdentifier(form, options));
    }

    return (0, _util.format)('%sform_%s_%s', this.accountPrefix(form, options), this.formIdentifier(form, options), repeatable.key);
  }

  static accountPrefix(form, options) {
    return options.accountPrefix != null ? 'account_' + form._accountRowID + '_' : '';
  }

  static formIdentifier(form, options) {
    return options.persistentTableNames ? form.id : form.rowID;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tYWluL21vZGVscy9yZWNvcmQtdmFsdWVzL3JlY29yZC12YWx1ZXMuanMiXSwibmFtZXMiOlsiUmVjb3JkVmFsdWVzIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsImRiIiwicmVjb3JkIiwib3B0aW9ucyIsInN0YXRlbWVudHMiLCJwdXNoIiwiYXBwbHkiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwiZm9ybSIsImluc2VydEZvclJlY29yZFN0YXRlbWVudHMiLCJpbnNlcnRSb3dGb3JGZWF0dXJlU3RhdGVtZW50IiwiaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzIiwiaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImZlYXR1cmUiLCJwYXJlbnRGZWF0dXJlIiwidmFsdWVzIiwiY29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJPYmplY3QiLCJhc3NpZ24iLCJ0YWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybUFuZFNjaGVtYSIsIl9lbGVtZW50IiwidmFsdWVzVHJhbnNmb3JtZXIiLCJpbnNlcnRTdGF0ZW1lbnQiLCJwayIsImZvcm1WYWx1ZSIsImZvcm1WYWx1ZXMiLCJhbGwiLCJlbGVtZW50IiwiaXNSZXBlYXRhYmxlRWxlbWVudCIsInJlcGVhdGFibGVJdGVtIiwiX2l0ZW1zIiwibWF5YmVBc3NpZ25BcnJheSIsImtleSIsInZhbHVlIiwiZGlzYWJsZUFycmF5cyIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJkaXNhYmxlZEFycmF5VmFsdWUiLCJpc0FycmF5Iiwiam9pbiIsImlzU2ltcGxlIiwiaXNOdW1iZXIiLCJpc1N0cmluZyIsImlzRGF0ZSIsImlzQm9vbGVhbiIsIkpTT04iLCJzdHJpbmdpZnkiLCJpc0VtcHR5IiwiY29sdW1uVmFsdWUiLCJjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0IiwiaXNDYWxjdWxhdGVkRWxlbWVudCIsImRpc3BsYXkiLCJwYXJzZURhdGUiLCJ0ZXh0VmFsdWUiLCJnZXRGdWxsWWVhciIsInRvTG93ZXJDYXNlIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJpc1Bob3RvRWxlbWVudCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJwcmVmaXgiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJrZXlzIiwibXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlIiwibXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtIiwicGFyZW50UmVzb3VyY2VJZCIsImlkIiwibXVsdGlwbGVWYWx1ZUl0ZW0iLCJpbnNlcnRWYWx1ZXMiLCJ0ZXh0X3ZhbHVlIiwicmVjb3JkX2lkIiwicm93SUQiLCJyZWNvcmRfcmVzb3VyY2VfaWQiLCJwYXJlbnRfcmVzb3VyY2VfaWQiLCJmZWF0dXJlVmFsdWVzIiwibXVsdGlwbGVWYWx1ZXMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJyZXBvcnRfdXJsIiwiX3Byb2plY3RSb3dJRCIsInByb2plY3RfaWQiLCJwcm9qZWN0SUQiLCJwcm9qZWN0X3Jlc291cmNlX2lkIiwiX2Fzc2lnbmVkVG9Sb3dJRCIsImFzc2lnbmVkX3RvX2lkIiwiYXNzaWduZWRUb0lEIiwiYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQiLCJfY3JlYXRlZEJ5Um93SUQiLCJjcmVhdGVkX2J5X2lkIiwiY3JlYXRlZEJ5SUQiLCJjcmVhdGVkX2J5X3Jlc291cmNlX2lkIiwiX3VwZGF0ZWRCeVJvd0lEIiwidXBkYXRlZF9ieV9pZCIsInVwZGF0ZWRCeUlEIiwidXBkYXRlZF9ieV9yZXNvdXJjZV9pZCIsIl9jaGFuZ2VzZXRSb3dJRCIsImNoYW5nZXNldF9pZCIsImNoYW5nZXNldElEIiwiY2hhbmdlc2V0X3Jlc291cmNlX2lkIiwic3RhdHVzIiwibGF0aXR1ZGUiLCJsb25naXR1ZGUiLCJhbHRpdHVkZSIsInNwZWVkIiwiY291cnNlIiwidmVydGljYWxfYWNjdXJhY3kiLCJ2ZXJ0aWNhbEFjY3VyYWN5IiwiaG9yaXpvbnRhbF9hY2N1cmFjeSIsImhvcml6b250YWxBY2N1cmFjeSIsInJlc291cmNlX2lkIiwiaW5kZXgiLCJoYXNDb29yZGluYXRlIiwicmVjb3JkX3N0YXR1cyIsInJlY29yZF9wcm9qZWN0X2lkIiwicmVjb3JkX3Byb2plY3RfcmVzb3VyY2VfaWQiLCJyZWNvcmRfYXNzaWduZWRfdG9faWQiLCJyZWNvcmRfYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQiLCJjcmVhdGVkQnkiLCJ1cGRhdGVkQnkiLCJjaGFuZ2VzZXQiLCJ0aXRsZSIsImRpc3BsYXlWYWx1ZSIsImZvcm1fdmFsdWVzIiwidG9KU09OIiwic2V0dXBTZWFyY2giLCJnZW9tZXRyeSIsInNldHVwUG9pbnQiLCJjcmVhdGVkX2F0IiwiY2xpZW50Q3JlYXRlZEF0IiwiY3JlYXRlZEF0IiwidXBkYXRlZF9hdCIsImNsaWVudFVwZGF0ZWRBdCIsInVwZGF0ZWRBdCIsInZlcnNpb24iLCJzZXJ2ZXJfY3JlYXRlZF9hdCIsInNlcnZlcl91cGRhdGVkX2F0IiwiY3JlYXRlZF9kdXJhdGlvbiIsImNyZWF0ZWREdXJhdGlvbiIsInVwZGF0ZWRfZHVyYXRpb24iLCJ1cGRhdGVkRHVyYXRpb24iLCJlZGl0ZWRfZHVyYXRpb24iLCJlZGl0ZWREdXJhdGlvbiIsImNyZWF0ZWRfbGF0aXR1ZGUiLCJjcmVhdGVkTGF0aXR1ZGUiLCJjcmVhdGVkX2xvbmdpdHVkZSIsImNyZWF0ZWRMb25naXR1ZGUiLCJjcmVhdGVkX2FsdGl0dWRlIiwiY3JlYXRlZEFsdGl0dWRlIiwiY3JlYXRlZF9ob3Jpem9udGFsX2FjY3VyYWN5IiwiY3JlYXRlZEFjY3VyYWN5IiwiaGFzQ3JlYXRlZENvb3JkaW5hdGUiLCJjcmVhdGVkX2dlb21ldHJ5IiwidXBkYXRlZF9sYXRpdHVkZSIsInVwZGF0ZWRMYXRpdHVkZSIsInVwZGF0ZWRfbG9uZ2l0dWRlIiwidXBkYXRlZExvbmdpdHVkZSIsInVwZGF0ZWRfYWx0aXR1ZGUiLCJ1cGRhdGVkQWx0aXR1ZGUiLCJ1cGRhdGVkX2hvcml6b250YWxfYWNjdXJhY3kiLCJ1cGRhdGVkQWNjdXJhY3kiLCJoYXNVcGRhdGVkQ29vcmRpbmF0ZSIsInVwZGF0ZWRfZ2VvbWV0cnkiLCJkZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50IiwiZGVsZXRlU3RhdGVtZW50IiwiZGVsZXRlUm93c1N0YXRlbWVudCIsInJlcGVhdGFibGVzIiwiZWxlbWVudHNPZlR5cGUiLCJyZXBlYXRhYmxlIiwiZGVsZXRlRm9yRm9ybVN0YXRlbWVudHMiLCJzdWZmaXgiLCJ0YWJsZU5hbWVXaXRoRm9ybSIsInNjaGVtYSIsImVzY2FwZUlkZW50aWZpZXIiLCJhY2NvdW50UHJlZml4IiwiZm9ybUlkZW50aWZpZXIiLCJfYWNjb3VudFJvd0lEIiwicGVyc2lzdGVudFRhYmxlTmFtZXMiLCJzZWFyY2hhYmxlVmFsdWUiLCJyZWNvcmRfaW5kZXhfdGV4dCIsInJlY29yZF9pbmRleCIsInJhdyIsIndrdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7O0FBRWUsTUFBTUEsWUFBTixDQUFtQjtBQUNoQyxTQUFPQyx5QkFBUCxDQUFpQ0MsRUFBakMsRUFBcUNDLE1BQXJDLEVBQTZDQyxVQUFVLEVBQXZELEVBQTJEO0FBQ3pELFVBQU1DLGFBQWEsRUFBbkI7O0FBRUFBLGVBQVdDLElBQVgsQ0FBZ0JDLEtBQWhCLENBQXNCRixVQUF0QixFQUFrQyxLQUFLRyx5QkFBTCxDQUErQk4sRUFBL0IsRUFBbUNDLE1BQW5DLEVBQTJDQSxPQUFPTSxJQUFsRCxFQUF3REwsT0FBeEQsQ0FBbEM7QUFDQUMsZUFBV0MsSUFBWCxDQUFnQkMsS0FBaEIsQ0FBc0JGLFVBQXRCLEVBQWtDLEtBQUtLLHlCQUFMLENBQStCUixFQUEvQixFQUFtQ0MsTUFBbkMsRUFBMkNBLE9BQU9NLElBQWxELEVBQXdETCxPQUF4RCxDQUFsQzs7QUFFQSxX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QStCMUssS0FBSzZELEVBQXBDLEdBQXlDN0QsS0FBS2tFLEtBQXJEO0FBQ0Q7O0FBRUQsU0FBT29ELFdBQVAsQ0FBbUI5RyxNQUFuQixFQUEyQkYsT0FBM0IsRUFBb0M7QUFDbEMsVUFBTXFLLGtCQUFrQnJLLFFBQVFxSyxlQUFoQzs7QUFFQW5LLFdBQU9vSyxpQkFBUCxHQUEyQkQsZUFBM0I7QUFDQW5LLFdBQU9xSyxZQUFQLEdBQXNCLEVBQUNDLEtBQU0sZUFBZSx3QkFBUyxJQUFULEVBQWVILGVBQWYsQ0FBaUMsR0FBdkQsRUFBdEI7O0FBRUEsV0FBT25LLE1BQVA7QUFDRDs7QUFFRCxTQUFPZ0gsVUFBUCxDQUFrQmhILE1BQWxCLEVBQTBCc0YsUUFBMUIsRUFBb0NDLFNBQXBDLEVBQStDO0FBQzdDLFVBQU1nRixNQUFNLHdCQUFTLGNBQVQsRUFBeUJoRixTQUF6QixFQUFvQ0QsUUFBcEMsQ0FBWjs7QUFFQSxXQUFPLEVBQUNnRixLQUFNLDBDQUEwQ0MsR0FBSyxZQUF0RCxFQUFQO0FBQ0Q7QUFuYytCO2tCQUFieEwsWSIsImZpbGUiOiJyZWNvcmQtdmFsdWVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgUmVjb3JkLCBSZXBlYXRhYmxlSXRlbVZhbHVlLCBEYXRlVXRpbHMgfSBmcm9tICdmdWxjcnVtLWNvcmUnO1xuaW1wb3J0IHBnZm9ybWF0IGZyb20gJ3BnLWZvcm1hdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZFZhbHVlcyB7XG4gIHN0YXRpYyB1cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMoZGIsIHJlY29yZCwgcmVjb3JkLmZvcm0sIG9wdGlvbnMpKTtcbiAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIHJlY29yZC5mb3JtLCBvcHRpb25zKSk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIGZvcm0sIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmluc2VydFJvd0ZvckZlYXR1cmVTdGF0ZW1lbnQoZGIsIGZvcm0sIHJlY29yZCwgbnVsbCwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZWNvcmQsIHJlY29yZCwgb3B0aW9ucykpO1xuICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydE11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIHJlY29yZCwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0Q2hpbGRNdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZWNvcmQsIHJlY29yZCwgb3B0aW9ucykpO1xuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0Um93Rm9yRmVhdHVyZVN0YXRlbWVudChkYiwgZm9ybSwgZmVhdHVyZSwgcGFyZW50RmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLmNvbHVtblZhbHVlc0ZvckZlYXR1cmUoZmVhdHVyZSwgb3B0aW9ucyk7XG4gICAgY29uc3Qgc3lzdGVtVmFsdWVzID0gdGhpcy5zeXN0ZW1Db2x1bW5WYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIHBhcmVudEZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyk7XG5cbiAgICBPYmplY3QuYXNzaWduKHZhbHVlcywgc3lzdGVtVmFsdWVzKTtcblxuICAgIGxldCB0YWJsZU5hbWUgPSBudWxsO1xuXG4gICAgaWYgKGZlYXR1cmUgaW5zdGFuY2VvZiBSZXBlYXRhYmxlSXRlbVZhbHVlKSB7XG4gICAgICAvLyBUT0RPKHpobSkgYWRkIHB1YmxpYyBpbnRlcmZhY2UgZm9yIGFjY2Vzc2luZyBfZWxlbWVudCwgbGlrZSBgZ2V0IHJlcGVhdGFibGVFbGVtZW50KClgXG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtQW5kU2NoZW1hKGZvcm0sIGZlYXR1cmUuX2VsZW1lbnQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtQW5kU2NoZW1hKGZvcm0sIG51bGwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnZhbHVlc1RyYW5zZm9ybWVyKSB7XG4gICAgICBvcHRpb25zLnZhbHVlc1RyYW5zZm9ybWVyKHtkYiwgZm9ybSwgZmVhdHVyZSwgcGFyZW50RmVhdHVyZSwgcmVjb3JkLCB2YWx1ZXN9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGIuaW5zZXJ0U3RhdGVtZW50KHRhYmxlTmFtZSwgdmFsdWVzLCB7cGs6ICdpZCd9KTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRDaGlsZEZlYXR1cmVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIGZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBmb3JtVmFsdWUgb2YgZmVhdHVyZS5mb3JtVmFsdWVzLmFsbCkge1xuICAgICAgaWYgKGZvcm1WYWx1ZS5lbGVtZW50LmlzUmVwZWF0YWJsZUVsZW1lbnQpIHtcbiAgICAgICAgLy8gVE9ETyh6aG0pIGFkZCBwdWJsaWMgaW50ZXJmYWNlIGZvciBfaXRlbXNcbiAgICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlSXRlbSBvZiBmb3JtVmFsdWUuX2l0ZW1zKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuaW5zZXJ0Um93Rm9yRmVhdHVyZVN0YXRlbWVudChkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIGZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydENoaWxkRmVhdHVyZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgbWF5YmVBc3NpZ25BcnJheSh2YWx1ZXMsIGtleSwgdmFsdWUsIGRpc2FibGVBcnJheXMsIGRpc2FibGVDb21wbGV4VHlwZXMpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc2FibGVkQXJyYXlWYWx1ZSA9IChfLmlzQXJyYXkodmFsdWUpICYmIGRpc2FibGVBcnJheXMpID8gdmFsdWUuam9pbignLCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB2YWx1ZTtcblxuICAgIGNvbnN0IGlzU2ltcGxlID0gXy5pc051bWJlcih2YWx1ZSkgfHwgXy5pc1N0cmluZyh2YWx1ZSkgfHwgXy5pc0RhdGUodmFsdWUpIHx8IF8uaXNCb29sZWFuKHZhbHVlKTtcblxuICAgIHZhbHVlc1trZXldID0gIWlzU2ltcGxlICYmIGRpc2FibGVDb21wbGV4VHlwZXMgPT09IHRydWUgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZTtcbiAgfVxuXG4gIHN0YXRpYyBjb2x1bW5WYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZhbHVlcyA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBmb3JtVmFsdWUgb2YgZmVhdHVyZS5mb3JtVmFsdWVzLmFsbCkge1xuICAgICAgaWYgKGZvcm1WYWx1ZS5pc0VtcHR5KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGVtZW50ID0gZm9ybVZhbHVlLmVsZW1lbnQ7XG5cbiAgICAgIGxldCBjb2x1bW5WYWx1ZSA9IGZvcm1WYWx1ZS5jb2x1bW5WYWx1ZTtcblxuICAgICAgaWYgKF8uaXNOdW1iZXIoY29sdW1uVmFsdWUpIHx8IF8uaXNTdHJpbmcoY29sdW1uVmFsdWUpIHx8IF8uaXNBcnJheShjb2x1bW5WYWx1ZSkgfHwgXy5pc0RhdGUoY29sdW1uVmFsdWUpKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNhbGN1bGF0ZWRGaWVsZERhdGVGb3JtYXQgPT09ICdkYXRlJyAmJiBlbGVtZW50LmlzQ2FsY3VsYXRlZEVsZW1lbnQgJiYgZWxlbWVudC5kaXNwbGF5LmlzRGF0ZSkge1xuICAgICAgICAgIGNvbHVtblZhbHVlID0gRGF0ZVV0aWxzLnBhcnNlRGF0ZShmb3JtVmFsdWUudGV4dFZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRvbid0IGFsbG93IGRhdGVzIGdyZWF0ZXIgdGhhbiA5OTk5LCB5ZXMgLSB0aGV5IGV4aXN0IGluIHRoZSB3aWxkXG4gICAgICAgIGlmIChfLmlzRGF0ZShjb2x1bW5WYWx1ZSkpIHtcbiAgICAgICAgICBjb2x1bW5WYWx1ZSA9IGNvbHVtblZhbHVlLmdldEZ1bGxZZWFyKCkgPiA5OTk5ID8gbnVsbCA6IGZvcm1WYWx1ZS50ZXh0VmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1heWJlQXNzaWduQXJyYXkodmFsdWVzLCAnZicgKyBmb3JtVmFsdWUuZWxlbWVudC5rZXkudG9Mb3dlckNhc2UoKSwgY29sdW1uVmFsdWUsIG9wdGlvbnMuZGlzYWJsZUFycmF5cywgb3B0aW9ucy5kaXNhYmxlQ29tcGxleFR5cGVzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29sdW1uVmFsdWUpIHtcblxuICAgICAgICBpZiAoZWxlbWVudCAmJiBvcHRpb25zLm1lZGlhVVJMRm9ybWF0dGVyKSB7XG4gICAgICAgICAgaWYgKGVsZW1lbnQuaXNQaG90b0VsZW1lbnQgfHwgZWxlbWVudC5pc1ZpZGVvRWxlbWVudCB8fCBlbGVtZW50LmlzQXVkaW9FbGVtZW50KSB7XG4gICAgICAgICAgICBjb25zdCBwcmVmaXggPSAnZicgKyBmb3JtVmFsdWUuZWxlbWVudC5rZXkudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAgICAgY29sdW1uVmFsdWVbcHJlZml4ICsgJ191cmxzJ10gPSBvcHRpb25zLm1lZGlhVVJMRm9ybWF0dGVyKGZvcm1WYWx1ZSk7XG5cbiAgICAgICAgICAgIGlmIChvcHRpb25zLm1lZGlhVmlld1VSTEZvcm1hdHRlcikge1xuICAgICAgICAgICAgICBjb2x1bW5WYWx1ZVtwcmVmaXggKyAnX3ZpZXdfdXJsJ10gPSBvcHRpb25zLm1lZGlhVmlld1VSTEZvcm1hdHRlcihmb3JtVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGFycmF5IHR5cGVzIGFyZSBkaXNhYmxlZCwgY29udmVydCBhbGwgdGhlIHByb3BzIHRvIGRlbGltaXRlZCB2YWx1ZXNcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY29sdW1uVmFsdWUpKSB7XG4gICAgICAgICAgdGhpcy5tYXliZUFzc2lnbkFycmF5KGNvbHVtblZhbHVlLCBrZXksIGNvbHVtblZhbHVlW2tleV0sIG9wdGlvbnMuZGlzYWJsZUFycmF5cywgb3B0aW9ucy5kaXNhYmxlQ29tcGxleFR5cGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24odmFsdWVzLCBjb2x1bW5WYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRNdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCBmZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMubXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIHJlY29yZCk7XG5cbiAgICBjb25zdCB0YWJsZU5hbWUgPSB0aGlzLm11bHRpcGxlVmFsdWVUYWJsZU5hbWVXaXRoRm9ybShmb3JtLCBvcHRpb25zKTtcblxuICAgIGxldCBwYXJlbnRSZXNvdXJjZUlkID0gbnVsbDtcblxuICAgIGlmIChmZWF0dXJlIGluc3RhbmNlb2YgUmVwZWF0YWJsZUl0ZW1WYWx1ZSkge1xuICAgICAgcGFyZW50UmVzb3VyY2VJZCA9IGZlYXR1cmUuaWQ7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBtdWx0aXBsZVZhbHVlSXRlbSBvZiB2YWx1ZXMpIHtcbiAgICAgIGNvbnN0IGluc2VydFZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIHtrZXk6IG11bHRpcGxlVmFsdWVJdGVtLmVsZW1lbnQua2V5LCB0ZXh0X3ZhbHVlOiBtdWx0aXBsZVZhbHVlSXRlbS52YWx1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtyZWNvcmRfaWQ6IHJlY29yZC5yb3dJRCwgcmVjb3JkX3Jlc291cmNlX2lkOiByZWNvcmQuaWQsIHBhcmVudF9yZXNvdXJjZV9pZDogcGFyZW50UmVzb3VyY2VJZH0pO1xuXG4gICAgICBzdGF0ZW1lbnRzLnB1c2goZGIuaW5zZXJ0U3RhdGVtZW50KHRhYmxlTmFtZSwgaW5zZXJ0VmFsdWVzLCB7cGs6ICdpZCd9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0Q2hpbGRNdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCBmZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgZm9ybVZhbHVlIG9mIGZlYXR1cmUuZm9ybVZhbHVlcy5hbGwpIHtcbiAgICAgIGlmIChmb3JtVmFsdWUuaXNSZXBlYXRhYmxlRWxlbWVudCkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGVJdGVtIG9mIGZvcm1WYWx1ZS5faXRlbXMpIHtcbiAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRNdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZXBlYXRhYmxlSXRlbSwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0Q2hpbGRNdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZXBlYXRhYmxlSXRlbSwgcmVjb3JkLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBtdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmUoZmVhdHVyZSwgcmVjb3JkKSB7XG4gICAgY29uc3QgdmFsdWVzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1WYWx1ZSBvZiBmZWF0dXJlLmZvcm1WYWx1ZXMuYWxsKSB7XG4gICAgICBpZiAoZm9ybVZhbHVlLmlzRW1wdHkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZlYXR1cmVWYWx1ZXMgPSBmb3JtVmFsdWUubXVsdGlwbGVWYWx1ZXM7XG5cbiAgICAgIGlmIChmZWF0dXJlVmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5wdXNoLmFwcGx5KHZhbHVlcywgZmVhdHVyZVZhbHVlcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHN0YXRpYyBzeXN0ZW1Db2x1bW5WYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIHBhcmVudEZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFsdWVzID0ge307XG5cbiAgICB2YWx1ZXMucmVjb3JkX2lkID0gcmVjb3JkLnJvd0lEO1xuICAgIHZhbHVlcy5yZWNvcmRfcmVzb3VyY2VfaWQgPSByZWNvcmQuaWQ7XG5cbiAgICBpZiAob3B0aW9ucy5yZXBvcnRVUkxGb3JtYXR0ZXIpIHtcbiAgICAgIHZhbHVlcy5yZXBvcnRfdXJsID0gb3B0aW9ucy5yZXBvcnRVUkxGb3JtYXR0ZXIoZmVhdHVyZSk7XG4gICAgfVxuXG4gICAgaWYgKGZlYXR1cmUgaW5zdGFuY2VvZiBSZWNvcmQpIHtcbiAgICAgIGlmIChyZWNvcmQuX3Byb2plY3RSb3dJRCkge1xuICAgICAgICB2YWx1ZXMucHJvamVjdF9pZCA9IHJlY29yZC5fcHJvamVjdFJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLnByb2plY3RJRCkge1xuICAgICAgICB2YWx1ZXMucHJvamVjdF9yZXNvdXJjZV9pZCA9IHJlY29yZC5wcm9qZWN0SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX2Fzc2lnbmVkVG9Sb3dJRCkge1xuICAgICAgICB2YWx1ZXMuYXNzaWduZWRfdG9faWQgPSByZWNvcmQuX2Fzc2lnbmVkVG9Sb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5hc3NpZ25lZFRvSUQpIHtcbiAgICAgICAgdmFsdWVzLmFzc2lnbmVkX3RvX3Jlc291cmNlX2lkID0gcmVjb3JkLmFzc2lnbmVkVG9JRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5fY3JlYXRlZEJ5Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLmNyZWF0ZWRfYnlfaWQgPSByZWNvcmQuX2NyZWF0ZWRCeVJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLmNyZWF0ZWRCeUlEKSB7XG4gICAgICAgIHZhbHVlcy5jcmVhdGVkX2J5X3Jlc291cmNlX2lkID0gcmVjb3JkLmNyZWF0ZWRCeUlEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl91cGRhdGVkQnlSb3dJRCkge1xuICAgICAgICB2YWx1ZXMudXBkYXRlZF9ieV9pZCA9IHJlY29yZC5fdXBkYXRlZEJ5Um93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQudXBkYXRlZEJ5SUQpIHtcbiAgICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgPSByZWNvcmQudXBkYXRlZEJ5SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX2NoYW5nZXNldFJvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5jaGFuZ2VzZXRfaWQgPSByZWNvcmQuX2NoYW5nZXNldFJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLmNoYW5nZXNldElEKSB7XG4gICAgICAgIHZhbHVlcy5jaGFuZ2VzZXRfcmVzb3VyY2VfaWQgPSByZWNvcmQuY2hhbmdlc2V0SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuc3RhdHVzKSB7XG4gICAgICAgIHZhbHVlcy5zdGF0dXMgPSByZWNvcmQuc3RhdHVzO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLmxhdGl0dWRlICE9IG51bGwpIHtcbiAgICAgICAgdmFsdWVzLmxhdGl0dWRlID0gcmVjb3JkLmxhdGl0dWRlO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLmxvbmdpdHVkZSAhPSBudWxsKSB7XG4gICAgICAgIHZhbHVlcy5sb25naXR1ZGUgPSByZWNvcmQubG9uZ2l0dWRlO1xuICAgICAgfVxuXG4gICAgICB2YWx1ZXMuYWx0aXR1ZGUgPSByZWNvcmQuYWx0aXR1ZGU7XG4gICAgICB2YWx1ZXMuc3BlZWQgPSByZWNvcmQuc3BlZWQ7XG4gICAgICB2YWx1ZXMuY291cnNlID0gcmVjb3JkLmNvdXJzZTtcbiAgICAgIHZhbHVlcy52ZXJ0aWNhbF9hY2N1cmFjeSA9IHJlY29yZC52ZXJ0aWNhbEFjY3VyYWN5O1xuICAgICAgdmFsdWVzLmhvcml6b250YWxfYWNjdXJhY3kgPSByZWNvcmQuaG9yaXpvbnRhbEFjY3VyYWN5O1xuICAgIH0gZWxzZSBpZiAoZmVhdHVyZSBpbnN0YW5jZW9mIFJlcGVhdGFibGVJdGVtVmFsdWUpIHtcbiAgICAgIHZhbHVlcy5yZXNvdXJjZV9pZCA9IGZlYXR1cmUuaWQ7XG4gICAgICB2YWx1ZXMuaW5kZXggPSBmZWF0dXJlLmluZGV4O1xuICAgICAgdmFsdWVzLnBhcmVudF9yZXNvdXJjZV9pZCA9IHBhcmVudEZlYXR1cmUuaWQ7XG5cbiAgICAgIGlmIChmZWF0dXJlLmhhc0Nvb3JkaW5hdGUpIHtcbiAgICAgICAgdmFsdWVzLmxhdGl0dWRlID0gZmVhdHVyZS5sYXRpdHVkZTtcbiAgICAgICAgdmFsdWVzLmxvbmdpdHVkZSA9IGZlYXR1cmUubG9uZ2l0dWRlO1xuICAgICAgfVxuXG4gICAgICAvLyByZWNvcmQgdmFsdWVzXG4gICAgICBpZiAocmVjb3JkLnN0YXR1cykge1xuICAgICAgICB2YWx1ZXMucmVjb3JkX3N0YXR1cyA9IHJlY29yZC5zdGF0dXM7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX3Byb2plY3RSb3dJRCkge1xuICAgICAgICB2YWx1ZXMucmVjb3JkX3Byb2plY3RfaWQgPSByZWNvcmQuX3Byb2plY3RSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5wcm9qZWN0SUQpIHtcbiAgICAgICAgdmFsdWVzLnJlY29yZF9wcm9qZWN0X3Jlc291cmNlX2lkID0gcmVjb3JkLnByb2plY3RJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5fYXNzaWduZWRUb1Jvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5yZWNvcmRfYXNzaWduZWRfdG9faWQgPSByZWNvcmQuX2Fzc2lnbmVkVG9Sb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5hc3NpZ25lZFRvSUQpIHtcbiAgICAgICAgdmFsdWVzLnJlY29yZF9hc3NpZ25lZF90b19yZXNvdXJjZV9pZCA9IHJlY29yZC5hc3NpZ25lZFRvSUQ7XG4gICAgICB9XG5cbiAgICAgIC8vIGxpbmtlZCBmaWVsZHNcbiAgICAgIGlmIChmZWF0dXJlLmNyZWF0ZWRCeSkge1xuICAgICAgICB2YWx1ZXMuY3JlYXRlZF9ieV9pZCA9IGZlYXR1cmUuY3JlYXRlZEJ5LnJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmVhdHVyZS5jcmVhdGVkQnlJRCkge1xuICAgICAgICB2YWx1ZXMuY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCA9IGZlYXR1cmUuY3JlYXRlZEJ5SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChmZWF0dXJlLnVwZGF0ZWRCeSkge1xuICAgICAgICB2YWx1ZXMudXBkYXRlZF9ieV9pZCA9IGZlYXR1cmUudXBkYXRlZEJ5LnJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmVhdHVyZS51cGRhdGVkQnlJRCkge1xuICAgICAgICB2YWx1ZXMudXBkYXRlZF9ieV9yZXNvdXJjZV9pZCA9IGZlYXR1cmUudXBkYXRlZEJ5SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChmZWF0dXJlLmNoYW5nZXNldCkge1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X2lkID0gZmVhdHVyZS5jaGFuZ2VzZXQucm93SUQ7XG4gICAgICAgIHZhbHVlcy5jaGFuZ2VzZXRfcmVzb3VyY2VfaWQgPSBmZWF0dXJlLmNoYW5nZXNldElEO1xuICAgICAgfSBlbHNlIGlmIChyZWNvcmQuX2NoYW5nZXNldFJvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5jaGFuZ2VzZXRfaWQgPSByZWNvcmQuX2NoYW5nZXNldFJvd0lEO1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X3Jlc291cmNlX2lkID0gcmVjb3JkLmNoYW5nZXNldElEO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhbHVlcy50aXRsZSA9IGZlYXR1cmUuZGlzcGxheVZhbHVlO1xuXG4gICAgdmFsdWVzLmZvcm1fdmFsdWVzID0gSlNPTi5zdHJpbmdpZnkoZmVhdHVyZS5mb3JtVmFsdWVzLnRvSlNPTigpKTtcblxuICAgIHRoaXMuc2V0dXBTZWFyY2godmFsdWVzLCBmZWF0dXJlLCBvcHRpb25zKTtcblxuICAgIGlmIChmZWF0dXJlLmhhc0Nvb3JkaW5hdGUpIHtcbiAgICAgIHZhbHVlcy5nZW9tZXRyeSA9IHRoaXMuc2V0dXBQb2ludCh2YWx1ZXMsIGZlYXR1cmUubGF0aXR1ZGUsIGZlYXR1cmUubG9uZ2l0dWRlLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWVzLmdlb21ldHJ5ID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YWx1ZXMuY3JlYXRlZF9hdCA9IGZlYXR1cmUuY2xpZW50Q3JlYXRlZEF0IHx8IGZlYXR1cmUuY3JlYXRlZEF0O1xuICAgIHZhbHVlcy51cGRhdGVkX2F0ID0gZmVhdHVyZS5jbGllbnRVcGRhdGVkQXQgfHwgZmVhdHVyZS51cGRhdGVkQXQ7XG4gICAgdmFsdWVzLnZlcnNpb24gPSBmZWF0dXJlLnZlcnNpb247XG5cbiAgICBpZiAodmFsdWVzLmNyZWF0ZWRfYnlfaWQgPT0gbnVsbCkge1xuICAgICAgdmFsdWVzLmNyZWF0ZWRfYnlfaWQgPSAtMTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWVzLnVwZGF0ZWRfYnlfaWQgPT0gbnVsbCkge1xuICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfaWQgPSAtMTtcbiAgICB9XG5cbiAgICB2YWx1ZXMuc2VydmVyX2NyZWF0ZWRfYXQgPSBmZWF0dXJlLmNyZWF0ZWRBdDtcbiAgICB2YWx1ZXMuc2VydmVyX3VwZGF0ZWRfYXQgPSBmZWF0dXJlLnVwZGF0ZWRBdDtcblxuICAgIHZhbHVlcy5jcmVhdGVkX2R1cmF0aW9uID0gZmVhdHVyZS5jcmVhdGVkRHVyYXRpb247XG4gICAgdmFsdWVzLnVwZGF0ZWRfZHVyYXRpb24gPSBmZWF0dXJlLnVwZGF0ZWREdXJhdGlvbjtcbiAgICB2YWx1ZXMuZWRpdGVkX2R1cmF0aW9uID0gZmVhdHVyZS5lZGl0ZWREdXJhdGlvbjtcblxuICAgIHZhbHVlcy5jcmVhdGVkX2xhdGl0dWRlID0gZmVhdHVyZS5jcmVhdGVkTGF0aXR1ZGU7XG4gICAgdmFsdWVzLmNyZWF0ZWRfbG9uZ2l0dWRlID0gZmVhdHVyZS5jcmVhdGVkTG9uZ2l0dWRlO1xuICAgIHZhbHVlcy5jcmVhdGVkX2FsdGl0dWRlID0gZmVhdHVyZS5jcmVhdGVkQWx0aXR1ZGU7XG4gICAgdmFsdWVzLmNyZWF0ZWRfaG9yaXpvbnRhbF9hY2N1cmFjeSA9IGZlYXR1cmUuY3JlYXRlZEFjY3VyYWN5O1xuXG4gICAgaWYgKGZlYXR1cmUuaGFzQ3JlYXRlZENvb3JkaW5hdGUpIHtcbiAgICAgIHZhbHVlcy5jcmVhdGVkX2dlb21ldHJ5ID0gdGhpcy5zZXR1cFBvaW50KHZhbHVlcywgZmVhdHVyZS5jcmVhdGVkTGF0aXR1ZGUsIGZlYXR1cmUuY3JlYXRlZExvbmdpdHVkZSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgdmFsdWVzLnVwZGF0ZWRfbGF0aXR1ZGUgPSBmZWF0dXJlLnVwZGF0ZWRMYXRpdHVkZTtcbiAgICB2YWx1ZXMudXBkYXRlZF9sb25naXR1ZGUgPSBmZWF0dXJlLnVwZGF0ZWRMb25naXR1ZGU7XG4gICAgdmFsdWVzLnVwZGF0ZWRfYWx0aXR1ZGUgPSBmZWF0dXJlLnVwZGF0ZWRBbHRpdHVkZTtcbiAgICB2YWx1ZXMudXBkYXRlZF9ob3Jpem9udGFsX2FjY3VyYWN5ID0gZmVhdHVyZS51cGRhdGVkQWNjdXJhY3k7XG5cbiAgICBpZiAoZmVhdHVyZS5oYXNVcGRhdGVkQ29vcmRpbmF0ZSkge1xuICAgICAgdmFsdWVzLnVwZGF0ZWRfZ2VvbWV0cnkgPSB0aGlzLnNldHVwUG9pbnQodmFsdWVzLCBmZWF0dXJlLnVwZGF0ZWRMYXRpdHVkZSwgZmVhdHVyZS51cGRhdGVkTG9uZ2l0dWRlLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9XG5cbiAgc3RhdGljIGRlbGV0ZVJvd3NGb3JSZWNvcmRTdGF0ZW1lbnQoZGIsIHJlY29yZCwgdGFibGVOYW1lKSB7XG4gICAgcmV0dXJuIGRiLmRlbGV0ZVN0YXRlbWVudCh0YWJsZU5hbWUsIHtyZWNvcmRfcmVzb3VyY2VfaWQ6IHJlY29yZC5pZH0pO1xuICB9XG5cbiAgc3RhdGljIGRlbGV0ZVJvd3NTdGF0ZW1lbnQoZGIsIHRhYmxlTmFtZSkge1xuICAgIHJldHVybiBkYi5kZWxldGVTdGF0ZW1lbnQodGFibGVOYW1lLCB7fSk7XG4gIH1cblxuICBzdGF0aWMgZGVsZXRlRm9yUmVjb3JkU3RhdGVtZW50cyhkYiwgcmVjb3JkLCBmb3JtLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcmVwZWF0YWJsZXMgPSBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJyk7XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBsZXQgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybUFuZFNjaGVtYShmb3JtLCBudWxsLCBvcHRpb25zKTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NGb3JSZWNvcmRTdGF0ZW1lbnQoZGIsIHJlY29yZCwgdGFibGVOYW1lKSk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgcmVwZWF0YWJsZXMpIHtcbiAgICAgIHRhYmxlTmFtZSA9IHRoaXMudGFibGVOYW1lV2l0aEZvcm1BbmRTY2hlbWEoZm9ybSwgcmVwZWF0YWJsZSwgb3B0aW9ucyk7XG5cbiAgICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NGb3JSZWNvcmRTdGF0ZW1lbnQoZGIsIHJlY29yZCwgdGFibGVOYW1lKSk7XG4gICAgfVxuXG4gICAgdGFibGVOYW1lID0gdGhpcy5tdWx0aXBsZVZhbHVlVGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgb3B0aW9ucyk7XG5cbiAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50KGRiLCByZWNvcmQsIHRhYmxlTmFtZSkpO1xuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgZGVsZXRlRm9yRm9ybVN0YXRlbWVudHMoZGIsIGZvcm0sIG9wdGlvbnMpIHtcbiAgICBjb25zdCByZXBlYXRhYmxlcyA9IGZvcm0uZWxlbWVudHNPZlR5cGUoJ1JlcGVhdGFibGUnKTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIGxldCB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtQW5kU2NoZW1hKGZvcm0sIG51bGwsIG9wdGlvbnMpO1xuXG4gICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuZGVsZXRlUm93c1N0YXRlbWVudChkYiwgdGFibGVOYW1lKSk7XG5cbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgcmVwZWF0YWJsZXMpIHtcbiAgICAgIHRhYmxlTmFtZSA9IHRoaXMudGFibGVOYW1lV2l0aEZvcm1BbmRTY2hlbWEoZm9ybSwgcmVwZWF0YWJsZSwgb3B0aW9ucyk7XG5cbiAgICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NTdGF0ZW1lbnQoZGIsIHRhYmxlTmFtZSkpO1xuICAgIH1cblxuICAgIHRhYmxlTmFtZSA9IHRoaXMubXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG9wdGlvbnMpO1xuXG4gICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuZGVsZXRlUm93c1N0YXRlbWVudChkYiwgdGFibGVOYW1lKSk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcbiAgfVxuXG4gIHN0YXRpYyBtdWx0aXBsZVZhbHVlVGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgb3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtQW5kU2NoZW1hKGZvcm0sIG51bGwsIG9wdGlvbnMsICdfdmFsdWVzJyk7XG4gIH1cblxuICBzdGF0aWMgdGFibGVOYW1lV2l0aEZvcm1BbmRTY2hlbWEoZm9ybSwgcmVwZWF0YWJsZSwgb3B0aW9ucywgc3VmZml4KSB7XG4gICAgY29uc3QgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlLCBvcHRpb25zKTtcblxuICAgIHN1ZmZpeCA9IHN1ZmZpeCB8fCAnJztcblxuICAgIGlmIChvcHRpb25zLnNjaGVtYSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZXNjYXBlSWRlbnRpZmllcihvcHRpb25zLnNjaGVtYSkgKyAnLicgKyBvcHRpb25zLmVzY2FwZUlkZW50aWZpZXIodGFibGVOYW1lICsgc3VmZml4KTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucy5lc2NhcGVJZGVudGlmaWVyKHRhYmxlTmFtZSArIHN1ZmZpeCk7XG4gIH1cblxuICBzdGF0aWMgdGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgcmVwZWF0YWJsZSwgb3B0aW9ucykge1xuICAgIGlmIChyZXBlYXRhYmxlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBmb3JtYXQoJyVzZm9ybV8lcycsIHRoaXMuYWNjb3VudFByZWZpeChmb3JtLCBvcHRpb25zKSwgdGhpcy5mb3JtSWRlbnRpZmllcihmb3JtLCBvcHRpb25zKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvcm1hdCgnJXNmb3JtXyVzXyVzJywgdGhpcy5hY2NvdW50UHJlZml4KGZvcm0sIG9wdGlvbnMpLCB0aGlzLmZvcm1JZGVudGlmaWVyKGZvcm0sIG9wdGlvbnMpLCByZXBlYXRhYmxlLmtleSk7XG4gIH1cblxuICBzdGF0aWMgYWNjb3VudFByZWZpeChmb3JtLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuYWNjb3VudFByZWZpeCAhPSBudWxsID8gJ2FjY291bnRfJyArIGZvcm0uX2FjY291bnRSb3dJRCArICdfJyA6ICcnO1xuICB9XG5cbiAgc3RhdGljIGZvcm1JZGVudGlmaWVyKGZvcm0sIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5wZXJzaXN0ZW50VGFibGVOYW1lcyA/IGZvcm0uaWQgOiBmb3JtLnJvd0lEO1xuICB9XG5cbiAgc3RhdGljIHNldHVwU2VhcmNoKHZhbHVlcywgZmVhdHVyZSkge1xuICAgIGNvbnN0IHNlYXJjaGFibGVWYWx1ZSA9IGZlYXR1cmUuc2VhcmNoYWJsZVZhbHVlO1xuXG4gICAgdmFsdWVzLnJlY29yZF9pbmRleF90ZXh0ID0gc2VhcmNoYWJsZVZhbHVlO1xuICAgIHZhbHVlcy5yZWNvcmRfaW5kZXggPSB7cmF3OiBgdG9fdHN2ZWN0b3IoJHsgcGdmb3JtYXQoJyVMJywgc2VhcmNoYWJsZVZhbHVlKSB9KWB9O1xuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHN0YXRpYyBzZXR1cFBvaW50KHZhbHVlcywgbGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICAgIGNvbnN0IHdrdCA9IHBnZm9ybWF0KCdQT0lOVCglcyAlcyknLCBsb25naXR1ZGUsIGxhdGl0dWRlKTtcblxuICAgIHJldHVybiB7cmF3OiBgU1RfRm9yY2UyRChTVF9TZXRTUklEKFNUX0dlb21Gcm9tVGV4dCgnJHsgd2t0IH0nKSwgNDMyNikpYH07XG4gIH1cbn1cbiJdfQ==