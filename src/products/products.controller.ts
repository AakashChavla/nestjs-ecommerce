import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Req, HttpStatus, UnauthorizedException, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { Request } from 'express';
import { CommonResponse } from '../template/response';
import { FilterProductDto } from './dto/filter-product.dto';



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

    @Get('prod/:id')
    findProductById(@Param('id') id: string) {
        return this.productsService.findProductById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    updateProduct(
        @Req() req: Request,
        @Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<CommonResponse> {
        if (!req.user) {
            throw new UnauthorizedException('User not found in request');
        }
        const userId = req.user.id;
        return this.productsService.updateProduct(userId, id, updateProductDto);
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

    @Get('categories')
    findAllCategories() {
        return this.productsService.findAllCategories();
    }

    @Get('categories/:id')
    findCategoryById(@Param('id') id: string) {
        return this.productsService.findCategoryById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('categories/:id')
    updateCategory(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto) {
        return this.productsService.updateCategory(id, updateCategoryDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('categories/:id')
    removeCategory(@Param('id') id: string) {
        return this.productsService.removeCategory(id);
    }

    @Get('search')
    searchProducts(@Query('query') query: string) {
        return this.productsService.searchProducts(query);
    }

    @Get('filter')
    filterProducts(@Query() filterProductDto: FilterProductDto) {
        return this.productsService.filterProducts(filterProductDto);
    }

}
