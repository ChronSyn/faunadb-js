import * as request from 'superagent';
import * as errors from './errors';
import * as query from './query';
import * as values from './values';
import * as json from './_json';
import RequestResult, { HTTPMethod } from './RequestResult';
import * as util from './_util';
import PageHelper from './PageHelper';
import Expr from './Expr';

interface ClientConfig {
    domain?: string;
    scheme?: 'http' | 'https';
    port?: number;
    secret: string;
    timeout?: number;
    observer?: (res: RequestResult) => void;
}
export default class Client {
    _baseUrl: string;
    _timeout: number;
    _secret: string;
    _observer: string;
    _lastSeen: string;
    constructor(options: ClientConfig) {
        const opts = Object.assign(
            {
                domain: 'db.fauna.com',
                scheme: 'https',
                port: null,
                secret: null,
                timeout: 60,
                observer: null,
            },
            options,
        );

        if (opts.port === null) {
            opts.port = opts.scheme === 'https' ? 443 : 80;
        }

        this._baseUrl = opts.scheme + '://' + opts.domain + ':' + opts.port;
        this._timeout = Math.floor(opts.timeout * 1000);
        this._secret = opts.secret;
        this._observer = opts.observer;
        this._lastSeen = null;
    }
    query(expression: Expr) {
        return this._execute('POST', '', query.wrap(expression));
    }
    paginate(expression: Expr, params: { [key: string]: any } = {}) {
        return new PageHelper(this, expression, params);
    }
    ping(scope: string, timeout: number) {
        return this._execute('GET', 'ping', null, {
            scope: scope,
            timeout: timeout,
        });
    }
    _execute = function(
        action: HTTPMethod,
        path: values.Ref | string,
        data: any,
        query?: any,
    ) {
        query = query || null;

        if (path instanceof values.Ref) {
            path = path.value;
        }

        if (query !== null) {
            query = util.removeUndefinedValues(query);
        }

        const startTime = Date.now();
        const self = this;
        return this._performRequest(action, path, data, query).then(function(
            response: any,
            rawQuery: any,
        ) {
            const endTime = Date.now();
            const responseObject = json.parseJSON(response.text);
            const requestResult = new RequestResult(
                self,
                action,
                path as string,
                query,
                rawQuery,
                data,
                response.text,
                responseObject,
                response.status,
                response.header,
                startTime,
                endTime,
            );

            if ('x-last-seen-txn' in response.header) {
                var time = parseInt(response.header['x-last-seen-txn'], 10);

                if (self._lastSeen == null) {
                    self._lastSeen = time;
                } else if (self._lastSeen < time) {
                    self._lastSeen = time;
                }
            }

            if (self._observer != null) {
                self._observer(requestResult);
            }

            errors.FaunaHTTPError.raiseForStatusCode(requestResult);
            return responseObject['resource'];
        });
    };
    _performRequest(
        action: HTTPMethod,
        path: string,
        data: { [key: string]: any },
        query: any,
    ) {
        var rq = request(action, this._baseUrl + '/' + path);
        if (query) {
            rq.query(query);
        }

        if (action !== 'GET') {
            var rawQuery = JSON.stringify(data);
            rq.type('json');
            rq.send(rawQuery);
        }

        if (this._secret) {
            rq.set('Authorization', secretHeader(this._secret));
        }

        if (this._lastSeen) {
            rq.set('X-Last-Seen-Txn', this._lastSeen);
        }

        rq.set('X-FaunaDB-API-Version', '2.1');

        rq.timeout(this._timeout);

        return new Promise(function(resolve, reject) {
            rq.end(function(error, result) {
                // superagent treates 4xx and 5xx status codes as exceptions. We'll handle those ourselves.
                if (error && error.response === undefined) {
                    reject(error);
                } else if (
                    error &&
                    error.response &&
                    !(
                        error.response.status >= 400 &&
                        error.response.status <= 599
                    )
                ) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
}

function secretHeader(secret: string) {
    return 'Basic ' + new Buffer(secret + ':', 'binary').toString('base64');
}
