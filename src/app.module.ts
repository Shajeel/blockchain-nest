import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {PricesModule} from "./prices/prices.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule globally available
      envFilePath: '.env', // Path to the .env file (default is `.env`)
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: +process.env.DATABASE_PORT,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST, // SMTP server host
        port: +process.env.SMTP_PORT, // SMTP port (usually 587 or 465)
        secure: false, // Use true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER, // Your email
          pass: process.env.SMTP_PASSWORD, // Your email password
        },
      },
      defaults: {
        from: `"No Reply" <${process.env.FROM_EMAIL}>`, // Default sender address
      },
    }),
    PricesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

