// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/repository-typeorm
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import {
  AnyObject,
  DataObject,
  Entity,
  EntityCrudRepository,
  Filter,
  Options,
  Where,
  Count,
  DeepPartial,
} from '@loopback/repository';
import * as debugModule from 'debug';
import {Repository, SelectQueryBuilder} from 'typeorm';
import {OrderByCondition} from 'typeorm/find-options/OrderByCondition';

import {TypeORMDataSource} from '../datasources/typeorm-datasource';

const debug = debugModule('loopback:repository:typeorm');

/**
 * An implementation of EntityCrudRepository using TypeORM
 */
export class TypeORMRepository<T extends Entity, ID>
  implements EntityCrudRepository<T, ID> {
  typeOrmRepository: Repository<T>;

  constructor(
    public dataSource: TypeORMDataSource,
    public entityClass: typeof Entity & {prototype: T},
  ) {}

  private async init() {
    if (this.typeOrmRepository != null) return;
    this.typeOrmRepository = <Repository<T>>(
      await this.dataSource.getRepository(this.entityClass)
    );
  }

  async save(entity: DataObject<T>, options?: Options): Promise<T> {
    await this.init();
    const result = await this.typeOrmRepository.save(<DeepPartial<T>>entity);
    return <T>result;
  }

  // TODO: FIND A WAY TO USE  DataObject<T> TYPE  INSTEAD OF ANY
  async update(entity: any, options?: Options): Promise<void> {
    await this.init();
    await this.typeOrmRepository.update(entity.getId(), <DeepPartial<T>>entity);
  }

  // TODO: FIND A WAY TO USE  DataObject<T> TYPE  INSTEAD OF ANY
  async delete(entity: any, options?: Options): Promise<void> {
    await this.init();
    await this.typeOrmRepository.delete(entity.getId());
  }

  async findById(id: ID, filter?: Filter, options?: Options): Promise<T> {
    await this.init();
    const result = await this.typeOrmRepository.findOne(id);
    if (result == null) {
      throw new Error('Not found');
    }
    return result;
  }

  async updateById(
    id: ID,
    data: DataObject<T>,
    options?: Options,
  ): Promise<void> {
    await this.init();
    await this.typeOrmRepository.update(id, <DeepPartial<T>>data);
  }

  async replaceById(
    id: ID,
    data: DataObject<T>,
    options?: Options,
  ): Promise<void> {
    await this.init();
    // FIXME [rfeng]: TypeORM doesn't have a method for `replace`
    await this.typeOrmRepository.update(id, <DeepPartial<T>>data);
  }

  async deleteById(id: ID, options?: Options): Promise<void> {
    await this.init();
    await this.typeOrmRepository.delete(id);
  }

  async exists(id: ID, options?: Options): Promise<boolean> {
    await this.init();
    const result = await this.typeOrmRepository.findOne(id);
    return result != null;
  }

  async create(dataObject: DataObject<T>, options?: Options): Promise<T> {
    await this.init();
    // Please note typeOrmRepository.create() only instantiates model instances.
    // It does not persist to the database.
    const result = await this.typeOrmRepository.save(<DeepPartial<T>>(
      dataObject
    ));
    return <T>result;
  }

  async createAll(
    dataObjects: DataObject<T>[],
    options?: Options,
  ): Promise<T[]> {
    await this.init();
    const result = await this.typeOrmRepository.save(<DeepPartial<T>[]>(
      dataObjects
    ));
    return <T[]>result;
  }

  async find(filter?: Filter, options?: Options): Promise<T[]> {
    await this.init();
    const queryBuilder = await this.buildQuery(filter);
    if (debug.enabled) debug('find: %s', queryBuilder.getSql());
    const result = queryBuilder.getMany();
    return result;
  }

  async updateAll(
    dataObject: DataObject<T>,
    where?: Where,
    options?: Options,
  ): Promise<Count> {
    await this.init();
    const queryBuilder = await this.buildUpdate(dataObject, where);
    if (debug.enabled) debug('updateAll: %s', queryBuilder.getSql());
    // FIXME [rfeng]: The result is raw data from the DB driver and it varies
    // between different DBs
    const result = await queryBuilder.execute();
    return {count: result.raw};
  }

  async deleteAll(where?: Where, options?: Options): Promise<Count> {
    await this.init();
    const queryBuilder = await this.buildDelete(where);
    if (debug.enabled) debug('deleteAll: %s', queryBuilder.getSql());
    // FIXME [rfeng]: The result is raw data from the DB driver and it varies
    // between different DBs
    const result = await queryBuilder.execute();
    return {count: result.raw};
  }

  async count(where?: Where, options?: Options): Promise<Count> {
    await this.init();
    const result = await this.typeOrmRepository.count(<DeepPartial<T>>where);
    return {count: result};
  }

  async execute(
    query: string | AnyObject,
    // tslint:disable:no-any
    parameters: AnyObject | any[],
    options?: Options,
  ): Promise<AnyObject> {
    await this.init();
    const result = await this.typeOrmRepository.query(
      <string>query,
      <any[]>parameters,
    );
    return result;
  }

  /**
   * Convert order clauses to OrderByCondition
   * @param order An array of orders
   */
  buildOrder(order: string[]) {
    let orderBy: OrderByCondition = {};
    for (const o of order) {
      const match = /^([^\s]+)( (ASC|DESC))?$/.exec(o);
      if (!match) continue;
      const dir = (match[3] || 'ASC') as 'ASC' | 'DESC';
      orderBy[match[1]] = dir;
    }
    return orderBy;
  }

  /**
   * Build a TypeORM query from LoopBack Filter
   * @param filter Filter object
   */
  async buildQuery(filter?: Filter): Promise<SelectQueryBuilder<T>> {
    await this.init();
    const queryBuilder = this.typeOrmRepository.createQueryBuilder();
    if (!filter) return queryBuilder;
    queryBuilder.limit(filter.limit).offset(filter.offset);
    if (filter.fields) {
      queryBuilder.select(Object.keys(filter.fields));
    }
    if (filter.order) {
      queryBuilder.orderBy(this.buildOrder(filter.order));
    }
    if (filter.where) {
      queryBuilder.where(this.buildWhere(filter.where));
    }
    return queryBuilder;
  }

  /**
   * Convert where object into where clause
   * @param where Where object
   */

  // TODO: FIND A WAY TO REMOVE ANY TYPE
  buildWhere(where: any): string {
    const clauses: string[] = [];
    if (where.and) {
      const and = where.and
        .map((w: any) => `(${this.buildWhere(w)})`)
        .join(' AND ');
      clauses.push(and);
    }
    if (where.or) {
      const or = where.or
        .map((w: any) => `(${this.buildWhere(w)})`)
        .join(' OR ');
      clauses.push(or);
    }
    // FIXME [rfeng]: Build parameterized clauses
    for (const key in where) {
      let clause;
      if (key === 'and' || key === 'or') continue;
      const condition = where[key];
      if (condition.eq) {
        clause = `${key} = ${condition.eq}`;
      } else if (condition.neq) {
        clause = `${key} != ${condition.neq}`;
      } else if (condition.lt) {
        clause = `${key} < ${condition.lt}`;
      } else if (condition.lte) {
        clause = `${key} <= ${condition.lte}`;
      } else if (condition.gt) {
        clause = `${key} > ${condition.gt}`;
      } else if (condition.gte) {
        clause = `${key} >= ${condition.gte}`;
      } else if (condition.inq) {
        const vals = condition.inq.join(', ');
        clause = `${key} IN (${vals})`;
      } else if (condition.between) {
        const v1 = condition.between[0];
        const v2 = condition.between[1];
        clause = `${key} BETWEEN ${v1} AND ${v2}`;
      } else {
        // Shorthand form: {x:1} => X = 1
        clause = `${key} = ${condition}`;
      }
      clauses.push(clause);
    }
    return clauses.join(' AND ');
  }

  /**
   * Build an `update` statement from LoopBack-style parameters
   * @param dataObject Data object to be updated
   * @param where Where object
   */
  async buildUpdate(dataObject: DataObject<T>, where?: Where) {
    await this.init();
    let queryBuilder = this.typeOrmRepository
      .createQueryBuilder()
      .update(this.entityClass)
      .set(dataObject);
    if (where) queryBuilder.where(this.buildWhere(where));
    return queryBuilder;
  }

  /**
   * Build a `delete` statement from LoopBack-style parameters
   * @param where Where object
   */
  async buildDelete(where?: Where) {
    await this.init();
    let queryBuilder = this.typeOrmRepository
      .createQueryBuilder()
      .delete()
      .from(this.entityClass);
    if (where) queryBuilder.where(this.buildWhere(where));
    return queryBuilder;
  }
}
