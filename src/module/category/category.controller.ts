/**
 * Category Controller
 *
 * Public  : GET /categories/tree, GET /categories/:id, GET /categories/:id/children
 * ADMIN   : POST /categories, PATCH /categories/:id, DELETE /categories/:id
 * ADMIN   : GET /categories (flat list with search — for admin dashboard)
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/module/auth/decorator/role.decorator';
import { JwtAuthGuard } from 'src/module/auth/guards/access-token.guard';
import { RoleGuard } from 'src/module/auth/guards/role.guard';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Category')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ── API 1 — POST /categories ──────────────────────────────────────────────
  // ADMIN only — create a new category (root or nested)

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a category',
    description:
      'Creates a root category (no parentId) or a sub-category (with parentId). ' +
      'Slug is auto-generated from the name if not provided. Requires ADMIN role.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({ description: 'Category created successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // ── API 2 — GET /categories/tree ─────────────────────────────────────────
  // PUBLIC — returns the full category tree (root → children → grandchildren)
  // Used on: homepage, sidebar navigation, category browsing page

  @Get('tree')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get full category tree (public)',
    description:
      'Returns root categories with up to 2 levels of nested children. ' +
      'Only active, non-deleted categories are included. No auth required.',
  })
  @ApiOkResponse({ description: 'Category tree returned successfully' })
  async getTree() {
    return this.categoryService.getTree();
  }

  // ── API 3 — GET /categories ───────────────────────────────────────────────
  // ADMIN only — flat list with optional search
  // Used on: admin dashboard category management page

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all categories flat (admin)',
    description:
      'Returns all categories (including inactive) in a flat list. ' +
      'Supports keyword search by name. Requires ADMIN role.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by category name',
    example: 'electronics',
  })
  @ApiOkResponse({ description: 'Categories retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async findAll(@Query('search') search?: string) {
    return this.categoryService.findAll(search);
  }

  // ── API 4 — GET /categories/:id ───────────────────────────────────────────
  // PUBLIC — get a single category with its parent and immediate children
  // Used on: category detail / breadcrumb

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single category by ID (public)',
    description:
      'Returns the category along with its parent and direct children. ' +
      'Throws 404 if not found or soft-deleted.',
  })
  @ApiParam({ name: 'id', description: 'Category UUID', type: String })
  @ApiOkResponse({ description: 'Category retrieved successfully' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.findOne(id);
  }

  // ── API 5 — GET /categories/:id/children ─────────────────────────────────
  // PUBLIC — get all direct children of a category
  // Used on: drill-down navigation (click Electronics → show sub-categories)

  @Get(':id/children')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get direct children of a category (public)',
    description:
      'Returns the immediate child categories of the given parent. ' +
      'Only active, non-deleted children are returned.',
  })
  @ApiParam({ name: 'id', description: 'Parent category UUID', type: String })
  @ApiOkResponse({ description: 'Children retrieved successfully' })
  async getChildren(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.getChildren(id);
  }

  // ── API 6 — PATCH /categories/:id ────────────────────────────────────────
  // ADMIN only — update category (name, slug, icon, parent, active status)

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a category (admin)',
    description:
      'Update any field on a category. Slug is re-generated from name if name changes ' +
      'and no explicit slug is provided. Cannot set a category as its own parent. ' +
      'Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Category UUID', type: String })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({ description: 'Category updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  // ── API 7 — DELETE /categories/:id ───────────────────────────────────────
  // ADMIN only — soft-delete (sets deletedAt + isActive = false)

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete a category (admin)',
    description:
      'Marks the category as deleted and inactive. ' +
      'Does NOT hard-delete — the row stays in the DB and can be restored. ' +
      'Products linked to this category are NOT deleted. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Category UUID', type: String })
  @ApiOkResponse({ description: 'Category deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.remove(id);
  }
}
