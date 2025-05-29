import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { CreateOrderDto, OrderItemDto } from './dto/createOrder.dto';
import { CommonResponse } from '../template/response';
import { UpdateOrderStatusDto } from './dto/updateOrderStatus.dto';
import { Request } from 'express';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    createOrder(
        @Req() req: Request & { user?: { id?: string; role?: string } },
        @Body() items: OrderItemDto[] // You might want to define a proper DTO type here
    ) {
        // Check if user exists in request (should be set by JwtAuthGuard) 
        if (!req.user) {
            throw new NotFoundException('User not found');
        }

        // Prepare the DTO for order creation
        const createOrderDto: CreateOrderDto = {
            userId: req.user.id!,
            items: items,
        };

        // Call service method to create the order
        return this.ordersService.createOrder(createOrderDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAllOrders() {
        return this.ordersService.findAllOrders();
    }

    @UseGuards(JwtAuthGuard)
    @Get('user')
    findUserOrders(
        @Req() req: Request & { user?: { id?: string; role?: string } }
    ) {
        if (!req.user) {
            throw new NotFoundException('User not found');
        }
        return this.ordersService.findOrdersByUserId(req.user.id!);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    getOrderById(
        @Param('id') orderId: string,
        @Req() req: Request & { user?: { id: string } },
    ) {
        if (!req.user) {
            throw new NotFoundException('User not found');
        }
        return this.ordersService.findOrderById(orderId, req.user.id);
    }

    @Patch('status/:id')
    @UseGuards(JwtAuthGuard)
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    ): Promise<CommonResponse> {
        return this.ordersService.updateOrderStatus(id, updateOrderStatusDto);
    }


    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    removeOrder(@Param('id') id: string) {
        return this.ordersService.removeOrder(id);
    }

}
