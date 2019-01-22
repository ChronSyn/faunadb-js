import Expr from './Expr';
import * as errors from './errors';
import * as values from './values';

/**
 * This module contains functions used to construct FaunaDB Queries.
 *
 * See the [FaunaDB Query API Documentation](https://fauna.com/documentation/queries)
 * for per-function documentation.
 *
 * @module query
 */

/**
 * @typedef {(Expr|string|number|boolean|Object)} module:query~ExprTerm
 */

/**
 * @typedef {(module:query~ExprTerm|Array<module:query~ExprTerm>)} module:query~ExprArg
 */

// Type helpers

/**
 * If one parameter is provided, constructs a literal Ref value.
 * The string `classes/widget/123` will be equivalent to `new values.Ref('123', new values.Ref('widget', values.Native.CLASSES))`
 *
 * If two are provided, constructs a Ref() function that, when evaluated, returns a Ref value.
 *
 * @param {string|module:query~ExprArg} ref|cls
 *   Alone, the ref in path form. Combined with `id`, must be a class ref.
 * @param {module:query~ExprArg} [id]
 *   A numeric id of the given class.
 * @return {Expr}
 */
export function Ref(...args: any[]) {
    arity.between(1, 2, arguments);
    switch (arguments.length) {
        case 1:
            return new Expr({ '@ref': wrap(arguments[0]) });
        case 2:
            return new Expr({
                ref: wrap(arguments[0]),
                id: wrap(arguments[1]),
            });
    }
}

/**
 * @param {Uint8Array|ArrayBuffer|module:query~ExprArg} bytes
 *   A base64 encoded string or a byte array
 * @return {Expr}
 */
export function Bytes(bytes) {
    arity.exact(1, arguments);
    return new values.Bytes(bytes);
}

// Basic forms

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} msg
 *   The message to send back to the client.
 * @return {Expr}
 * */
