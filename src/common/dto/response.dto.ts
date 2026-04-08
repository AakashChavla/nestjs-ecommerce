// src/common/dto/response.dto.ts
export class ResponseDto<T> {
  success: boolean;
  message: string;
  data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success<T>(message: string, data?: T): ResponseDto<T> {
    return new ResponseDto(true, message, data);
  }

  static error(message: string): ResponseDto<null> {
    return new ResponseDto(false, message);
  }
}
