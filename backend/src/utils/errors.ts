export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
  }
}