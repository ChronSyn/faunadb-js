import * as query from './query';
import Client from './Client';

/**
 * A FaunaDB Lambda expression to be passed into one of the collection
 * functions: Map or Filter.
 *
 * @callback PageHelper~collectionFunction
 * @param {any} var
 *   The variable passed in by FaunaDB when this Lambda
 *   function is executed.
 * @return {Expr}
 *   The FaunaDB query expression to be returned by this Lambda.
 */

/**
 * @callback PageHelper~eachFunction
 * @param {Object} page
 *   A page returned by FaunaDB's Paginate function.
 */

/**
 * A wrapper that provides a helpful API for consuming FaunaDB pages.
 *
 * Generally this is constructed through the {@link Client#paginate} method.
 *
 * The {@link PageHelper#map} and {@link PageHelper#filter} methods will wrap the underlying query with a Map
 * and Filter query function, respectively. These will be executed on the server when a promise-returning function
 * is called.
 *
 * The {@link PageHelper#each} and {@link PageHelper#eachReverse} functions dispatch queries to FaunaDB, and return Promises
 * representing the completion of those queries. The callbacks provided to these functions are executed locally when the
 * queries return.
 *
 * The {@link PageHelper#nextPage} and {@link PageHelper#previousPage} functions also dispatch queries to FaunaDB,
 * but return their responses in a wrapped Promise.
 *
 * @param {Client} client
 *   The FaunaDB client used to paginate.
 * @param {Object} set
 *   The set to paginate.
 * @param {?Object} params
 *   Parameters to be passed to the FaunaDB Paginate function.
 * @constructor
 */
export default class PageHelper {
    reverse = false;
    params: { [key: string]: any } = {};
    before: string = undefined;
    after: string = undefined;
    private _faunaFunctions: Function[] = [];
    constructor(
        public client: Client,
        public set: Object,
        params: { [key: string]: any } = {},
    ) {
        Object.assign(this.params, params);

        if ('before' in params) {
            this.before = params.before;
            delete this.params.before;
        } else if ('after' in params) {
            this.after = params.after;
            delete this.params.after;
        }
    }

    map(lambda) {
        var rv = this._clone();
        rv._faunaFunctions.push(function(q) {
            return query.Map(q, lambda);
        });
        return rv;
    }

    filter(lambda) {
        var rv = this._clone();
        rv._faunaFunctions.push(function(q) {
            return query.Filter(q, lambda);
        });
        return rv;
    }

    each(lambda) {
        return this._retrieveNextPage(this.after, false).then(
            this._consumePages(lambda, false),
        );
    }

    eachReverse(lambda) {
        return this._retrieveNextPage(this.before, true).then(
            this._consumePages(lambda, true),
        );
    }

    previousPage() {
        var self = this;
        return this._retrieveNextPage(this.before, true).then(
            this._adjustCursors.bind(self),
        );
    }

    nextPage() {
        var self = this;
        return this._retrieveNextPage(this.after, false).then(
            this._adjustCursors.bind(self),
        );
    }

    _adjustCursors(page) {
        if (page.after !== undefined) {
            this.after = page.after;
        }

        if (page.before !== undefined) {
            this.before = page.before;
        }

        return page.data;
    }

    _consumePages(lambda, reverse: boolean) {
        var self = this;
        return function(page) {
            lambda(page.data);

            var nextCursor;
            if (reverse) {
                nextCursor = page.before;
            } else {
                nextCursor = page.after;
            }

            if (nextCursor !== undefined) {
                return self
                    ._retrieveNextPage(nextCursor, reverse)
                    .then(self._consumePages(lambda, reverse));
            } else {
                return Promise.resolve();
            }
        };
    }

    _retrieveNextPage(cursor: string, reverse: boolean) {
        var opts: any = {};
        Object.assign(opts, this.params);

        if (cursor !== undefined) {
            if (reverse) {
                opts.before = cursor;
            } else {
                opts.after = cursor;
            }
        } else {
            if (reverse) {
                opts.before = null;
            }
        }

        var q = query.Paginate(this.set, opts);

        if (this._faunaFunctions.length > 0) {
            this._faunaFunctions.forEach(function(lambda) {
                q = lambda(q);
            });
        }

        return this.client.query(q);
    }

    _clone() {
        return Object.create(PageHelper.prototype, {
            client: { value: this.client },
            set: { value: this.set },
            _faunaFunctions: { value: this._faunaFunctions },
            before: { value: this.before },
            after: { value: this.after },
        });
    }
}
