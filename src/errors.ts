import RequestResult from './RequestResult';

/**
 * FaunaDB error types. Request errors can originate from
 * the client (e.g. bad method parameters) or from the FaunaDB Server (e.g.
 * invalid queries, timeouts.) Server errors will subclass
 * {@link module:errors~FaunaHTTPError}.
 *
 * @module errors
 */

/**
 * The base exception type for all FaunaDB errors.
 *
 * @param {string} message
 * @extends Error
 * @constructor
 */
export class FaunaError extends Error {
    constructor(public name: string, message: string) {
        super(message);
        this.name = name;
    }
}

/**
 * Exception thrown by this client library when an invalid
 * value is provided as a function argument.
 *
 * @extends module:errors~FaunaError
 * @constructor
 */
export class InvalidValue extends FaunaError {
    constructor(message: string) {
        super('InvalidValue', message);
    }
}

/**
 * Exception thrown by this client library when an invalid
 * value is provided as a function argument.
 *
 * @extends module:errors~FaunaError
 * @constructor
 */
export class InvalidArity extends FaunaError {
    constructor(public min: number, public max: number, public actual: number) {
        super(
            'InvalidArity',
            'Function requires ' +
                messageForArity(min, max) +
                ' arguments but ' +
                actual +
                ' were given.',
        );

        function messageForArity(min: number, max: number) {
            if (max === null) return 'at least ' + min;
            if (min === null) return 'up to ' + max;
            if (min === max) return min;
            return 'from ' + min + ' to ' + max;
        }
    }
}

/**
 * Base exception type for errors returned by the FaunaDB server.
 *
 * @param {RequestResult} requestResult
 *
 * @extends module:errors~FaunaError
 * @constructor
 */
export class FaunaHTTPError extends FaunaError {
    constructor(name: string, public requestResult: RequestResult) {
        super(
            name,
            requestResult.responseContent.errors.length === 0
                ? '(empty "errors")'
                : requestResult.responseContent.errors[0].code,
        );
    }

    static raiseForStatusCode(requestResult: RequestResult) {
        var code = requestResult.statusCode;
        if (code < 200 || code >= 300) {
            switch (code) {
                case 400:
                    throw new BadRequest(requestResult);
                case 401:
                    throw new Unauthorized(requestResult);
                case 403:
                    throw new PermissionDenied(requestResult);
                case 404:
                    throw new NotFound(requestResult);
                case 405:
                    throw new MethodNotAllowed(requestResult);
                case 500:
                    throw new InternalError(requestResult);
                case 503:
                    throw new UnavailableError(requestResult);
                default:
                    throw new FaunaHTTPError('UnknownError', requestResult);
            }
        }
    }

    errors() {
        return this.requestResult.responseContent.errors;
    }
}

/**
 * A HTTP 400 error.
 *
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export class BadRequest extends FaunaHTTPError {
    constructor(requestResult: RequestResult) {
        super('BadRequest', requestResult);
    }
}

/**
 * A HTTP 401 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export class Unauthorized extends FaunaHTTPError {
    constructor(requestResult: RequestResult) {
        super('Unauthorized', requestResult);
    }
}

/**
 * A HTTP 403 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export class PermissionDenied extends FaunaHTTPError {
    constructor(requestResult: RequestResult) {
        super('PermissionDenied', requestResult);
    }
}

/**
 * A HTTP 404 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export class NotFound extends FaunaHTTPError {
    constructor(requestResult: RequestResult) {
        super('NotFound', requestResult);
    }
}

/**
 * A HTTP 405 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export class MethodNotAllowed extends FaunaHTTPError {
    constructor(requestResult: RequestResult) {
        super('MethodNotAllowed', requestResult);
    }
}

/**
 * A HTTP 500 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export class InternalError extends FaunaHTTPError {
    constructor(requestResult: RequestResult) {
        super('InternalError', requestResult);
    }
}

/**
 * A HTTP 503 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export class UnavailableError extends FaunaHTTPError {
    constructor(requestResult: RequestResult) {
        super('UnavailableError', requestResult);
    }
}
