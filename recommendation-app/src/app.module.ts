import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { RecommendationModule } from './recommendation/recommendation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('MYSQL_HOST', 'localhost'), // Sử dụng localhost
        port: configService.get('MYSQL_PORT', 3307),        // Thay đổi cổng thành 3307
        username: configService.get('MYSQL_USER', 'root'),
        password: configService.get('MYSQL_ROOT_PASSWORD', 'rootpassword'),
        database: configService.get('MYSQL_DATABASE', 'minimart'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    ProductModule,
    OrderModule,
    RecommendationModule,
  ],
})
export class AppModule {}