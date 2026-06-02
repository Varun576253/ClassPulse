const { randomUUID } = require('crypto');
const { query } = require('../config/db');

const asId = (value) => {
  if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
    return value._id || value.id || value.studentId || value.teacherId || value.sessionId || value;
  }

  return value;
};

const compact = (items) => items.filter((item) => item !== undefined && item !== null && item !== '');

const isUuidValue = (value) => (
  typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
);

const isPlainObject = (value) => (
  value
  && typeof value === 'object'
  && !Array.isArray(value)
  && !(value instanceof Date)
);

const isUuidColumn = (column) => column === 'id' || column.endsWith('_id');

const selectFields = (doc, fields) => {
  if (!doc || !fields) {
    return doc;
  }

  const picked = { _id: doc._id };
  fields.split(/\s+/).filter(Boolean).forEach((field) => {
    picked[field] = doc[field];
  });
  return picked;
};

const buildWhere = (filter = {}, columns, params = []) => {
  const clauses = [];

  Object.entries(filter || {}).forEach(([key, rawValue]) => {
    if (key === '$or' && Array.isArray(rawValue)) {
      const orParts = rawValue
        .map((item) => buildWhere(item, columns, params).clause)
        .filter(Boolean);

      if (orParts.length) {
        clauses.push(`(${orParts.join(' OR ')})`);
      }
      return;
    }

    const column = columns[key];
    if (!column) {
      return;
    }

    if (isPlainObject(rawValue) && Object.prototype.hasOwnProperty.call(rawValue, '$in')) {
      const values = compact(rawValue.$in.map(asId));
      const filteredValues = isUuidColumn(column) ? values.filter(isUuidValue) : values;

      if (!filteredValues.length) {
        clauses.push('FALSE');
        return;
      }

      params.push(filteredValues);
      const cast = isUuidColumn(column) ? '::uuid[]' : '';
      clauses.push(`${column} = ANY($${params.length}${cast})`);
      return;
    }

    if (isPlainObject(rawValue) && Object.prototype.hasOwnProperty.call(rawValue, '$gte')) {
      params.push(rawValue.$gte);
      clauses.push(`${column} >= $${params.length}`);
      return;
    }

    if (isPlainObject(rawValue) && Object.prototype.hasOwnProperty.call(rawValue, '$ne')) {
      const value = asId(rawValue.$ne);

      if (isUuidColumn(column) && !isUuidValue(value)) {
        return;
      }

      params.push(value);
      const cast = isUuidColumn(column) ? '::uuid' : '';
      clauses.push(`${column} <> $${params.length}${cast}`);
      return;
    }

    const value = asId(rawValue);

    if (isUuidColumn(column) && !isUuidValue(value)) {
      clauses.push('FALSE');
      return;
    }

    params.push(value);
    const cast = isUuidColumn(column) ? '::uuid' : '';
    clauses.push(`${column} = $${params.length}${cast}`);
  });

  return {
    clause: clauses.join(' AND '),
    params
  };
};

const toOrderBy = (sort = {}, columns) => {
  const pieces = Object.entries(sort)
    .map(([key, direction]) => {
      const column = columns[key];

      if (!column) {
        return null;
      }

      return `${column} ${Number(direction) < 0 ? 'DESC' : 'ASC'}`;
    })
    .filter(Boolean);

  return pieces.length ? ` ORDER BY ${pieces.join(', ')}` : '';
};

class QueryBuilder {
  constructor(model, mode, filter) {
    this.model = model;
    this.mode = mode;
    this.filter = filter || {};
    this.options = {
      sort: {},
      limit: null,
      lean: false,
      populates: []
    };
  }

  sort(sort) {
    this.options.sort = sort || {};
    return this;
  }

  limit(limit) {
    this.options.limit = limit;
    return this;
  }

  lean() {
    this.options.lean = true;
    return this;
  }

  populate(path, fields) {
    this.options.populates.push({ path, fields });
    return this;
  }

