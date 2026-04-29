import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  describe('4xx responses', () => {
    it('should handle 400 Bad Request', () => {
      const exception = new BadRequestException('Invalid input');
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockRequest = { url: '/test' };

      const status = jest.spyOn(mockResponse, 'status');
      filter.catch(exception, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle 401 Unauthorized', () => {
      const exception = new HttpException(
        'Unauthorized',
        HttpStatus.UNAUTHORIZED,
      );
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockRequest = { url: '/test' };

      const status = jest.spyOn(mockResponse, 'status');
      filter.catch(exception, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle 403 Forbidden', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockRequest = { url: '/test' };

      const status = jest.spyOn(mockResponse, 'status');
      filter.catch(exception, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle 404 Not Found', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockRequest = { url: '/test' };

      const status = jest.spyOn(mockResponse, 'status');
      filter.catch(exception, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('5xx responses', () => {
    it('should handle 500 Internal Server Error', () => {
      const exception = new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockRequest = { url: '/test' };

      const status = jest.spyOn(mockResponse, 'status');
      filter.catch(exception, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle 503 Service Unavailable', () => {
      const exception = new HttpException(
        'Service Unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockRequest = { url: '/test' };

      const status = jest.spyOn(mockResponse, 'status');
      filter.catch(exception, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('validation error handling', () => {
    it('should handle validation errors with error array', () => {
      const validationException = new HttpException(
        { message: 'Validation failed', errors: ['Field required'] },
        HttpStatus.BAD_REQUEST,
      );
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockRequest = { url: '/test' };

      const status = jest.spyOn(mockResponse, 'status');
      filter.catch(validationException, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
