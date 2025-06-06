import { Controller, Post, Get, Patch, Delete, Param, Body, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto'
import { UpdateReviewDto } from './dto/update-review.dto';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';

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

    @UseGuards(JwtAuthGuard)
    @Patch(':reviewId')
    updateReview(
        @Req() req : Request,
        @Param('reviewId') reviewId: string,
        @Body() updateReviewDto : UpdateReviewDto
    ){
        if(!req.user || !req.user.id){
            throw new NotFoundException("userid not found")
        }
        const userId = req.user.id;
        return this.reviewsService.updateReviews(userId, reviewId, updateReviewDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':reviewId')
    deleteReview(
        @Req() req: Request,
        @Param('reviewId') reviewId : string,
    ){
        if(!req.user || !req.user.id || !req.user.role){
            throw new NotFoundException('user not found')
        }
        const userId = req.user.id;
        const role = req.user.role;
        return this.reviewsService.deleteReview(userId, reviewId, role);
    }
    

}