  async exec() {
    const result = await this.model._find(this.filter, {
      ...this.options,
      one: this.mode === 'one'
    });

    for (const populate of this.options.populates) {
      await this.model._populateResult(result, populate.path, populate.fields);
    }

    return result;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class PostgresModel {
  constructor(config) {
    this.table = config.table;
    this.columns = config.columns;
    this.jsonColumns = new Set(config.jsonColumns || []);
    this.defaults = config.defaults || (() => ({}));
    this.normalize = config.normalize || ((value) => value);
    this.populate = config.populate || (async () => undefined);
  }

  find(filter = {}) {
    return new QueryBuilder(this, 'many', filter);
  }

  findOne(filter = {}) {
    return new QueryBuilder(this, 'one', filter);
  }

  findById(id) {
    return new QueryBuilder(this, 'one', { _id: id });
  }

  async findByIdAndUpdate(id, update = {}, options = {}) {
    const result = await this.updateOne({ _id: id }, update);

    if (!result.matchedCount && !result.upsertedId) {
      return null;
    }

    const nextId = result.upsertedId || id;
    return options.new === false ? null : this.findById(nextId);
  }

  async create(input) {
    const data = this._prepare({ _id: randomUUID(), ...this.defaults(), ...input });
    const keys = Object.keys(this.columns).filter((key) => data[key] !== undefined);
    const params = [];
    const columns = [];
    const values = [];

    keys.forEach((key) => {
      params.push(this._dbValue(key, data[key]));
      columns.push(this.columns[key]);
      values.push(`$${params.length}${this.jsonColumns.has(key) ? '::jsonb' : ''}`);
    });

    const sql = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`;
    const result = await query(sql, params);
    return this._rowToDoc(result.rows[0]);
  }

  async insertMany(items = []) {
    const created = [];

    for (const item of items) {
      created.push(await this.create(item));
    }

    return created;
  }

  async deleteOne(filter = {}) {
    const existing = await this.findOne(filter).lean();
    if (!existing) return { deletedCount: 0 };
    const id = asId(existing._id);
    const result = await query(`DELETE FROM ${this.table} WHERE id = $1::uuid`, [id]);
    return { deletedCount: result.rowCount };
  }

  async deleteMany(filter = {}) {
    const { clause, params } = buildWhere(filter, this.columns);
    const result = await query(`DELETE FROM ${this.table}${clause ? ` WHERE ${clause}` : ''}`, params);
    return { deletedCount: result.rowCount };
  }

  async countDocuments(filter = {}) {
    const { clause, params } = buildWhere(filter, this.columns);
    const result = await query(`SELECT COUNT(*)::int AS count FROM ${this.table}${clause ? ` WHERE ${clause}` : ''}`, params);
    return Number(result.rows[0]?.count || 0);
  }

  async updateOne(filter = {}, update = {}, options = {}) {
    const existing = await this.findOne(filter).lean();

    if (existing) {
      const data = this._prepare({ ...existing, ...(update.$set || update) });
      const id = asId(existing._id);
      const keys = Object.keys(this.columns).filter((key) => key !== '_id' && data[key] !== undefined);
      const params = [];
      const assignments = keys.map((key) => {
        params.push(this._dbValue(key, data[key]));
        return `${this.columns[key]} = $${params.length}${this.jsonColumns.has(key) ? '::jsonb' : ''}`;
      });

      if (!assignments.length) {
        return { matchedCount: 1, modifiedCount: 0, upsertedId: null };
      }

      params.push(id);
      await query(
        `UPDATE ${this.table} SET ${assignments.join(', ')} WHERE id = $${params.length}::uuid`,
        params
      );
      return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
    }

    if (!options.upsert) {
      return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
    }

    const insert = { ...filter, ...(update.$setOnInsert || update.$set || update) };
    const doc = await this.create(insert);
    return { matchedCount: 0, modifiedCount: 0, upsertedId: doc._id };
  }

  async save(doc) {
    const data = this._prepare(doc);
    const id = asId(data._id);
    const keys = Object.keys(this.columns).filter((key) => key !== '_id' && data[key] !== undefined);
    const params = [];
    const assignments = keys.map((key) => {
      params.push(this._dbValue(key, data[key]));
      return `${this.columns[key]} = $${params.length}${this.jsonColumns.has(key) ? '::jsonb' : ''}`;
    });

    if (!assignments.length) {
      return doc;
    }

    params.push(id);
    const result = await query(
      `UPDATE ${this.table} SET ${assignments.join(', ')} WHERE id = $${params.length}::uuid RETURNING *`,
      params
    );

    const saved = this._rowToDoc(result.rows[0]);
    Object.assign(doc, saved);
    return doc;
  }

  async _find(filter, options) {
    const params = [];
    const { clause } = buildWhere(filter, this.columns, params);
    const orderBy = toOrderBy(options.sort, this.columns);
    const limit = options.one ? 1 : options.limit;
    const limitSql = limit ? ` LIMIT ${Number(limit)}` : '';
    const result = await query(`SELECT * FROM ${this.table}${clause ? ` WHERE ${clause}` : ''}${orderBy}${limitSql}`, params);
    const docs = result.rows.map((row) => this._rowToDoc(row, { lean: options.lean }));
    return options.one ? docs[0] || null : docs;
  }

  async _populateResult(result, path, fields) {
    if (!result) {
      return;
    }

    if (Array.isArray(result)) {
      for (const doc of result) {
        await this.populate(doc, path, fields, selectFields);
      }
      return;
    }

    await this.populate(result, path, fields, selectFields);
  }

  _prepare(data) {
    return this.normalize({ ...data });
  }

  _dbValue(key, value) {
    if (this.jsonColumns.has(key)) {
      if (value === null || value === undefined) {
        return null;
      }
      return JSON.stringify(value);
    }

    return asId(value);
  }

  _rowToDoc(row, options = {}) {
    if (!row) {
      return null;
    }

    const doc = {};

    Object.entries(this.columns).forEach(([key, column]) => {
      doc[key] = row[column];
    });

    if (!options.lean) {
      Object.defineProperty(doc, 'save', {
        value: async () => this.save(doc),
        enumerable: false
      });
    }

    return doc;
  }
}

const createModel = (config) => new PostgresModel(config);

module.exports = {
  asId,
  createModel,
  selectFields
};
