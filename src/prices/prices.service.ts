import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, MoreThanOrEqual } from 'typeorm';
import { Price } from './price.entity';
import { Alert } from './alert.entity';
import { EmailService } from '../email/email.service';
import { Cron } from '@nestjs/schedule';
import Moralis from 'moralis';

@Injectable()
export class PriceService implements OnModuleInit {
    private previousPrices = new Map<string, number>();

    constructor(
        @InjectRepository(Price)
        private priceRepository: Repository<Price>,
        @InjectRepository(Alert) // Inject the Alert repository
        private alertRepository: Repository<Alert>,
        private emailService: EmailService,
    ) {}

    async onModuleInit() {
        await Moralis.start({
            apiKey: process.env.MORALIS_API_KEY,
        });
    }

    @Cron('*/5 * * * *')
    async savePrice() {
        const chains = ['ethereum', 'polygon'];
        const currentTime = new Date();

        for (const chain of chains) {
            const price = await this.fetchPrice(chain);
            if (price === null) {
                console.warn(`Price not found for ${chain}`);
                continue; // Skip to the next chain if price not found
            }

            await this.priceRepository.save({ chain, price, timestamp: currentTime });

            // Get the price from one hour ago
            const oneHourAgo = new Date(currentTime);
            oneHourAgo.setHours(currentTime.getHours() - 1);

            const historicalPrice = await this.priceRepository.createQueryBuilder('price')
                .where('price.chain = :chain', { chain })
                .andWhere('price.timestamp < :currentTime', { currentTime })
                .andWhere('price.timestamp > :oneHourAgo', { oneHourAgo })
                .orderBy('price.timestamp', 'DESC')
                .getOne(); // Get the latest price in the last hour

            if (historicalPrice && price > historicalPrice.price * 1.03) {
                await this.emailService.sendEmail(
                    process.env.ADMIN_EMAIL,
                    `${chain.toUpperCase()} Price Alert`,
                    `The price of ${chain} has increased by more than 3%! Current price: ${price}`,
                );
            }
            await this.checkAlerts(chain, price);
        }
    }

    private async fetchPrice(chain: string): Promise<any> {
        try {
            const response = await Moralis.EvmApi.marketData.getTopCryptoCurrenciesByMarketCap();

            const foundObject = response.raw.find(item => item.name.toLowerCase() === chain.toLowerCase());
            return foundObject ? foundObject.usd_price : null; // Return usd_price or null if not found
        } catch (e) {
            console.error(e.message);
        }
    }

    async getHourlyPrices(): Promise<{ hour: string; chain: string; highestPrice: number | null }[]> {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const hourlyPrices = await this.priceRepository
            .createQueryBuilder('price')
            .select('DATE_TRUNC(\'hour\', price.timestamp) AS hour')
            .addSelect('price.chain AS chain')
            .addSelect('MAX(price.price) AS highest') // Change AVG to MAX to get the highest price
            .where('price.timestamp > :oneDayAgo', { oneDayAgo })
            .groupBy('hour, price.chain') // Group by hour and chain
            .orderBy('hour', 'ASC')
            .addOrderBy('price.chain', 'ASC') // Order by chain as well
            .getRawMany();


        return hourlyPrices.map(record => ({
            hour: record.hour,
            chain: record.chain,
            highestPrice: record.highest, // Parse to float, return null if undefined
        }));
    }

    async setAlert(chain: string, targetPrice: number, email: string): Promise<void> {
        const existingAlert = await this.alertRepository.findOne({ where: { chain, email } });

        if (existingAlert) {
            existingAlert.targetPrice = targetPrice;
            await this.alertRepository.save(existingAlert);
        } else {
            const newAlert = this.alertRepository.create({ chain, targetPrice, email });
            await this.alertRepository.save(newAlert);
        }
    }

    private async checkAlerts(chain: string, price: number) {
        const alerts = await this.alertRepository.find({ where: { chain, targetPrice: MoreThanOrEqual(price) } });
        for (const alert of alerts) {
            await this.emailService.sendEmail(
                alert.email,
                `${chain.toUpperCase()} Price Alert`,
                `The price of ${chain} has reached your target price of ${alert.targetPrice}! Current price: ${price}`
            );
        }
    }

    async getSwapRate(ethAmount: number): Promise<{ btcAmount: number; totalFee: number }> {
        const btcRate = await this.fetchPrice('bitcoin'); // Replace with actual fetch logic
        const ethRate = await this.fetchPrice('ethereum'); // Replace with actual fetch logic
        const feePercentage = 0.03;
        const btcAmount = (ethAmount * ethRate)/btcRate;

        return { btcAmount, totalFee: ethAmount * feePercentage * ethRate };
    }
}
