import {User} from '../models';
import {TypeORMRepository} from './typeorm-repository';

export class UserRepository extends TypeORMRepository<
  User,
  typeof User.prototype.id
> {}
