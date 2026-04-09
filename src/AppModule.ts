import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TraceIdIssuanceMiddleware } from '@shared/middlewares/TraceIdIssuanceMiddleware';
import { config } from '@shared/config/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/AuthModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: config.MYSQL.HOST,
        port: config.MYSQL.PORT,
        username: config.MYSQL.USER,
        password: config.MYSQL.PASSWORD,
        database: config.MYSQL.DATABASE,
        synchronize: false,
        entities: [
          __dirname + '/**/entities/*Entity{.ts,.js}',
          __dirname + '/**/entities/*View{.ts,.js}',
        ],
        charset: 'utf8mb4',
        logging: true,
        connectTimeout: 10_000,
      }),
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error('Invalid options passed');
        }

        return addTransactionalDataSource(new DataSource(options));
      },
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdIssuanceMiddleware).forRoutes('*');
  }
}
