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

    return (0, _util.format)('%s%sform_%s_values', prefix, this.accountPrefix(form, options), form.rowID);
  }

  static tableNameWithForm(form, repeatable, options) {
    const prefix = options && options.schema ? options.schema + '.' : '';

    if (repeatable == null) {
      return (0, _util.format)('%s%sform_%s', prefix, this.accountPrefix(form, options), form.rowID);
    }

    return (0, _util.format)('%s%sform_%s_%s', prefix, this.accountPrefix(form, options), form.rowID, repeatable.key);
  }

  static accountPrefix(form, options) {
    return options.accountPrefix != null ? 'account_' + form._accountRowID + '_' : '';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tYWluL21vZGVscy9yZWNvcmQtdmFsdWVzL3JlY29yZC12YWx1ZXMuanMiXSwibmFtZXMiOlsiUmVjb3JkVmFsdWVzIiwidXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyIsImRiIiwicmVjb3JkIiwib3B0aW9ucyIsInN0YXRlbWVudHMiLCJwdXNoIiwiYXBwbHkiLCJkZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzIiwiZm9ybSIsImluc2VydEZvclJlY29yZFN0YXRlbWVudHMiLCJpbnNlcnRSb3dGb3JGZWF0dXJlU3RhdGVtZW50IiwiaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzIiwiaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyIsImZlYXR1cmUiLCJwYXJlbnRGZWF0dXJlIiwidmFsdWVzIiwiY29sdW1uVmFsdWVzRm9yRmVhdHVyZSIsInN5c3RlbVZhbHVlcyIsInN5c3RlbUNvbHVtblZhbHVlc0ZvckZlYXR1cmUiLCJPYmplY3QiLCJhc3NpZ24iLCJ0YWJsZU5hbWUiLCJ0YWJsZU5hbWVXaXRoRm9ybSIsIl9lbGVtZW50IiwidmFsdWVzVHJhbnNmb3JtZXIiLCJpbnNlcnRTdGF0ZW1lbnQiLCJwayIsImZvcm1WYWx1ZSIsImZvcm1WYWx1ZXMiLCJhbGwiLCJlbGVtZW50IiwiaXNSZXBlYXRhYmxlRWxlbWVudCIsInJlcGVhdGFibGVJdGVtIiwiX2l0ZW1zIiwibWF5YmVBc3NpZ25BcnJheSIsImtleSIsInZhbHVlIiwiZGlzYWJsZUFycmF5cyIsImRpc2FibGVDb21wbGV4VHlwZXMiLCJkaXNhYmxlZEFycmF5VmFsdWUiLCJpc0FycmF5Iiwiam9pbiIsImlzU2ltcGxlIiwiaXNOdW1iZXIiLCJpc1N0cmluZyIsImlzRGF0ZSIsImlzQm9vbGVhbiIsIkpTT04iLCJzdHJpbmdpZnkiLCJpc0VtcHR5IiwiY29sdW1uVmFsdWUiLCJjYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0IiwiaXNDYWxjdWxhdGVkRWxlbWVudCIsImRpc3BsYXkiLCJwYXJzZURhdGUiLCJ0ZXh0VmFsdWUiLCJnZXRGdWxsWWVhciIsInRvTG93ZXJDYXNlIiwibWVkaWFVUkxGb3JtYXR0ZXIiLCJpc1Bob3RvRWxlbWVudCIsImlzVmlkZW9FbGVtZW50IiwiaXNBdWRpb0VsZW1lbnQiLCJwcmVmaXgiLCJtZWRpYVZpZXdVUkxGb3JtYXR0ZXIiLCJrZXlzIiwibXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlIiwibXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtIiwicGFyZW50UmVzb3VyY2VJZCIsImlkIiwibXVsdGlwbGVWYWx1ZUl0ZW0iLCJpbnNlcnRWYWx1ZXMiLCJ0ZXh0X3ZhbHVlIiwicmVjb3JkX2lkIiwicm93SUQiLCJyZWNvcmRfcmVzb3VyY2VfaWQiLCJwYXJlbnRfcmVzb3VyY2VfaWQiLCJmZWF0dXJlVmFsdWVzIiwibXVsdGlwbGVWYWx1ZXMiLCJyZXBvcnRVUkxGb3JtYXR0ZXIiLCJyZXBvcnRfdXJsIiwiX3Byb2plY3RSb3dJRCIsInByb2plY3RfaWQiLCJwcm9qZWN0SUQiLCJwcm9qZWN0X3Jlc291cmNlX2lkIiwiX2Fzc2lnbmVkVG9Sb3dJRCIsImFzc2lnbmVkX3RvX2lkIiwiYXNzaWduZWRUb0lEIiwiYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQiLCJfY3JlYXRlZEJ5Um93SUQiLCJjcmVhdGVkX2J5X2lkIiwiY3JlYXRlZEJ5SUQiLCJjcmVhdGVkX2J5X3Jlc291cmNlX2lkIiwiX3VwZGF0ZWRCeVJvd0lEIiwidXBkYXRlZF9ieV9pZCIsInVwZGF0ZWRCeUlEIiwidXBkYXRlZF9ieV9yZXNvdXJjZV9pZCIsIl9jaGFuZ2VzZXRSb3dJRCIsImNoYW5nZXNldF9pZCIsImNoYW5nZXNldElEIiwiY2hhbmdlc2V0X3Jlc291cmNlX2lkIiwic3RhdHVzIiwibGF0aXR1ZGUiLCJsb25naXR1ZGUiLCJhbHRpdHVkZSIsInNwZWVkIiwiY291cnNlIiwidmVydGljYWxfYWNjdXJhY3kiLCJ2ZXJ0aWNhbEFjY3VyYWN5IiwiaG9yaXpvbnRhbF9hY2N1cmFjeSIsImhvcml6b250YWxBY2N1cmFjeSIsInJlc291cmNlX2lkIiwiaW5kZXgiLCJoYXNDb29yZGluYXRlIiwicmVjb3JkX3N0YXR1cyIsInJlY29yZF9wcm9qZWN0X2lkIiwicmVjb3JkX3Byb2plY3RfcmVzb3VyY2VfaWQiLCJyZWNvcmRfYXNzaWduZWRfdG9faWQiLCJyZWNvcmRfYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQiLCJjcmVhdGVkQnkiLCJ1cGRhdGVkQnkiLCJjaGFuZ2VzZXQiLCJ0aXRsZSIsImRpc3BsYXlWYWx1ZSIsImZvcm1fdmFsdWVzIiwidG9KU09OIiwic2V0dXBTZWFyY2giLCJnZW9tZXRyeSIsInNldHVwUG9pbnQiLCJjcmVhdGVkX2F0IiwiY2xpZW50Q3JlYXRlZEF0IiwiY3JlYXRlZEF0IiwidXBkYXRlZF9hdCIsImNsaWVudFVwZGF0ZWRBdCIsInVwZGF0ZWRBdCIsInZlcnNpb24iLCJzZXJ2ZXJfY3JlYXRlZF9hdCIsInNlcnZlcl91cGRhdGVkX2F0IiwiY3JlYXRlZF9kdXJhdGlvbiIsImNyZWF0ZWREdXJhdGlvbiIsInVwZGF0ZWRfZHVyYXRpb24iLCJ1cGRhdGVkRHVyYXRpb24iLCJlZGl0ZWRfZHVyYXRpb24iLCJlZGl0ZWREdXJhdGlvbiIsImNyZWF0ZWRfbGF0aXR1ZGUiLCJjcmVhdGVkTGF0aXR1ZGUiLCJjcmVhdGVkX2xvbmdpdHVkZSIsImNyZWF0ZWRMb25naXR1ZGUiLCJjcmVhdGVkX2FsdGl0dWRlIiwiY3JlYXRlZEFsdGl0dWRlIiwiY3JlYXRlZF9ob3Jpem9udGFsX2FjY3VyYWN5IiwiY3JlYXRlZEFjY3VyYWN5IiwiaGFzQ3JlYXRlZENvb3JkaW5hdGUiLCJjcmVhdGVkX2dlb21ldHJ5IiwidXBkYXRlZF9sYXRpdHVkZSIsInVwZGF0ZWRMYXRpdHVkZSIsInVwZGF0ZWRfbG9uZ2l0dWRlIiwidXBkYXRlZExvbmdpdHVkZSIsInVwZGF0ZWRfYWx0aXR1ZGUiLCJ1cGRhdGVkQWx0aXR1ZGUiLCJ1cGRhdGVkX2hvcml6b250YWxfYWNjdXJhY3kiLCJ1cGRhdGVkQWNjdXJhY3kiLCJoYXNVcGRhdGVkQ29vcmRpbmF0ZSIsInVwZGF0ZWRfZ2VvbWV0cnkiLCJkZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50IiwiZGVsZXRlU3RhdGVtZW50IiwiZGVsZXRlUm93c1N0YXRlbWVudCIsInJlcGVhdGFibGVzIiwiZWxlbWVudHNPZlR5cGUiLCJyZXBlYXRhYmxlIiwiZGVsZXRlRm9yRm9ybVN0YXRlbWVudHMiLCJzY2hlbWEiLCJhY2NvdW50UHJlZml4IiwiX2FjY291bnRSb3dJRCIsInNlYXJjaGFibGVWYWx1ZSIsInJlY29yZF9pbmRleF90ZXh0IiwicmVjb3JkX2luZGV4IiwicmF3Iiwid2t0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7QUFFZSxNQUFNQSxZQUFOLENBQW1CO0FBQ2hDLFNBQU9DLHlCQUFQLENBQWlDQyxFQUFqQyxFQUFxQ0MsTUFBckMsRUFBNkNDLFVBQVUsRUFBdkQsRUFBMkQ7QUFDekQsVUFBTUMsYUFBYSxFQUFuQjs7QUFFQUEsZUFBV0MsSUFBWCxDQUFnQkMsS0FBaEIsQ0FBc0JGLFVBQXRCLEVBQWtDLEtBQUtHLHlCQUFMLENBQStCTixFQUEvQixFQUFtQ0MsTUFBbkMsRUFBMkNBLE9BQU9NLElBQWxELEVBQXdETCxPQUF4RCxDQUFsQztBQUNBQyxlQUFXQyxJQUFYLENBQWdCQyxLQUFoQixDQUFzQkYsVUFBdEIsRUFBa0MsS0FBS0sseUJBQUwsQ0FBK0JSLEVBQS9CLEVBQW1DQyxNQUFuQyxFQUEyQ0EsT0FBT00sSUFBbEQsRUFBd0RMLE9BQXhELENBQWxDOztBQUVBLFdBQU9DLFVBQVA7QUFDRDs7QUFFRCxTQUFPSyx5QkFBUCxDQUFpQ1IsRUFBakMsRUFBcUNDLE1BQXJDLEVBQTZDTSxJQUE3QyxFQUFtREwsVUFBVSxFQUE3RCxFQUFpRTtB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RUFBUDtBQUNEO0FBdmIrQjtrQkFBYm5MLFkiLCJmaWxlIjoicmVjb3JkLXZhbHVlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IFJlY29yZCwgUmVwZWF0YWJsZUl0ZW1WYWx1ZSwgRGF0ZVV0aWxzIH0gZnJvbSAnZnVsY3J1bS1jb3JlJztcbmltcG9ydCBwZ2Zvcm1hdCBmcm9tICdwZy1mb3JtYXQnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWNvcmRWYWx1ZXMge1xuICBzdGF0aWMgdXBkYXRlRm9yUmVjb3JkU3RhdGVtZW50cyhkYiwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKGRiLCByZWNvcmQsIHJlY29yZC5mb3JtLCBvcHRpb25zKSk7XG4gICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0Rm9yUmVjb3JkU3RhdGVtZW50cyhkYiwgcmVjb3JkLCByZWNvcmQuZm9ybSwgb3B0aW9ucykpO1xuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0Rm9yUmVjb3JkU3RhdGVtZW50cyhkYiwgcmVjb3JkLCBmb3JtLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5pbnNlcnRSb3dGb3JGZWF0dXJlU3RhdGVtZW50KGRiLCBmb3JtLCByZWNvcmQsIG51bGwsIHJlY29yZCwgb3B0aW9ucykpO1xuICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydENoaWxkRmVhdHVyZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVjb3JkLCByZWNvcmQsIG9wdGlvbnMpKTtcbiAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRNdWx0aXBsZVZhbHVlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCByZWNvcmQsIHJlY29yZCwgb3B0aW9ucykpO1xuICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVjb3JkLCByZWNvcmQsIG9wdGlvbnMpKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIGluc2VydFJvd0ZvckZlYXR1cmVTdGF0ZW1lbnQoZGIsIGZvcm0sIGZlYXR1cmUsIHBhcmVudEZlYXR1cmUsIHJlY29yZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgdmFsdWVzID0gdGhpcy5jb2x1bW5WYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIG9wdGlvbnMpO1xuICAgIGNvbnN0IHN5c3RlbVZhbHVlcyA9IHRoaXMuc3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCBwYXJlbnRGZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMpO1xuXG4gICAgT2JqZWN0LmFzc2lnbih2YWx1ZXMsIHN5c3RlbVZhbHVlcyk7XG5cbiAgICBsZXQgdGFibGVOYW1lID0gbnVsbDtcblxuICAgIGlmIChmZWF0dXJlIGluc3RhbmNlb2YgUmVwZWF0YWJsZUl0ZW1WYWx1ZSkge1xuICAgICAgLy8gVE9ETyh6aG0pIGFkZCBwdWJsaWMgaW50ZXJmYWNlIGZvciBhY2Nlc3NpbmcgX2VsZW1lbnQsIGxpa2UgYGdldCByZXBlYXRhYmxlRWxlbWVudCgpYFxuICAgICAgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCBmZWF0dXJlLl9lbGVtZW50LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCBudWxsLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy52YWx1ZXNUcmFuc2Zvcm1lcikge1xuICAgICAgb3B0aW9ucy52YWx1ZXNUcmFuc2Zvcm1lcih7ZGIsIGZvcm0sIGZlYXR1cmUsIHBhcmVudEZlYXR1cmUsIHJlY29yZCwgdmFsdWVzfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRiLmluc2VydFN0YXRlbWVudCh0YWJsZU5hbWUsIHZhbHVlcywge3BrOiAnaWQnfSk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0Q2hpbGRGZWF0dXJlc0ZvckZlYXR1cmVTdGF0ZW1lbnRzKGRiLCBmb3JtLCBmZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgZm9ybVZhbHVlIG9mIGZlYXR1cmUuZm9ybVZhbHVlcy5hbGwpIHtcbiAgICAgIGlmIChmb3JtVmFsdWUuZWxlbWVudC5pc1JlcGVhdGFibGVFbGVtZW50KSB7XG4gICAgICAgIC8vIFRPRE8oemhtKSBhZGQgcHVibGljIGludGVyZmFjZSBmb3IgX2l0ZW1zXG4gICAgICAgIGZvciAoY29uc3QgcmVwZWF0YWJsZUl0ZW0gb2YgZm9ybVZhbHVlLl9pdGVtcykge1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmluc2VydFJvd0ZvckZlYXR1cmVTdGF0ZW1lbnQoZGIsIGZvcm0sIHJlcGVhdGFibGVJdGVtLCBmZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMpKTtcbiAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2guYXBwbHkoc3RhdGVtZW50cywgdGhpcy5pbnNlcnRDaGlsZEZlYXR1cmVzRm9yRmVhdHVyZVN0YXRlbWVudHMoZGIsIGZvcm0sIHJlcGVhdGFibGVJdGVtLCByZWNvcmQsIG9wdGlvbnMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIG1heWJlQXNzaWduQXJyYXkodmFsdWVzLCBrZXksIHZhbHVlLCBkaXNhYmxlQXJyYXlzLCBkaXNhYmxlQ29tcGxleFR5cGVzKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkaXNhYmxlZEFycmF5VmFsdWUgPSAoXy5pc0FycmF5KHZhbHVlKSAmJiBkaXNhYmxlQXJyYXlzKSA/IHZhbHVlLmpvaW4oJywnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdmFsdWU7XG5cbiAgICBjb25zdCBpc1NpbXBsZSA9IF8uaXNOdW1iZXIodmFsdWUpIHx8IF8uaXNTdHJpbmcodmFsdWUpIHx8IF8uaXNEYXRlKHZhbHVlKSB8fCBfLmlzQm9vbGVhbih2YWx1ZSk7XG5cbiAgICB2YWx1ZXNba2V5XSA9ICFpc1NpbXBsZSAmJiBkaXNhYmxlQ29tcGxleFR5cGVzID09PSB0cnVlID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWU7XG4gIH1cblxuICBzdGF0aWMgY29sdW1uVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSB7fTtcblxuICAgIGZvciAoY29uc3QgZm9ybVZhbHVlIG9mIGZlYXR1cmUuZm9ybVZhbHVlcy5hbGwpIHtcbiAgICAgIGlmIChmb3JtVmFsdWUuaXNFbXB0eSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZWxlbWVudCA9IGZvcm1WYWx1ZS5lbGVtZW50O1xuXG4gICAgICBsZXQgY29sdW1uVmFsdWUgPSBmb3JtVmFsdWUuY29sdW1uVmFsdWU7XG5cbiAgICAgIGlmIChfLmlzTnVtYmVyKGNvbHVtblZhbHVlKSB8fCBfLmlzU3RyaW5nKGNvbHVtblZhbHVlKSB8fCBfLmlzQXJyYXkoY29sdW1uVmFsdWUpIHx8IF8uaXNEYXRlKGNvbHVtblZhbHVlKSkge1xuICAgICAgICBpZiAob3B0aW9ucy5jYWxjdWxhdGVkRmllbGREYXRlRm9ybWF0ID09PSAnZGF0ZScgJiYgZWxlbWVudC5pc0NhbGN1bGF0ZWRFbGVtZW50ICYmIGVsZW1lbnQuZGlzcGxheS5pc0RhdGUpIHtcbiAgICAgICAgICBjb2x1bW5WYWx1ZSA9IERhdGVVdGlscy5wYXJzZURhdGUoZm9ybVZhbHVlLnRleHRWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkb24ndCBhbGxvdyBkYXRlcyBncmVhdGVyIHRoYW4gOTk5OSwgeWVzIC0gdGhleSBleGlzdCBpbiB0aGUgd2lsZFxuICAgICAgICBpZiAoXy5pc0RhdGUoY29sdW1uVmFsdWUpKSB7XG4gICAgICAgICAgY29sdW1uVmFsdWUgPSBjb2x1bW5WYWx1ZS5nZXRGdWxsWWVhcigpID4gOTk5OSA/IG51bGwgOiBmb3JtVmFsdWUudGV4dFZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYXliZUFzc2lnbkFycmF5KHZhbHVlcywgJ2YnICsgZm9ybVZhbHVlLmVsZW1lbnQua2V5LnRvTG93ZXJDYXNlKCksIGNvbHVtblZhbHVlLCBvcHRpb25zLmRpc2FibGVBcnJheXMsIG9wdGlvbnMuZGlzYWJsZUNvbXBsZXhUeXBlcyk7XG4gICAgICB9IGVsc2UgaWYgKGNvbHVtblZhbHVlKSB7XG5cbiAgICAgICAgaWYgKGVsZW1lbnQgJiYgb3B0aW9ucy5tZWRpYVVSTEZvcm1hdHRlcikge1xuICAgICAgICAgIGlmIChlbGVtZW50LmlzUGhvdG9FbGVtZW50IHx8IGVsZW1lbnQuaXNWaWRlb0VsZW1lbnQgfHwgZWxlbWVudC5pc0F1ZGlvRWxlbWVudCkge1xuICAgICAgICAgICAgY29uc3QgcHJlZml4ID0gJ2YnICsgZm9ybVZhbHVlLmVsZW1lbnQua2V5LnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgICAgIGNvbHVtblZhbHVlW3ByZWZpeCArICdfdXJscyddID0gb3B0aW9ucy5tZWRpYVVSTEZvcm1hdHRlcihmb3JtVmFsdWUpO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5tZWRpYVZpZXdVUkxGb3JtYXR0ZXIpIHtcbiAgICAgICAgICAgICAgY29sdW1uVmFsdWVbcHJlZml4ICsgJ192aWV3X3VybCddID0gb3B0aW9ucy5tZWRpYVZpZXdVUkxGb3JtYXR0ZXIoZm9ybVZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBhcnJheSB0eXBlcyBhcmUgZGlzYWJsZWQsIGNvbnZlcnQgYWxsIHRoZSBwcm9wcyB0byBkZWxpbWl0ZWQgdmFsdWVzXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNvbHVtblZhbHVlKSkge1xuICAgICAgICAgIHRoaXMubWF5YmVBc3NpZ25BcnJheShjb2x1bW5WYWx1ZSwga2V5LCBjb2x1bW5WYWx1ZVtrZXldLCBvcHRpb25zLmRpc2FibGVBcnJheXMsIG9wdGlvbnMuZGlzYWJsZUNvbXBsZXhUeXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHZhbHVlcywgY29sdW1uVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgZmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLm11bHRpcGxlVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCByZWNvcmQpO1xuXG4gICAgY29uc3QgdGFibGVOYW1lID0gdGhpcy5tdWx0aXBsZVZhbHVlVGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgb3B0aW9ucyk7XG5cbiAgICBsZXQgcGFyZW50UmVzb3VyY2VJZCA9IG51bGw7XG5cbiAgICBpZiAoZmVhdHVyZSBpbnN0YW5jZW9mIFJlcGVhdGFibGVJdGVtVmFsdWUpIHtcbiAgICAgIHBhcmVudFJlc291cmNlSWQgPSBmZWF0dXJlLmlkO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgbXVsdGlwbGVWYWx1ZUl0ZW0gb2YgdmFsdWVzKSB7XG4gICAgICBjb25zdCBpbnNlcnRWYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCB7a2V5OiBtdWx0aXBsZVZhbHVlSXRlbS5lbGVtZW50LmtleSwgdGV4dF92YWx1ZTogbXVsdGlwbGVWYWx1ZUl0ZW0udmFsdWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cmVjb3JkX2lkOiByZWNvcmQucm93SUQsIHJlY29yZF9yZXNvdXJjZV9pZDogcmVjb3JkLmlkLCBwYXJlbnRfcmVzb3VyY2VfaWQ6IHBhcmVudFJlc291cmNlSWR9KTtcblxuICAgICAgc3RhdGVtZW50cy5wdXNoKGRiLmluc2VydFN0YXRlbWVudCh0YWJsZU5hbWUsIGluc2VydFZhbHVlcywge3BrOiAnaWQnfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIGluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgZmVhdHVyZSwgcmVjb3JkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1WYWx1ZSBvZiBmZWF0dXJlLmZvcm1WYWx1ZXMuYWxsKSB7XG4gICAgICBpZiAoZm9ybVZhbHVlLmlzUmVwZWF0YWJsZUVsZW1lbnQpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXBlYXRhYmxlSXRlbSBvZiBmb3JtVmFsdWUuX2l0ZW1zKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoLmFwcGx5KHN0YXRlbWVudHMsIHRoaXMuaW5zZXJ0TXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaC5hcHBseShzdGF0ZW1lbnRzLCB0aGlzLmluc2VydENoaWxkTXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlU3RhdGVtZW50cyhkYiwgZm9ybSwgcmVwZWF0YWJsZUl0ZW0sIHJlY29yZCwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgbXVsdGlwbGVWYWx1ZXNGb3JGZWF0dXJlKGZlYXR1cmUsIHJlY29yZCkge1xuICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBmb3JtVmFsdWUgb2YgZmVhdHVyZS5mb3JtVmFsdWVzLmFsbCkge1xuICAgICAgaWYgKGZvcm1WYWx1ZS5pc0VtcHR5KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmZWF0dXJlVmFsdWVzID0gZm9ybVZhbHVlLm11bHRpcGxlVmFsdWVzO1xuXG4gICAgICBpZiAoZmVhdHVyZVZhbHVlcykge1xuICAgICAgICB2YWx1ZXMucHVzaC5hcHBseSh2YWx1ZXMsIGZlYXR1cmVWYWx1ZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH1cblxuICBzdGF0aWMgc3lzdGVtQ29sdW1uVmFsdWVzRm9yRmVhdHVyZShmZWF0dXJlLCBwYXJlbnRGZWF0dXJlLCByZWNvcmQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHZhbHVlcyA9IHt9O1xuXG4gICAgdmFsdWVzLnJlY29yZF9pZCA9IHJlY29yZC5yb3dJRDtcbiAgICB2YWx1ZXMucmVjb3JkX3Jlc291cmNlX2lkID0gcmVjb3JkLmlkO1xuXG4gICAgaWYgKG9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyKSB7XG4gICAgICB2YWx1ZXMucmVwb3J0X3VybCA9IG9wdGlvbnMucmVwb3J0VVJMRm9ybWF0dGVyKGZlYXR1cmUpO1xuICAgIH1cblxuICAgIGlmIChmZWF0dXJlIGluc3RhbmNlb2YgUmVjb3JkKSB7XG4gICAgICBpZiAocmVjb3JkLl9wcm9qZWN0Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLnByb2plY3RfaWQgPSByZWNvcmQuX3Byb2plY3RSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5wcm9qZWN0SUQpIHtcbiAgICAgICAgdmFsdWVzLnByb2plY3RfcmVzb3VyY2VfaWQgPSByZWNvcmQucHJvamVjdElEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9hc3NpZ25lZFRvUm93SUQpIHtcbiAgICAgICAgdmFsdWVzLmFzc2lnbmVkX3RvX2lkID0gcmVjb3JkLl9hc3NpZ25lZFRvUm93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuYXNzaWduZWRUb0lEKSB7XG4gICAgICAgIHZhbHVlcy5hc3NpZ25lZF90b19yZXNvdXJjZV9pZCA9IHJlY29yZC5hc3NpZ25lZFRvSUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX2NyZWF0ZWRCeVJvd0lEKSB7XG4gICAgICAgIHZhbHVlcy5jcmVhdGVkX2J5X2lkID0gcmVjb3JkLl9jcmVhdGVkQnlSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5jcmVhdGVkQnlJRCkge1xuICAgICAgICB2YWx1ZXMuY3JlYXRlZF9ieV9yZXNvdXJjZV9pZCA9IHJlY29yZC5jcmVhdGVkQnlJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5fdXBkYXRlZEJ5Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfaWQgPSByZWNvcmQuX3VwZGF0ZWRCeVJvd0lEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLnVwZGF0ZWRCeUlEKSB7XG4gICAgICAgIHZhbHVlcy51cGRhdGVkX2J5X3Jlc291cmNlX2lkID0gcmVjb3JkLnVwZGF0ZWRCeUlEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9jaGFuZ2VzZXRSb3dJRCkge1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X2lkID0gcmVjb3JkLl9jaGFuZ2VzZXRSb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5jaGFuZ2VzZXRJRCkge1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X3Jlc291cmNlX2lkID0gcmVjb3JkLmNoYW5nZXNldElEO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLnN0YXR1cykge1xuICAgICAgICB2YWx1ZXMuc3RhdHVzID0gcmVjb3JkLnN0YXR1cztcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5sYXRpdHVkZSAhPSBudWxsKSB7XG4gICAgICAgIHZhbHVlcy5sYXRpdHVkZSA9IHJlY29yZC5sYXRpdHVkZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlY29yZC5sb25naXR1ZGUgIT0gbnVsbCkge1xuICAgICAgICB2YWx1ZXMubG9uZ2l0dWRlID0gcmVjb3JkLmxvbmdpdHVkZTtcbiAgICAgIH1cblxuICAgICAgdmFsdWVzLmFsdGl0dWRlID0gcmVjb3JkLmFsdGl0dWRlO1xuICAgICAgdmFsdWVzLnNwZWVkID0gcmVjb3JkLnNwZWVkO1xuICAgICAgdmFsdWVzLmNvdXJzZSA9IHJlY29yZC5jb3Vyc2U7XG4gICAgICB2YWx1ZXMudmVydGljYWxfYWNjdXJhY3kgPSByZWNvcmQudmVydGljYWxBY2N1cmFjeTtcbiAgICAgIHZhbHVlcy5ob3Jpem9udGFsX2FjY3VyYWN5ID0gcmVjb3JkLmhvcml6b250YWxBY2N1cmFjeTtcbiAgICB9IGVsc2UgaWYgKGZlYXR1cmUgaW5zdGFuY2VvZiBSZXBlYXRhYmxlSXRlbVZhbHVlKSB7XG4gICAgICB2YWx1ZXMucmVzb3VyY2VfaWQgPSBmZWF0dXJlLmlkO1xuICAgICAgdmFsdWVzLmluZGV4ID0gZmVhdHVyZS5pbmRleDtcbiAgICAgIHZhbHVlcy5wYXJlbnRfcmVzb3VyY2VfaWQgPSBwYXJlbnRGZWF0dXJlLmlkO1xuXG4gICAgICBpZiAoZmVhdHVyZS5oYXNDb29yZGluYXRlKSB7XG4gICAgICAgIHZhbHVlcy5sYXRpdHVkZSA9IGZlYXR1cmUubGF0aXR1ZGU7XG4gICAgICAgIHZhbHVlcy5sb25naXR1ZGUgPSBmZWF0dXJlLmxvbmdpdHVkZTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVjb3JkIHZhbHVlc1xuICAgICAgaWYgKHJlY29yZC5zdGF0dXMpIHtcbiAgICAgICAgdmFsdWVzLnJlY29yZF9zdGF0dXMgPSByZWNvcmQuc3RhdHVzO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLl9wcm9qZWN0Um93SUQpIHtcbiAgICAgICAgdmFsdWVzLnJlY29yZF9wcm9qZWN0X2lkID0gcmVjb3JkLl9wcm9qZWN0Um93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQucHJvamVjdElEKSB7XG4gICAgICAgIHZhbHVlcy5yZWNvcmRfcHJvamVjdF9yZXNvdXJjZV9pZCA9IHJlY29yZC5wcm9qZWN0SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuX2Fzc2lnbmVkVG9Sb3dJRCkge1xuICAgICAgICB2YWx1ZXMucmVjb3JkX2Fzc2lnbmVkX3RvX2lkID0gcmVjb3JkLl9hc3NpZ25lZFRvUm93SUQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQuYXNzaWduZWRUb0lEKSB7XG4gICAgICAgIHZhbHVlcy5yZWNvcmRfYXNzaWduZWRfdG9fcmVzb3VyY2VfaWQgPSByZWNvcmQuYXNzaWduZWRUb0lEO1xuICAgICAgfVxuXG4gICAgICAvLyBsaW5rZWQgZmllbGRzXG4gICAgICBpZiAoZmVhdHVyZS5jcmVhdGVkQnkpIHtcbiAgICAgICAgdmFsdWVzLmNyZWF0ZWRfYnlfaWQgPSBmZWF0dXJlLmNyZWF0ZWRCeS5yb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKGZlYXR1cmUuY3JlYXRlZEJ5SUQpIHtcbiAgICAgICAgdmFsdWVzLmNyZWF0ZWRfYnlfcmVzb3VyY2VfaWQgPSBmZWF0dXJlLmNyZWF0ZWRCeUlEO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmVhdHVyZS51cGRhdGVkQnkpIHtcbiAgICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfaWQgPSBmZWF0dXJlLnVwZGF0ZWRCeS5yb3dJRDtcbiAgICAgIH1cblxuICAgICAgaWYgKGZlYXR1cmUudXBkYXRlZEJ5SUQpIHtcbiAgICAgICAgdmFsdWVzLnVwZGF0ZWRfYnlfcmVzb3VyY2VfaWQgPSBmZWF0dXJlLnVwZGF0ZWRCeUlEO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmVhdHVyZS5jaGFuZ2VzZXQpIHtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9pZCA9IGZlYXR1cmUuY2hhbmdlc2V0LnJvd0lEO1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X3Jlc291cmNlX2lkID0gZmVhdHVyZS5jaGFuZ2VzZXRJRDtcbiAgICAgIH0gZWxzZSBpZiAocmVjb3JkLl9jaGFuZ2VzZXRSb3dJRCkge1xuICAgICAgICB2YWx1ZXMuY2hhbmdlc2V0X2lkID0gcmVjb3JkLl9jaGFuZ2VzZXRSb3dJRDtcbiAgICAgICAgdmFsdWVzLmNoYW5nZXNldF9yZXNvdXJjZV9pZCA9IHJlY29yZC5jaGFuZ2VzZXRJRDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YWx1ZXMudGl0bGUgPSBmZWF0dXJlLmRpc3BsYXlWYWx1ZTtcblxuICAgIHZhbHVlcy5mb3JtX3ZhbHVlcyA9IEpTT04uc3RyaW5naWZ5KGZlYXR1cmUuZm9ybVZhbHVlcy50b0pTT04oKSk7XG5cbiAgICB0aGlzLnNldHVwU2VhcmNoKHZhbHVlcywgZmVhdHVyZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAoZmVhdHVyZS5oYXNDb29yZGluYXRlKSB7XG4gICAgICB2YWx1ZXMuZ2VvbWV0cnkgPSB0aGlzLnNldHVwUG9pbnQodmFsdWVzLCBmZWF0dXJlLmxhdGl0dWRlLCBmZWF0dXJlLmxvbmdpdHVkZSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlcy5nZW9tZXRyeSA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFsdWVzLmNyZWF0ZWRfYXQgPSBmZWF0dXJlLmNsaWVudENyZWF0ZWRBdCB8fCBmZWF0dXJlLmNyZWF0ZWRBdDtcbiAgICB2YWx1ZXMudXBkYXRlZF9hdCA9IGZlYXR1cmUuY2xpZW50VXBkYXRlZEF0IHx8IGZlYXR1cmUudXBkYXRlZEF0O1xuICAgIHZhbHVlcy52ZXJzaW9uID0gZmVhdHVyZS52ZXJzaW9uO1xuXG4gICAgaWYgKHZhbHVlcy5jcmVhdGVkX2J5X2lkID09IG51bGwpIHtcbiAgICAgIHZhbHVlcy5jcmVhdGVkX2J5X2lkID0gLTE7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlcy51cGRhdGVkX2J5X2lkID09IG51bGwpIHtcbiAgICAgIHZhbHVlcy51cGRhdGVkX2J5X2lkID0gLTE7XG4gICAgfVxuXG4gICAgdmFsdWVzLnNlcnZlcl9jcmVhdGVkX2F0ID0gZmVhdHVyZS5jcmVhdGVkQXQ7XG4gICAgdmFsdWVzLnNlcnZlcl91cGRhdGVkX2F0ID0gZmVhdHVyZS51cGRhdGVkQXQ7XG5cbiAgICB2YWx1ZXMuY3JlYXRlZF9kdXJhdGlvbiA9IGZlYXR1cmUuY3JlYXRlZER1cmF0aW9uO1xuICAgIHZhbHVlcy51cGRhdGVkX2R1cmF0aW9uID0gZmVhdHVyZS51cGRhdGVkRHVyYXRpb247XG4gICAgdmFsdWVzLmVkaXRlZF9kdXJhdGlvbiA9IGZlYXR1cmUuZWRpdGVkRHVyYXRpb247XG5cbiAgICB2YWx1ZXMuY3JlYXRlZF9sYXRpdHVkZSA9IGZlYXR1cmUuY3JlYXRlZExhdGl0dWRlO1xuICAgIHZhbHVlcy5jcmVhdGVkX2xvbmdpdHVkZSA9IGZlYXR1cmUuY3JlYXRlZExvbmdpdHVkZTtcbiAgICB2YWx1ZXMuY3JlYXRlZF9hbHRpdHVkZSA9IGZlYXR1cmUuY3JlYXRlZEFsdGl0dWRlO1xuICAgIHZhbHVlcy5jcmVhdGVkX2hvcml6b250YWxfYWNjdXJhY3kgPSBmZWF0dXJlLmNyZWF0ZWRBY2N1cmFjeTtcblxuICAgIGlmIChmZWF0dXJlLmhhc0NyZWF0ZWRDb29yZGluYXRlKSB7XG4gICAgICB2YWx1ZXMuY3JlYXRlZF9nZW9tZXRyeSA9IHRoaXMuc2V0dXBQb2ludCh2YWx1ZXMsIGZlYXR1cmUuY3JlYXRlZExhdGl0dWRlLCBmZWF0dXJlLmNyZWF0ZWRMb25naXR1ZGUsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHZhbHVlcy51cGRhdGVkX2xhdGl0dWRlID0gZmVhdHVyZS51cGRhdGVkTGF0aXR1ZGU7XG4gICAgdmFsdWVzLnVwZGF0ZWRfbG9uZ2l0dWRlID0gZmVhdHVyZS51cGRhdGVkTG9uZ2l0dWRlO1xuICAgIHZhbHVlcy51cGRhdGVkX2FsdGl0dWRlID0gZmVhdHVyZS51cGRhdGVkQWx0aXR1ZGU7XG4gICAgdmFsdWVzLnVwZGF0ZWRfaG9yaXpvbnRhbF9hY2N1cmFjeSA9IGZlYXR1cmUudXBkYXRlZEFjY3VyYWN5O1xuXG4gICAgaWYgKGZlYXR1cmUuaGFzVXBkYXRlZENvb3JkaW5hdGUpIHtcbiAgICAgIHZhbHVlcy51cGRhdGVkX2dlb21ldHJ5ID0gdGhpcy5zZXR1cFBvaW50KHZhbHVlcywgZmVhdHVyZS51cGRhdGVkTGF0aXR1ZGUsIGZlYXR1cmUudXBkYXRlZExvbmdpdHVkZSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHN0YXRpYyBkZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50KGRiLCByZWNvcmQsIHRhYmxlTmFtZSkge1xuICAgIHJldHVybiBkYi5kZWxldGVTdGF0ZW1lbnQodGFibGVOYW1lLCB7cmVjb3JkX3Jlc291cmNlX2lkOiByZWNvcmQuaWR9KTtcbiAgfVxuXG4gIHN0YXRpYyBkZWxldGVSb3dzU3RhdGVtZW50KGRiLCB0YWJsZU5hbWUpIHtcbiAgICByZXR1cm4gZGIuZGVsZXRlU3RhdGVtZW50KHRhYmxlTmFtZSwge30pO1xuICB9XG5cbiAgc3RhdGljIGRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMoZGIsIHJlY29yZCwgZm9ybSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHJlcGVhdGFibGVzID0gZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IFtdO1xuXG4gICAgbGV0IHRhYmxlTmFtZSA9IHRoaXMudGFibGVOYW1lV2l0aEZvcm0oZm9ybSwgbnVsbCwgb3B0aW9ucyk7XG5cbiAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50KGRiLCByZWNvcmQsIHRhYmxlTmFtZSkpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIHJlcGVhdGFibGVzKSB7XG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUsIG9wdGlvbnMpO1xuXG4gICAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzRm9yUmVjb3JkU3RhdGVtZW50KGRiLCByZWNvcmQsIHRhYmxlTmFtZSkpO1xuICAgIH1cblxuICAgIHRhYmxlTmFtZSA9IHRoaXMubXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG9wdGlvbnMpO1xuXG4gICAgc3RhdGVtZW50cy5wdXNoKHRoaXMuZGVsZXRlUm93c0ZvclJlY29yZFN0YXRlbWVudChkYiwgcmVjb3JkLCB0YWJsZU5hbWUpKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuICB9XG5cbiAgc3RhdGljIGRlbGV0ZUZvckZvcm1TdGF0ZW1lbnRzKGRiLCBmb3JtLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcmVwZWF0YWJsZXMgPSBmb3JtLmVsZW1lbnRzT2ZUeXBlKCdSZXBlYXRhYmxlJyk7XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG5cbiAgICBsZXQgdGFibGVOYW1lID0gdGhpcy50YWJsZU5hbWVXaXRoRm9ybShmb3JtLCBudWxsLCBvcHRpb25zKTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NTdGF0ZW1lbnQoZGIsIHRhYmxlTmFtZSkpO1xuXG4gICAgZm9yIChjb25zdCByZXBlYXRhYmxlIG9mIHJlcGVhdGFibGVzKSB7XG4gICAgICB0YWJsZU5hbWUgPSB0aGlzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUsIG9wdGlvbnMpO1xuXG4gICAgICBzdGF0ZW1lbnRzLnB1c2godGhpcy5kZWxldGVSb3dzU3RhdGVtZW50KGRiLCB0YWJsZU5hbWUpKTtcbiAgICB9XG5cbiAgICB0YWJsZU5hbWUgPSB0aGlzLm11bHRpcGxlVmFsdWVUYWJsZU5hbWVXaXRoRm9ybShmb3JtLCBvcHRpb25zKTtcblxuICAgIHN0YXRlbWVudHMucHVzaCh0aGlzLmRlbGV0ZVJvd3NTdGF0ZW1lbnQoZGIsIHRhYmxlTmFtZSkpO1xuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG4gIH1cblxuICBzdGF0aWMgbXVsdGlwbGVWYWx1ZVRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIG9wdGlvbnMpIHtcbiAgICBjb25zdCBwcmVmaXggPSBvcHRpb25zICYmIG9wdGlvbnMuc2NoZW1hID8gb3B0aW9ucy5zY2hlbWEgKyAnLicgOiAnJztcblxuICAgIHJldHVybiBmb3JtYXQoJyVzJXNmb3JtXyVzX3ZhbHVlcycsIHByZWZpeCwgdGhpcy5hY2NvdW50UHJlZml4KGZvcm0sIG9wdGlvbnMpLCBmb3JtLnJvd0lEKTtcbiAgfVxuXG4gIHN0YXRpYyB0YWJsZU5hbWVXaXRoRm9ybShmb3JtLCByZXBlYXRhYmxlLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcHJlZml4ID0gb3B0aW9ucyAmJiBvcHRpb25zLnNjaGVtYSA/IG9wdGlvbnMuc2NoZW1hICsgJy4nIDogJyc7XG5cbiAgICBpZiAocmVwZWF0YWJsZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZm9ybWF0KCclcyVzZm9ybV8lcycsIHByZWZpeCwgdGhpcy5hY2NvdW50UHJlZml4KGZvcm0sIG9wdGlvbnMpLCBmb3JtLnJvd0lEKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZm9ybWF0KCclcyVzZm9ybV8lc18lcycsIHByZWZpeCwgdGhpcy5hY2NvdW50UHJlZml4KGZvcm0sIG9wdGlvbnMpLCBmb3JtLnJvd0lELCByZXBlYXRhYmxlLmtleSk7XG4gIH1cblxuICBzdGF0aWMgYWNjb3VudFByZWZpeChmb3JtLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuYWNjb3VudFByZWZpeCAhPSBudWxsID8gJ2FjY291bnRfJyArIGZvcm0uX2FjY291bnRSb3dJRCArICdfJyA6ICcnO1xuICB9XG5cbiAgc3RhdGljIHNldHVwU2VhcmNoKHZhbHVlcywgZmVhdHVyZSkge1xuICAgIGNvbnN0IHNlYXJjaGFibGVWYWx1ZSA9IGZlYXR1cmUuc2VhcmNoYWJsZVZhbHVlO1xuXG4gICAgdmFsdWVzLnJlY29yZF9pbmRleF90ZXh0ID0gc2VhcmNoYWJsZVZhbHVlO1xuICAgIHZhbHVlcy5yZWNvcmRfaW5kZXggPSB7cmF3OiBgdG9fdHN2ZWN0b3IoJHsgcGdmb3JtYXQoJyVMJywgc2VhcmNoYWJsZVZhbHVlKSB9KWB9O1xuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHN0YXRpYyBzZXR1cFBvaW50KHZhbHVlcywgbGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICAgIGNvbnN0IHdrdCA9IHBnZm9ybWF0KCdQT0lOVCglcyAlcyknLCBsb25naXR1ZGUsIGxhdGl0dWRlKTtcblxuICAgIHJldHVybiB7cmF3OiBgU1RfRm9yY2UyRChTVF9TZXRTUklEKFNUX0dlb21Gcm9tVGV4dCgnJHsgd2t0IH0nKSwgNDMyNikpYH07XG4gIH1cbn1cbiJdfQ==