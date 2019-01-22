import * as base64 from 'base64-js';
import * as errors from './errors';
import Expr from './Expr';
import * as util from 'util';

const customInspect = util && util.inspect && util.inspect.custom;
const stringify: (...args: any[]) => void =
    (util && util.inspect) || JSON.stringify;

/**
 * FaunaDB value types. Generally, these classes do not need to be instantiated
 * directly; they can be constructed through helper methods in {@link module:query}.
 *
 * Instances of these classes will be returned in responses if the response object
 * contains these values. For example, a FaunaDB response containing
 *`{ "@ref": { "id": "123", "class": { "@ref": { "id": "frogs", "class": { "@ref": { "id": "classes" } } } } } }`
 * will be returned as `new values.Ref("123", new values.Ref("frogs", values.Native.CLASSES))`.
 *
 * See the [FaunaDB Query API Documentation](https://app.fauna.com/documentation/reference/queryapi#simple-type)
 * for more information.
 *
 * @module values
 */

/**
 * Base type for FaunaDB value objects.
 *
 * @extends Expr
 * @abstract
 * @constructor
 */
export class Value extends Expr {}

/**
 * FaunaDB ref.
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#special-type).
 *
 * @param {string} id
 *   The id portion of the ref.
 * @param {Ref} [clazz]
 *   The class portion of the ref.
 * @param {Ref} [database]
 *   The database portion of the ref.
 *
 * @extends module:values~Value
 * @constructor
 */
export class Ref extends Value {
    value: any;
    constructor(id: string, clazz?: Ref, database?: Ref) {
        super({});
        if (!id)
            throw new errors.InvalidValue('id cannot be null or undefined');
        this.value = { id, class: clazz, database };
    }
    get class() {
        return this.value.class;
    }
    get database() {
        return this.value.database;
    }
    get id() {
        return this.value.id;
    }
    toJSON() {
        return { '@ref': this.value };
    }
    valueOf() {
        return this.value;
    }
    equals(other: Ref) {
        return (
            other instanceof Ref &&
            this.id === other.id &&
            ((this.class === undefined && other.class === undefined) ||
                this.class.equals(other.class)) &&
            ((this.database === undefined && other.database === undefined) ||
                this.database.equals(other.database))
        );
    }
}

wrapToString(Ref, function() {
    var constructors: { [key: string]: string } = {
        classes: 'Class',
        databases: 'Database',
        indexes: 'Index',
        functions: 'Function',
    };

    var toString = function(ref: Ref, prevDb: string): string {
        if (ref.class === undefined && ref.database === undefined)
            return (
                ref.id.charAt(0).toUpperCase() +
                ref.id.slice(1) +
                '(' +
                prevDb +
                ')'
            );
        var db;
        var constructor = constructors[ref.class.id];
        if (constructor !== undefined) {
            db =
                ref.database !== undefined
                    ? ', ' + ref.database.toString()
                    : '';
            return constructor + '("' + ref.id + '"' + db + ')';
        }

        db = ref.database !== undefined ? ref.database.toString() : '';

        return 'Ref(' + toString(ref.class, db) + ', "' + ref.id + '")';
    };

    return toString(this, '');
});

export const Native = {
    CLASSES: new Ref('classes'),
    INDEXES: new Ref('indexes'),
    DATABASES: new Ref('databases'),
    FUNCTIONS: new Ref('functions'),
    KEYS: new Ref('keys'),
    fromName: function(name: string) {
        switch (name) {
            case 'classes':
                return Native.CLASSES;
            case 'indexes':
                return Native.INDEXES;
            case 'databases':
                return Native.DATABASES;
            case 'functions':
                return Native.FUNCTIONS;
            case 'keys':
                return Native.KEYS;
        }
        return new Ref(name);
    },
};

/**
 * FaunaDB Set.
 * This represents a set returned as part of a response.
 * This looks like `{"@set": set_query}`.
 * For query sets see {@link match}, {@link union},
 * {@link intersection}, {@link difference}, and {@link join}.
 *
 * @extends module:values~Value
 * @constructor
 */
