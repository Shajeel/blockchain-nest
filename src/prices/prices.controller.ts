import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { PriceService } from './prices.service';
import { Price } from './price.entity';
import {CreateAlertDto} from "./alert.dto";
import { ApiResponse } from '@nestjs/swagger';

@Controller('prices')
export class PriceController {
    constructor(private readonly priceService: PriceService) {}

    @Get('hourly')
    async getHourlyPrices() {
        return this.priceService.getHourlyPrices();
    }

    @Post('alert')
    @ApiResponse({ status: 201, description: 'Alert successfully created.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    async setAlert(@Body() body: CreateAlertDto) {
        return this.priceService.setAlert(body.chain, body.price, body.email);
    }

    @Get('swap-rate/:ethAmount')
    async getSwapRate(@Param('ethAmount') ethAmount: number) {
        return this.priceService.getSwapRate(ethAmount);
    }
}
