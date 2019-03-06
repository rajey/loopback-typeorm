import {Entity, model, property} from '@loopback/repository';
import {Column, Entity as TypeormEntity, PrimaryGeneratedColumn} from 'typeorm';

@TypeormEntity()
export class User extends Entity {
  @property({
    type: 'number',
    id: true,
  })
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  age: number;

  getId() {
    return this.id;
  }

  constructor(data?: Partial<User>) {
    super(data);
  }
}