export class SetRef extends Value {
    value: any;
    constructor(value: any) {
        super(value);
        this.value = value;
    }
    toJSON() {
        return { '@set': this.value };
    }
}

wrapToString(SetRef, function() {
    return 'SetRef(' + stringify(this.value) + ')';
});

/** FaunaDB time. See the [docs](https://app.fauna.com/documentation/reference/queryapi#special-type).
 *
 * @param {string|Date} value If a Date, this is converted to a string.
 * @extends module:values~Value
 * @constructor
 */
export class FaunaTime extends Value {
    value: string;
    constructor(value: Date | string) {
        super(value instanceof Date ? value.toISOString() : value);
        if (value instanceof Date) {
            value = value.toISOString();
        } else if (!(value.charAt(value.length - 1) === 'Z')) {
            throw new errors.InvalidValue(
                "Only allowed timezone is 'Z', got: " + value,
            );
        }
        this.value = value;
    }
    get date() {
        return new Date(this.value);
    }

    toJSON() {
        return { '@ts': this.value };
    }
}

wrapToString(FaunaTime, function() {
    return 'Time("' + this.value + '")';
});

/** FaunaDB date. See the [docs](https://app.fauna.com/documentation/reference/queryapi#special-type).
 *
 * @param {string|Date} value
 *   If a Date, this is converted to a string, with time-of-day discarded.
 * @extends module:values~Value
 * @constructor
 */
export class FaunaDate extends Value {
    value: string;
    constructor(value: Date | string) {
        super(value instanceof Date ? value.toISOString().slice(0, 10) : value);
        if (value instanceof Date) {
            // The first 10 characters 'YYYY-MM-DD' are the date portion.
            value = value.toISOString().slice(0, 10);
        }
        this.value = value;
    }

    get date() {
        return new Date(this.value);
    }

    toJSON() {
        return { '@date': this.value };
    }
}

wrapToString(FaunaDate, function() {
    return 'Date("' + this.value + '")';
});

/** FaunaDB bytes. See the [docs](https://app.fauna.com/documentation/reference/queryapi#special-type).
 *
 * @param {Uint8Array|ArrayBuffer|string} value
 *    If ArrayBuffer it's converted to Uint8Array
 *    If string it must be base64 encoded and it's converted to Uint8Array
 * @extends module:values~Value
 * @constructor
 */
export class Bytes extends Value {
    value: Uint8Array;
    constructor(value: Uint8Array | ArrayBuffer | string) {
        super(
            value instanceof ArrayBuffer
                ? new Uint8Array(value)
                : typeof value === 'string'
                ? base64.toByteArray(value)
                : value,
        );
        if (value instanceof ArrayBuffer) {
            this.value = new Uint8Array(value);
        } else if (typeof value === 'string') {
            this.value = base64.toByteArray(value);
        } else if (value instanceof Uint8Array) {
            this.value = value;
        } else {
            throw new errors.InvalidValue(
                'Bytes type expect argument to be either Uint8Array|ArrayBuffer|string, got: ' +
                    stringify(value),
            );
        }
    }

    toJSON() {
        return { '@bytes': base64.fromByteArray(this.value) };
    }
}

wrapToString(Bytes, function() {
    return 'Bytes("' + base64.fromByteArray(this.value) + '")';
});

/** FaunaDB query. See the [docs](https://app.fauna.com/documentation/reference/queryapi#special-type).
 *
 * @param {any} value
 * @extends module:values~Value
 * @constructor
 */
export class Query extends Value {
    constructor(public value: any) {
        super(value);
    }

    toJSON() {
        return { '@query': this.value };
    }
}

wrapToString(Query, function() {
    return 'Query(' + Expr.toString(this.value) + ')';
});

/** @ignore */
function wrapToString(type: any, fn: () => string) {
    type.prototype.toString = fn;
    type.prototype.inspect = fn;

    if (customInspect) {
        type.prototype[customInspect] = fn;
    }
}
