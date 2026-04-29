import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export function RequiredString(
  field: string,
  minLength = 2,
  maxLength?: number,
) {
  return function (target: object, propertyKey: string) {
    // Required check
    IsNotEmpty({
      message: i18nValidationMessage('validation.is_required', {
        field,
      }),
    })(target, propertyKey);

    // String type check
    IsString({
      message: i18nValidationMessage('validation.invalid', {
        field,
      }),
    })(target, propertyKey);

    // Minimum length
    if (minLength) {
      MinLength(minLength, {
        message: i18nValidationMessage('validation.min_character', {
          field,
          count: minLength,
        }),
      })(target, propertyKey);
    }

    // Maximum length (optional)
    if (maxLength) {
      MaxLength(maxLength, {
        message: i18nValidationMessage('validation.max_character', {
          field,
          count: maxLength,
        }),
      })(target, propertyKey);
    }
  };
}
