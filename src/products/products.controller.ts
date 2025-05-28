import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Req, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { Request } from 'express';
import { CommonResponse } from '../template/response';



@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @UseGuards(JwtAuthGuard)

    // create Product : 
    @UseGuards(JwtAuthGuard)
    @Post()
    async createProduct(
        @Req() req: Request & { user?: { id?: string; role?: string } },
        @Body() createProductDto: CreateProductDto
    ): Promise<CommonResponse> {
        const id = req.user?.id;

        if (!id) {
            return {
                status: HttpStatus.UNAUTHORIZED,
                message: 'Token is required',
            };
        }

        if (req.user?.role !== 'admin') {
            return {
                status: HttpStatus.UNAUTHORIZED,
                message: 'You are not authorized to create products',
            };
        }

        // Proceed with product creation
        return this.productsService.createProduct(id, createProductDto);
    }


    @Get()
    findAllProducts() {
        return this.productsService.findAllProducts();
    }

    @Get(':id')
    findProductById(@Param('id') id: string) {
        return this.productsService.findProductById(id);
    }

    @Patch(':id')
    updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.updateProduct(id, updateProductDto);
    }


    //create categories : done
    @UseGuards(JwtAuthGuard)
    @Post('categories')
    async createCategory(
        @Req() req: Request & { user?: { id?: string; role?: string } },
        @Body() createCategoryDto: CreateCategoryDto,
    ): Promise<CommonResponse> {
        const id = req.user?.id;
        if (!id) {
            return {
                status: HttpStatus.UNAUTHORIZED,
                message: 'Token is required',
            };
        }
        if (req.user?.role !== 'admin') {
            return {
                status: HttpStatus.UNAUTHORIZED,
                message: 'You are not authorized to create categories',
            };
        }
        return this.productsService.createCategory(createCategoryDto);
    }


    @UseGuards(JwtAuthGuard)
    @Get('categories')
    findAllCategories() {
        return this.productsService.findAllCategories();
    }

    @Get('categories/:id')
    findCategoryById(@Param('id') id: string) {
        return this.productsService.findCategoryById(id);
    }

    @Patch('categories/:id')
    updateCategory(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
        return this.productsService.updateCategory(id, updateCategoryDto);
    }

    @Delete('categories/:id')
    removeCategory(@Param('id') id: string) {
        return this.productsService.removeCategory(id);
    }
}
