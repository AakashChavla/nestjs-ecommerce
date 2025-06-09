import { Controller, Delete, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { Request } from 'express';

@Controller('wishlist')
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) { }

    @UseGuards(JwtAuthGuard)
    @Post(':productId')
    async addToWishList(
        @Req() req: Request,
        @Param('productId') productId: string
    ) {
        if (!req.user || !req.user.id) {
            throw new NotFoundException('User Not Found')
        }
        const userId = req.user.id;
        return await this.wishlistService.addToWishlist(userId, productId)
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':productId')
    async removeFromWishList(
        @Req() req: Request,
        @Param('productId') productId: string
    ) {
        if (!req.user || !req.user.id) {
            throw new NotFoundException('User Not Found')
        }
        const userId = req.user.id;
        return await this.wishlistService.removeFromWishList(userId, productId)
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getWishlist(
        @Req() req: Request,
    ) {
        if (!req.user || !req.user.id) {
            throw new NotFoundException('User Not Found')
        }
        const userId = req.user.id;
        return await this.wishlistService.getWishlist(userId);
    }
}
