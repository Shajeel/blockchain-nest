import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceService } from './prices.service';
import { PriceController } from './prices.controller';
import { Price } from './price.entity';
import { Alert } from './alert.entity';
import { EmailModule } from '../email/email.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [
        TypeOrmModule.forFeature([Price, Alert]),
        EmailModule,
        ScheduleModule.forRoot(),
    ],
    providers: [PriceService],
    controllers: [PriceController],
})
export class PricesModule {}
