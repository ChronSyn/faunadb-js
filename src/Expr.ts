/**
 * A representation of a FaunaDB Query Expression. Generally, you shouldn't need
 * to use this class directly; use the Query helpers defined in {@link module:query}.
 *
 * @param {Object} obj The object that represents a Query to be treated as an Expression.
 * @constructor
 */

type Raw = any;
export default class Expr {
    constructor(public raw: Raw | Raw[]) {}
    static toString(expr: Raw | Raw[], caller?: string): string {
        if (expr instanceof Expr) {
            expr = expr.raw;
        }

        if (typeof expr === 'string') return '"' + expr + '"';

        if (
            typeof expr === 'symbol' ||
            typeof expr === 'number' ||
            typeof expr === 'boolean'
        )
            return expr.toString();

        if (typeof expr === 'undefined') return 'undefined';

        if (expr === null) return 'null';

        if (Array.isArray(expr)) {
            const array = expr.map(item => Expr.toString(item)).join(', ');

            return varArgsFunctions.includes(caller)
                ? array
                : '[' + array + ']';
        }

        expr = <{ [key: string]: any }>expr;
        const keys = Object.keys(expr);
        let fn = keys[0];

        if (fn === 'object')
            return (
                '{' +
                Object.keys(expr.object)
                    .map(function(k) {
                        return k + ': ' + Expr.toString(expr.object[k]);
                    })
                    .join(', ') +
                '}'
            );

        if (fn in specialCases) fn = specialCases[fn];

        fn = fn
            .split('_')
            .map(function(str) {
                return str.charAt(0).toUpperCase() + str.slice(1);
            })
            .join('');

        var args = keys
            .map(function(k) {
                var v = expr[k];
                return Expr.toString(v, fn);
            })
            .join(', ');
        return fn + '(' + args + ')';
    }
    toJSON() {
        return this.raw;
    }
}

const varArgsFunctions = [
    'Do',
    'Call',
    'Union',
    'Intersection',
    'Difference',
    'Equals',
    'Add',
    'Multiply',
    'Subtract',
    'Divide',
    'Modulo',
    'LT',
    'LTE',
    'GT',
    'GTE',
    'And',
    'Or',
];
const specialCases = {
    is_nonempty: 'is_non_empty',
    lt: 'LT',
    lte: 'LTE',
    gt: 'GT',
    gte: 'GTE',
};
