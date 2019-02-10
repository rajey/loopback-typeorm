import {LoopbackTypeormApplication} from './application';
import {ApplicationConfig} from '@loopback/core';
import {TypeORMDataSource} from './datasources/typeorm.datasource';

export {LoopbackTypeormApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new LoopbackTypeormApplication(options);
  await app.boot();
  await app.start();

  // set data source
  console.log('Attempt connecting to database...');
  const dataSource = new TypeORMDataSource();
  await dataSource.connect();
  console.log('Connected to the database');

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  return app;
}
