import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateCartItemDto {
  @IsNotEmpty()
  @IsNumber()
  productId: String;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}