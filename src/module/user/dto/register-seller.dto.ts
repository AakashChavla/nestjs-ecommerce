import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { REGEX } from '../../../common/constant/regex';
import { RequiredString } from '../../../common/helpers/validation/RequiredString.validation';

export class RegisterSellerDto {
  @ApiProperty({
    description: 'Seller Email Address',
    example: 'john.doe.@example.com',
    minLength: 2,
    maxLength: 100,
    type: String,
    required: true,
  })
  @RequiredString('Email', 5, 100)
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('validation.invalid', {
        field: 'Email Address',
      }),
    },
  )
  email: string;

  @ApiProperty({
    description: 'Enter Seller Name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
    type: String,
    required: true,
  })
  @RequiredString('Name', 2, 100)
  name: string;

  @ApiProperty({
    description: 'Enter Seller Password',
    example: 'Secure@123#',
    minLength: 8,
    maxLength: 128,
    type: String,
    required: true,
    format: 'password',
  })
  @RequiredString('Password', 8, 128)
  @Matches(REGEX.PASSWORD, {
    message: i18nValidationMessage('validation.password_strength', {
      field: 'Password',
    }),
  })
  password: string;
}