export function Abort(msg) {
    arity.exact(1, arguments);
    return new Expr({ abort: wrap(msg) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} timestamp
 *   An Expr that will evaluate to a Time.
 * @param {module:query~ExprArg} expr
 *   The Expr to run at the given snapshot time.
 * @return {Expr}
 * */
export function At(timestamp, expr) {
    arity.exact(2, arguments);
    return new Expr({ at: wrap(timestamp), expr: wrap(expr) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} bindings
 *   A set of bindings to use within the given expression.
 * @param {module:query~ExprArg} in
 *   The expression to run with the given bindings.
 * @return {Expr}
 * */
export function Let(vars, in_expr) {
    arity.exact(2, arguments);

    if (typeof in_expr === 'function') {
        in_expr = in_expr.apply(
            null,
            Object.keys(vars).map(function(name) {
                return Var(name);
            }),
        );
    }

    return new Expr({ let: wrapValues(vars), in: wrap(in_expr) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} varName
 *   The name of the bound var.
 * @return {Expr}
 * */
export function Var(varName: string) {
    arity.exact(1, arguments);
    return new Expr({ var: wrap(varName) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} condition
 *   An expression that returns a boolean.
 * @param {module:query~ExprArg} then
 *   The expression to run if condition is true.
 * @param {module:query~ExprArg} else
 *   The expression to run if the condition is false.
 * @return {Expr}
 * */
export function If(condition, then, _else) {
    arity.exact(3, arguments);
    return new Expr({
        if: wrap(condition),
        then: wrap(then),
        else: wrap(_else),
    });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {...module:query~ExprArg} args
 *   A series of expressions to run.
 * @return {Expr}
 * */
export function Do(...args: any[]) {
    arity.min(1, arguments);
    var args = argsToArray(arguments);
    return new Expr({ do: wrap(args) });
}

/** See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {...module:query~ExprArg} fields
 *   The object to be escaped.
 * @return {Expr}
 * */
var objectFunction = function(fields) {
    arity.exact(1, arguments);
    return new Expr({ object: wrapValues(fields) });
};
/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Directly produces a FaunaDB Lambda expression as described in the FaunaDB reference
 * documentation.
 *
 * @param {module:query~ExprArg} var
 *   The names of the variables to be bound in this lambda expression.
 * @param {module:query~ExprArg} expr
 *   The lambda expression.
 * @return {Expr}
 */

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Takes a Javascript function, and will transform it
 * into the appropriate FaunaDB query. For example:
 *
 * ```
 * Lambda(function(a) { return Add(a, a); });
 * // Returns { lambda: 'a', expr: { add: [{ var: a }, { var: a }] } }
 * ```
 * Note that the driver will handle wrapping all usages of the lambda's bound
 * variables with the {@link modules:query~Var} function.
 *
 * @param {function} func
 *   Takes the provided function and produces the appropriate FaunaDB query expression.
 * @return {Expr}
 *
 */ export function Lambda(_?: any, __?: any) {
    arity.between(1, 2, arguments);
    switch (arguments.length) {
        case 1:
            var value = arguments[0];
            if (typeof value === 'function') {
                return _lambdaFunc(value);
            } else if (value instanceof Expr) {
                return value;
            } else {
                throw new errors.InvalidValue(
                    'Lambda function takes either a Function or an Expr.',
                );
            }
        case 2:
            var var_name = arguments[0];
            var expr = arguments[1];

            return _lambdaExpr(var_name, expr);
    }
}

/**
 * @private
 */
export function _lambdaFunc(func) {
    var vars = require('fn-annotate')(func);
    switch (vars.length) {
        case 0:
            throw new errors.InvalidValue(
                'Provided Function must take at least 1 argument.',
            );
        case 1:
            return _lambdaExpr(vars[0], func(Var(vars[0])));
        default:
            return _lambdaExpr(
                vars,
                func.apply(
                    null,
                    vars.map(function(name) {
                        return Var(name);
                    }),
                ),
            );
    }
}

/**
 * @private
 */
export function _lambdaExpr(var_name, expr) {
    return new Expr({ lambda: wrap(var_name), expr: wrap(expr) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Invokes a given function passing in the provided arguments
 *
 * ```
 * Call(Ref("functions/a_function"), 1, 2)
 * ```
 *
 * @param {module:query~ExprArg} ref
 *   The ref of the UserDefinedFunction to call
 * @param {...module:query~ExprArg} args
 *   A series of values to pass as arguments to the UDF.
 * @return {Expr}
 * */
export function Call(ref, ...args) {
    arity.min(1, arguments);
    return new Expr({ call: wrap(ref), arguments: varargs(args) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Constructs a `@query` type using the Lambda() or a function.
 *
 * ```
 * Query(Lambda(['a', 'b'], Add(Var('a'), Var('b'))))
 * Query(function (a, b) { return Add(a, b) })
 * ```
 *
 * @param {module:query~ExprArg|function} lambda
 *   A function to escape as a query.
 * @return {Expr}
 * */
export function Query(lambda) {
    arity.exact(1, arguments);
    return new Expr({ query: wrap(lambda) });
}

// Collection functions

/** See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be mapped over.
 * @param {module:query~ExprArg|function} lambda
 *   A function to be called for each element of the collection.
 * @return {Expr}
 * */
export function Map(collection, lambda_expr) {
    arity.exact(2, arguments);
    return new Expr({ map: wrap(lambda_expr), collection: wrap(collection) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be iterated over.
 * @param {module:query~ExprArg|function} lambda
 *   A function to be called for each element of the collection.
 * @return {Expr}
 * */
export function Foreach(collection, lambda_expr) {
    arity.exact(2, arguments);
    return new Expr({
        foreach: wrap(lambda_expr),
        collection: wrap(collection),
    });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be filtered.
 * @param {module:query~ExprArg|function} lambda
 *   A function that returns a boolean used to filter unwanted values.
 * @return {Expr}
 * */
export function Filter(collection, lambda_expr) {
    arity.exact(2, arguments);
    return new Expr({
        filter: wrap(lambda_expr),
        collection: wrap(collection),
    });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} number
 *   An expression resulting in the number of elements to take from the collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 * */
export function Take(number, collection) {
    arity.exact(2, arguments);
    return new Expr({ take: wrap(number), collection: wrap(collection) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} number
 *   An expression resulting in the number of elements to drop from the collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 * */
export function Drop(number, collection) {
    arity.exact(2, arguments);
    return new Expr({ drop: wrap(number), collection: wrap(collection) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} elements
 *   An expression resulting in a collection of elements to prepend to the given collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
export function Prepend(elements, collection) {
    arity.exact(2, arguments);
    return new Expr({ prepend: wrap(elements), collection: wrap(collection) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} elements
 *   An expression resulting in a collection of elements to append to the given collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
export function Append(elements, collection) {
    arity.exact(2, arguments);
    return new Expr({ append: wrap(elements), collection: wrap(collection) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
export function IsEmpty(collection) {
    arity.exact(1, arguments);
    return new Expr({ is_empty: wrap(collection) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
export function IsNonEmpty(collection) {
    arity.exact(1, arguments);
    return new Expr({ is_nonempty: wrap(collection) });
}

// Read functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 *
 * @param {module:query~ExprArg} ref
 *   An expression resulting in either a Ref or SetRef.
 * @param {?module:query~ExprArg} ts
 *   The snapshot time at which to get the instance.
 * @return {Expr}
 */
export function Get(ref: any, ts?: any) {
    arity.between(1, 2, arguments);
    ts = ts || null;

    return new Expr(params({ get: wrap(ref) }, { ts: wrap(ts) }));
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 *
 * @param {module:query~ExprArg} secret
 *   The key or token secret to lookup.
 * @return {Expr}
 */
export function KeyFromSecret(secret) {
    arity.exact(1, arguments);
    return new Expr({ key_from_secret: wrap(secret) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 * You may want to utilize {@link Client#paginate} to obtain a {@link PageHelper},
 * rather than using this query function directly.
 *
 * @param {module:query~ExprArg} set
 *   An expression resulting in a SetRef to page over.
 * @param {?Object} opts
 *  An object representing options for pagination.
 *    - size: Maximum number of results to return.
 *    - after: Return the next page of results after this cursor (inclusive).
 *    - before: Return the previous page of results before this cursor (exclusive).
 *    - sources: If true, include the source sets along with each element.
 * @return {Expr}
 */
export function Paginate(set, opts?: any) {
    arity.between(1, 2, arguments);
    opts = opts || {};

    return new Expr(Object.assign({ paginate: wrap(set) }, wrapValues(opts)));
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 *
 * @param {module:query~ExprArg} ref
 *   An expression resulting in a Ref.
 * @param {?module:query~ExprArg} ts
 *   The snapshot time at which to check for the instance's existence.
 * @return {Expr}
 */
export function Exists(ref, ts?: string) {
    arity.between(1, 2, arguments);
    ts = ts || null;

    return new Expr(params({ exists: wrap(ref) }, { ts: wrap(ts) }));
}

// Write functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref (usually a ClassRef) to create.
 * @param {?module:query~ExprArg} params
 *   An object representing the parameters of the instance.
 * @return {Expr}
 */
export function Create(class_ref, params?: any) {
    arity.between(1, 2, arguments);
    return new Expr({ create: wrap(class_ref), params: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to update.
 * @param {module:query~ExprArg} params
 *   An object representing the parameters of the instance.
 * @return {Expr}
 */
export function Update(ref, params) {
    arity.exact(2, arguments);
    return new Expr({ update: wrap(ref), params: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to replace.
 * @param {module:query~ExprArg} params
 *   An object representing the parameters of the instance.
 * @return {Expr}
 */
export function Replace(ref, params) {
    arity.exact(2, arguments);
    return new Expr({ replace: wrap(ref), params: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to delete.
 * @return {Expr}
 */
export function Delete(ref) {
    arity.exact(1, arguments);
    return new Expr({ delete: wrap(ref) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to insert against
 * @param {module:query~ExprArg} ts
 *   The valid time of the inserted event
 * @param {module:query~ExprArg} action
 *   Whether the event should be a Create, Update, or Delete.
 * @param {module:query~ExprArg} params
 *   If this is a Create or Update, the parameters of the instance.
 * @return {Expr}
 */
export function Insert(ref, ts, action, params) {
    arity.exact(4, arguments);
    return new Expr({
        insert: wrap(ref),
        ts: wrap(ts),
        action: wrap(action),
        params: wrap(params),
    });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref of the instance whose event should be removed.
 * @param {module:query~ExprArg} ts
 *   The valid time of the event.
 * @param {module:query~ExprArg} action
 *   The event action (Create, Update, or Delete) that should be removed.
 * @return {Expr}
 */
export function Remove(ref, ts, action) {
    arity.exact(3, arguments);
    return new Expr({ remove: wrap(ref), ts: wrap(ts), action: wrap(action) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a class.
 *     - name (required): the name of the class to create
 * @return {Expr}
 */
export function CreateClass(params) {
    arity.exact(1, arguments);
    return new Expr({ create_class: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a database.
 *     - name (required): the name of the database to create
 * @return {Expr}
 */
export function CreateDatabase(params) {
    arity.exact(1, arguments);
    return new Expr({ create_database: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create an index.
 *     - name (required): the name of the index to create
 *     - source: One or more source objects describing source classes and (optional) field bindings.
 *     - terms: An array of term objects describing the fields to be indexed. Optional
 *     - values: An array of value objects describing the fields to be covered. Optional
 *     - unique: If true, maintains a uniqueness constraint on combined terms and values. Optional
 *     - partitions: The number of sub-partitions within each term. Optional
 * @return {Expr}
 */
export function CreateIndex(params) {
    arity.exact(1, arguments);
    return new Expr({ create_index: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new key
 *     - database: Ref of the database the key will be scoped to
 *     - role: The role of the new key
 * @return {Expr}
 */
export function CreateKey(params) {
    arity.exact(1, arguments);
    return new Expr({ create_key: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An objet of parameters used to create a new user defined function.
 *     - name: The name of the function
 *     - body: A lambda function (escaped with `query`).
 * @return {Expr}
 */
export function CreateFunction(params) {
    arity.exact(1, arguments);
    return new Expr({ create_function: wrap(params) });
}

// Sets

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref of the instance for which to retrieve the singleton set.
 * @return {Expr}
 */
export function Singleton(ref) {
    arity.exact(1, arguments);
    return new Expr({ singleton: wrap(ref) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} ref
 *   A Ref or SetRef to retrieve an event set from.
 * @return {Expr}
 */
export function Events(ref_set) {
    arity.exact(1, arguments);
    return new Expr({ events: wrap(ref_set) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} index
 *   The Ref of the index to match against.
 * @param {...module:query~ExprArg} terms
 *   A list of terms used in the match.
 * @return {Expr}
 */
export function Match(index, ...args: any[]) {
    arity.min(1, arguments);
    var args = argsToArray(arguments);
    args.shift();
    return new Expr({ match: wrap(index), terms: wrap(varargs(args)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to union together.
 * @return {Expr}
 */
export function Union(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ union: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to intersect.
 * @return {Expr}
 * */
export function Intersection(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ intersection: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to diff.
 * @return {Expr}
 * */
export function Difference(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ difference: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} set
 *   A SetRef to remove duplicates from.
 * @return {Expr}
 * */
export function Distinct(set) {
    arity.exact(1, arguments);
    return new Expr({ distinct: wrap(set) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} source
 *   A SetRef of the source set
 * @param {module:query~ExprArg|function} target
 *   A Lambda that will accept each element of the source Set and return a Set
 * @return {Expr}
 */
export function Join(source, target) {
    arity.exact(2, arguments);
    return new Expr({ join: wrap(source), with: wrap(target) });
}

// Authentication

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} ref
 *   A Ref with credentials to authenticate against
 * @param {module:query~ExprArg} params
 *   An object of parameters to pass to the login function
 *     - password: The password used to login
 * @return {Expr}
 * */
export function Login(ref, params) {
    arity.exact(2, arguments);
    return new Expr({ login: wrap(ref), params: wrap(params) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} delete_tokens
 *   If true, log out all tokens associated with the current session.
 * @return {Expr}
 */
export function Logout(delete_tokens) {
    arity.exact(1, arguments);
    return new Expr({ logout: wrap(delete_tokens) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to check the password against.
 * @param {module:query~ExprArg} password
 *   The credentials password to check.
 * @return {Expr}
 */
export function Identify(ref, password) {
    arity.exact(2, arguments);
    return new Expr({ identify: wrap(ref), password: wrap(password) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */
export function Identity(...args: any[]) {
    arity.exact(0, arguments);
    return new Expr({ identity: null });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */
export function HasIdentity(...args: any[]) {
    arity.exact(0, arguments);
    return new Expr({ has_identity: null });
}

// String functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {module:query~ExprArg} strings
 *   A list of strings to concatenate.
 * @param {?module:query~ExprArg} separator
 *   The separator to use between each string.
 * @return {Expr}
 */
export function Concat(strings, separator = null) {
    arity.min(1, arguments);
    return new Expr(
        params({ concat: wrap(strings) }, { separator: wrap(separator) }),
    );
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {module:query~ExprArg} string
 *   The string to casefold.
 * @param {module:query~ExprArg} normalizer
 *   The algorithm to use. One of: NFKCCaseFold, NFC, NFD, NFKC, NFKD.
 * @return {Expr}
 */
export function Casefold(string, normalizer?: any) {
    arity.min(1, arguments);
    return new Expr(
        params({ casefold: wrap(string) }, { normalizer: wrap(normalizer) }),
    );
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {module:query~ExprArg} terms
 *   A document from which to produce ngrams.
 * @param {?Object} opts
 *   An object of options
 *     - min: The minimum ngram size.
 *     - max: The maximum ngram size.
 * @return {Expr}
 */
export function NGram(terms, min = null, max = null) {
    arity.between(1, 3, arguments);

    return new Expr(
        params({ ngram: wrap(terms) }, { min: wrap(min), max: wrap(max) }),
    );
}

// Time and date functions
/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} string
 *   A string to convert to a time object.
 * @return {Expr}
 */
export function Time(string) {
    arity.exact(1, arguments);
    return new Expr({ time: wrap(string) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} number
 *   The number of `unit`s from Epoch
 * @param {module:query~ExprArg} unit
 *   The unit of `number`. One of second, millisecond, microsecond, nanosecond.
 * @return {Expr}
 */
export function Epoch(number, unit) {
    arity.exact(2, arguments);
    return new Expr({ epoch: wrap(number), unit: wrap(unit) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} string
 *   A string to convert to a Date object
 * @return {Expr}
 */
export function Date(string) {
    arity.exact(1, arguments);
    return new Expr({ date: wrap(string) });
}

// Miscellaneous functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @deprecated use NewId instead
 * @return {Expr}
 */
export function NextId(...args: any[]) {
    arity.exact(0, arguments);
    return new Expr({ next_id: null });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @return {Expr}
 */
export function NewId(...args: any[]) {
    arity.exact(0, arguments);
    return new Expr({ new_id: null });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the database.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the database's scope.
 * @return {Expr}
 */
export function Database(name, scope?: any) {
    arity.between(1, 2, arguments);
    switch (arguments.length) {
        case 1:
            return new Expr({ database: wrap(name) });
        case 2:
            return new Expr({ database: wrap(name), scope: wrap(scope) });
    }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the index.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the index's scope.
 * @return {Expr}
 */
export function Index(name, scope?: any) {
    arity.between(1, 2, arguments);
    switch (arguments.length) {
        case 1:
            return new Expr({ index: wrap(name) });
        case 2:
            return new Expr({ index: wrap(name), scope: wrap(scope) });
    }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the class.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the class's scope.
 * @return {Expr}
 */
export function Class(name, scope?: any) {
    arity.between(1, 2, arguments);
    switch (arguments.length) {
        case 1:
            return new Expr({ class: wrap(name) });
        case 2:
            return new Expr({ class: wrap(name), scope: wrap(scope) });
    }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the user defined function.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the user defined function's scope.
 * @return {Expr}
 */
export function FunctionFn(name, scope?: any) {
    arity.between(1, 2, arguments);
    switch (arguments.length) {
        case 1:
            return new Expr({ function: wrap(name) });
        case 2:
            return new Expr({ function: wrap(name), scope: wrap(scope) });
    }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `classes` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the class set's scope.
 * @return {Expr}
 */
export function Classes(scope?: any) {
    arity.max(1, arguments);
    scope = scope || null;
    return new Expr({ classes: wrap(scope) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `databases` functions that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the database set's scope.
 * @return {Expr}
 */
export function Databases(scope?: any) {
    arity.max(1, arguments);
    scope = scope || null;
    return new Expr({ databases: wrap(scope) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs an `indexes` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the index set's scope.
 * @return {Expr}
 */
export function Indexes(scope?: any) {
    arity.max(1, arguments);
    scope = scope || null;
    return new Expr({ indexes: wrap(scope) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `functions` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the user defined function set's scope.
 * @return {Expr}
 */
export function Functions(scope?: any) {
    arity.max(1, arguments);
    scope = scope || null;
    return new Expr({ functions: wrap(scope) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `keys` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the key set's scope.
 * @return {Expr}
 */
export function Keys(scope?: any) {
    arity.max(1, arguments);
    scope = scope || null;
    return new Expr({ keys: wrap(scope) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `tokens` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the token set's scope.
 * @return {Expr}
 */
export function Tokens(scope?: any) {
    arity.max(1, arguments);
    scope = scope || null;
    return new Expr({ tokens: wrap(scope) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `credentials` functions that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the credential set's scope.
 * @return {Expr}
 */
export function Credentials(scope?: any) {
    arity.max(1, arguments);
    scope = scope || null;
    return new Expr({ credentials: wrap(scope) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of expressions to check for equivalence.
 * @return {Expr}
 */
export function Equals(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ equals: varargs(arguments) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to check for the existence of.
 * @param {module:query~ExprArg} in
 *   An object to search against.
 * @return {Expr}
 */
export function Contains(path, _in) {
    arity.exact(2, arguments);
    return new Expr({ contains: wrap(path), in: wrap(_in) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to pull from an object.
 * @param {module:query~ExprArg} from
 *   The object to select from
 * @param {?module:query~ExprArg} default
 *   A default value if the path does not exist.
 * @return {Expr}
 */
export function Select(path, from, _default?: any) {
    arity.between(2, 3, arguments);
    var exprObj: { [key: string]: any } = {
        select: wrap(path),
        from: wrap(from),
    };
    if (_default !== undefined) {
        exprObj.default = wrap(_default);
    }
    return new Expr(exprObj);
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to pull from an object.
 * @param {module:query~ExprArg} from
 *   The object to select from
 * @return {Expr}
 */
export function SelectAll(path, from) {
    arity.exact(2, arguments);
    return new Expr({ select_all: wrap(path), from: wrap(from) });
}

/**
 * See the [docs](https://fauna.com/documentation/queries#misc_functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to sum together.
 * @return {Expr}
 */
export function Add(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ add: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://fauna.com/documentation/queries#misc_functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to multiply together.
 * @return {Expr}
 */
export function Multiply(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ multiply: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://fauna.com/documentation/queries#misc_functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the difference of.
 * @return {Expr}
 */
export function Subtract(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ subtract: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://fauna.com/documentation/queries#misc_functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the quotient of.
 * @return {Expr}
 */
export function Divide(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ divide: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://fauna.com/documentation/queries#misc_functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the quotient of. The remainder will be returned.
 * @return {Expr}
 */
export function Modulo(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ modulo: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
export function LT(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ lt: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
export function LTE(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ lte: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
export function GT(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ gt: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
export function GTE(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ gte: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection to compute the conjunction of.
 * @return {Expr}
 */
export function And(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ and: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection to compute the disjunction of.
 * @return {Expr}
 */
export function Or(...args: any[]) {
    arity.min(1, arguments);
    return new Expr({ or: wrap(varargs(arguments)) });
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {module:query~ExprArg} boolean
 *   A boolean to produce the negation of.
 * @return {Expr}
 */
export function Not(boolean) {
    arity.exact(1, arguments);
    return new Expr({ not: wrap(boolean) });
}

/**
 * Converts an expression to a string literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a string.
 * @return {Expr}
 */
export function ToString(expr) {
    arity.exact(1, arguments);
    return new Expr({ to_string: wrap(expr) });
}

/**
 * Converts an expression to a number literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a number.
 * @return {Expr}
 */
export function ToNumber(expr) {
    arity.exact(1, arguments);
    return new Expr({ to_number: wrap(expr) });
}

/**
 * Converts an expression to a time literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a time.
 * @return {Expr}
 */
export function ToTime(expr) {
    arity.exact(1, arguments);
    return new Expr({ to_time: wrap(expr) });
}

/**
 * Converts an expression to a date literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a date.
 * @return {Expr}
 */
export function ToDate(expr) {
    arity.exact(1, arguments);
    return new Expr({ to_date: wrap(expr) });
}

// Helpers

/**
 * @ignore
 */
export function arity(min: number, max: number, args: IArguments) {
    if (
        (min !== null && args.length < min) ||
        (max !== null && args.length > max)
    ) {
        throw new errors.InvalidArity(min, max, args.length);
    }
}

arity.exact = function(n: number, args: IArguments) {
    arity(n, n, args);
};
arity.max = function(n: number, args: IArguments) {
    arity(null, n, args);
};
arity.min = function(n: number, args: IArguments) {
    arity(n, null, args);
};
arity.between = function(min: number, max: number, args: IArguments) {
    arity(min, max, args);
};

/** Adds optional parameters to the query.
 *
 * @ignore
 * */
export function params(mainParams, optionalParams) {
    for (var key in optionalParams) {
        var val = optionalParams[key];
        if (val !== null) {
            mainParams[key] = val;
        }
    }
    return mainParams;
}

/**
 * Called on rest arguments.
 * This ensures that a single value passed is not put in an array, so
 * `query.add([1, 2])` will work as well as `query.add(1, 2)`.
 *
 * @ignore
 */
export function varargs(values) {
    var valuesAsArr = Array.isArray(values)
        ? values
        : Array.prototype.slice.call(values);
    return values.length === 1 ? values[0] : valuesAsArr;
}

/**
 * @ignore
 */
export function argsToArray(args) {
    var rv = [];
    rv.push.apply(rv, args);
    return rv;
}

/**
 * Wraps an object as an Expression. This will automatically wrap any bare objects with
 * the appropriate {@link object} escaping.
 * @param {Object} obj
 *  The object to be wrapped as an Expression.
 * @returns {Expr}
 *   The expression wrapping the provided object.
 * @private
 */
export function wrap(obj) {
    arity.exact(1, arguments);
    if (obj === null) {
        return null;
    } else if (obj instanceof Expr) {
        return obj;
    } else if (typeof obj === 'symbol') {
        return obj.toString().replace(/Symbol\((.*)\)/, function(str, symbol) {
            return symbol;
        });
    } else if (typeof obj === 'function') {
        return Lambda(obj);
    } else if (Array.isArray(obj)) {
        return new Expr(
            obj.map(function(elem) {
                return wrap(elem);
            }),
        );
    } else if (obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
        return new values.Bytes(obj);
    } else if (typeof obj === 'object') {
        return new Expr({ object: wrapValues(obj) });
    } else {
        return obj;
    }
}

/**
 * Wraps all of the values of a provided Object, while leaving the parent object unwrapped.
 * @param {Object} obj
 *  The object whose values are to be wrapped as Expressions.
 * @returns {Object}
 *  A copy of the provided object, with the values wrapped as Expressions.
 * @private
 */
export function wrapValues(obj) {
    if (obj !== null) {
        var rv = {};

        Object.keys(obj).forEach(function(key) {
            rv[key] = wrap(obj[key]);
        });

        return rv;
    } else {
        return null;
    }
}
