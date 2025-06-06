import { Controller, Post, Get, Patch, Delete, Param, Body, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto'
import { UpdateReviewDto } from './dto/update-review.dto';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { Product } from 'src/products/entities/product.entity';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @UseGuards(JwtAuthGuard)
    @Post(':productId')
    addReview(
        @Req() req: Request, 
        @Param('productId') productId: string, 
        @Body() createReviewDto: CreateReviewDto){
            if(!req.user || !req.user?.id){
                throw new NotFoundException('User Not found')
            }
            const userId = req.user?.id;
            return this.reviewsService.addReview(userId, productId, createReviewDto)
        }

    @UseGuards(JwtAuthGuard)
    @Get(':productId')
    getReview(
        @Param('productId') productId : string
    ){
        return this.reviewsService.getReview(productId);
    }
    

}
