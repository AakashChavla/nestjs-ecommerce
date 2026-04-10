import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RequiredString } from 'src/common/helpers/validation/RequiredString.validation';

export class LoginDto {
  @ApiProperty({
    description: 'Enter The User Mail',
    example: 'john.doe@example.com',
    type: String,
    required: true,
    minLength: 5,
    maxLength: 50,
  })
  @RequiredString('Email', 5, 50)
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
    description: 'Enter Password',
    example: 'Secure@123#',
    minLength: 8,
    type: String,
    required: true,
  })
  @RequiredString('Password', 8)
  password: string;
}
