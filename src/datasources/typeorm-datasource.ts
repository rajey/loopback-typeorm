// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/repository-typeorm
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import {Connection, createConnection, ObjectType, Repository} from 'typeorm';

export class TypeORMDataSource {
  connection: Connection;

  constructor() {}

  async connect(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }
    this.connection = await createConnection();
    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    await this.connection.close();
  }

  async getEntityManager() {
    await this.connect();
    return this.connection.createEntityManager();
  }

  async getRepository<T>(entityClass: ObjectType<T>): Promise<Repository<T>> {
    await this.connect();
    return this.connection.getRepository(entityClass);
  }
}
