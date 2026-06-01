import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RequiredString } from 'src/common/helpers/validation/required-string.validation';

export class VerifyOtpDto {
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
    description: 'OTP Code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    type: String,
    required: true,
  })
  @RequiredString('OTP', 6, 6)
  otp: string;
}
