import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  ALLOWED_IMAGE_TYPES,
  FILE_LIMITS,
  FileValidationPipe,
} from 'src/common/config/s3/file-validation.pipe';
import { CurrentUser } from 'src/module/auth/decorator/current-user.decorator';
import { Roles } from 'src/module/auth/decorator/role.decorator';
import { JwtAuthGuard } from 'src/module/auth/guards/access-token.guard';
import { RoleGuard } from 'src/module/auth/guards/role.guard';
import type { AuthenticatedUser } from 'src/module/auth/types/auth.types';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductService } from './product.service';

@ApiTags('Product')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ── API 1 — POST /products ───────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product (seller)' })
  @ApiBody({ type: CreateProductDto })
  @ApiCreatedResponse({ description: 'Product created successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.create(dto, user.userId);
  }

  // ── API 2 — GET /products ────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List products (public)' })
  @ApiOkResponse({ description: 'Products retrieved successfully' })
  async findAll(@Query() filters: ProductFilterDto) {
    return this.productService.findAll(filters);
  }

  // ── API 3 — GET /products/:id ────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product by ID (public)' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiOkResponse({ description: 'Product retrieved successfully' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id);
  }

  // ── API 4 — PATCH /products/:id ─────────────────────────────────────────-

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (seller/admin)' })
  @ApiBody({ type: UpdateProductDto })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiOkResponse({ description: 'Product updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.update(id, dto, user);
  }

  // ── API 5 — DELETE /products/:id ─────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (seller/admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiOkResponse({ description: 'Product deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.remove(id, user);
  }

  // ── API 6 — POST /products/:id/images ────────────────────────────────────

  @Post(':id/images')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product image (seller)' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiOkResponse({ description: 'Product image uploaded successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async uploadImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile(
      new FileValidationPipe({
        allowedMimeTypes: ALLOWED_IMAGE_TYPES,
        maxSizeBytes: FILE_LIMITS.FIVE_MB,
        required: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Query('primary', new ParseBoolPipe({ optional: true }))
    isPrimary?: boolean,
  ) {
    return this.productService.uploadImage(productId, file, user, isPrimary);
  }

  // ── API 7 — DELETE /products/:id/images/:imageId ─────────────────────────

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product image (seller/admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiParam({ name: 'imageId', description: 'Image UUID', type: String })
  @ApiOkResponse({ description: 'Product image deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async deleteImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.deleteImage(productId, imageId, user);
  }

  // ── API 8 — POST /products/:id/variants ──────────────────────────────────

  @Post(':id/variants')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product variant (seller)' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiBody({ type: UpdateVariantDto })
  @ApiOkResponse({ description: 'Product variant added successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async addVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.addVariant(productId, dto, user);
  }

  // ── API 9 — PATCH /products/:id/variants/:variantId ──────────────────────

  @Patch(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product variant (seller/admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiParam({ name: 'variantId', description: 'Variant UUID', type: String })
  @ApiBody({ type: UpdateVariantDto })
  @ApiOkResponse({ description: 'Product variant updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async updateVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.updateVariant(productId, variantId, dto, user);
  }
}
