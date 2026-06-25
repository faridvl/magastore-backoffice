import { ApiErrorCodes } from "./error-code";

export class FetchError extends Error {
  code?: ApiErrorCodes;

  httpStatus?: number;

  traceId?: string;

  constructor(message: string, code?: ApiErrorCodes, httpStatus?: number, traceId?: string) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.traceId = traceId;
  }
}
