// alert.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlertDto {
    @ApiProperty({ description: 'The blockchain chain (e.g., ethereum, polygon)' })
    chain: string;

    @ApiProperty({ description: 'The target price for the alert in USD' })
    price: number;

    @ApiProperty({ description: 'The email address to send alerts to' })
    email: string;
}
