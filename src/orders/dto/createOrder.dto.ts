import { IsNotEmpty, IsNumber, IsArray, ArrayNotEmpty } from 'class-validator';

export class OrderItemDto {
  @IsNotEmpty()
  @IsNumber()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @IsNotEmpty()
  @IsNumber()
  userId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  items: OrderItemDto[];
}