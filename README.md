# loopback-typeorm

# Create Model/Entity

Models are powered by TypeORM, to create one

`typeorm entity:create -n <ModelName>`

eg if you want to create model/entity called User then run 'typeorm entity:create -n User',, This will create `User.ts` file in src/models directory

**NOTE**:

- models are automatically created with name the same as model name eg `User.ts` but in order for loopback cli to work while creating controllers and repository then this file should be renamed to eg `user.model.ts`
- Loopback cli also needs that models and repositories files being exported in a single index.ts file, so also add an export to index.ts file in the models folder, you can add the export like `export * from './user.model'`
