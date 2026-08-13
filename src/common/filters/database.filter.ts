import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { DatabaseDriverError } from '../interfaces';
import { Request, Response } from 'express';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const driverError = exception.driverError as DatabaseDriverError;
    const errorCode = driverError.code;
    const table = driverError.table;
    let message = 'Internal server error with DB';
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    if (errorCode === '23514' && table === 'users') {
      message = 'Not enough money';
      httpStatus = HttpStatus.PAYMENT_REQUIRED;
    }

    response.status(httpStatus).json({
      statusCode: httpStatus,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
