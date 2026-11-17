export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`, "not_found");
export const forbidden = (msg = "You do not have access to this resource") => new HttpError(403, msg, "forbidden");
export const badRequest = (msg: string) => new HttpError(400, msg, "bad_request");
export const conflict = (msg: string) => new HttpError(409, msg, "conflict");
export const unavailable = (msg: string) => new HttpError(503, msg, "unavailable");
