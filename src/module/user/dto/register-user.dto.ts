import { IsEmail, Matches } from 'class-validator';
import { REGEX } from '../../../common/constant/regex';
import { RequiredString } from '../../../common/helpers/validation/RequiredString.validation';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterUserDto {
  @ApiProperty({
    description: 'User Email Address',
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
    description: 'Enter User First Name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
    type: String,
    required: true,
  })
  @RequiredString('First Name', 2, 50)
  firstName: string;

  @ApiProperty({
    description: 'Enter User Last Name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
    type: String,
    required: true,
  })
  @RequiredString('Last Name', 2, 50)
  lastName: string;

  @ApiProperty({
    description: 'Enter User Password',
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
