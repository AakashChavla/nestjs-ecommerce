import { Controller, Post, Get, Patch, Delete, Param, Body, Req, UseGuards, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/createCartItem.dto';
import { UpdateCartItemDto } from './dto/updateCartItem.dto';
import { CommonResponse } from 'src/template/response';
import { Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
@Controller('cart')
export class CartController {
    constructor(
        private readonly cartService: CartService
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('add')
    addItem(
        @Req() req: Request & { user?: { id?: string; role?: string } },
        @Body() createCartItemDto: CreateCartItemDto
    ) {
        if (!req.user || !req.user.id) {
            throw new NotFoundException('User not found');
        }
        const userId = req.user.id;

        return this.cartService.addItem(userId, createCartItemDto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('update/:itemId')
    updateCart(
        @Req() req: Request & { user?: { id?: string; } },
        @Param('itemId') itemId: string,
        @Body() updateCartItemDto: UpdateCartItemDto,
        
    ) {
        if (!req.user || !req.user.id) {
            throw new UnauthorizedException('User not found');
        }
        return this.cartService.updateCart(req.user?.id, itemId, updateCartItemDto)
    }


    @UseGuards(JwtAuthGuard)
    @Get('summary')
    getCartSummary(
        @Req() req: Request & { user?: { id?: string; } }
    ) {
        if (!req.user || !req.user.id) {
            throw new NotFoundException('User not found');
        }
        return this.cartService.findOrCreateCart(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('remove/:itemId')
    removeItem(
        @Req() req: Request & { user?: { id?: string; } },
        @Param('itemId') itemId: string
    ){
        if (!req.user || !req.user.id) {
            throw new UnauthorizedException('User not found');
        }
        return this.cartService.removeItem(req.user.id, itemId);
    }

    @
    @Post('checkout')


}