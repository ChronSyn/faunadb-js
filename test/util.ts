import * as chai from 'chai';
import Client from '../src/Client';
import Expr from '../src/Expr';
import * as values from '../src/values';
import * as query from '../src/query';
import * as util from '../src/_util';

var assert = chai.assert;
var Database = query.Database;
var Value = values.Value;

var env = process.env;

var testConfig;
try {
    testConfig = require('../testConfig.json');
} catch (err) {
    console.log(
        'testConfig.json not found, defaulting to environment variables',
    );
    if (
        typeof env.FAUNA_DOMAIN === 'undefined' ||
        typeof env.FAUNA_SCHEME === 'undefined' ||
        typeof env.FAUNA_PORT === 'undefined' ||
        typeof env.FAUNA_ROOT_KEY === 'undefined'
    ) {
        console.log(
            'Environment variables not defined. Please create a config file or set env vars.',
        );
        process.exit();
    }

    testConfig = {
        domain: env.FAUNA_DOMAIN,
        scheme: env.FAUNA_SCHEME,
        port: env.FAUNA_PORT,
        auth: env.FAUNA_ROOT_KEY,
    };
}

export function takeObjectKeys(object, ...args: string[]) {
    var out = {};
    for (var i = 0; i < args.length; ++i) {
        var key = args[i];
        out[key] = object[key];
    }
    return out;
}

export function getClient(opts?: any) {
    var cfg = util.removeUndefinedValues(
        takeObjectKeys(testConfig, 'domain', 'scheme', 'port'),
    );
    return new Client(Object.assign({ secret: clientSecret }, cfg, opts));
}

export function assertRejected(promise, errorType) {
    var succeeded = false;

    return promise.then(
        function() {
            succeeded = true;
            assert(!succeeded, 'Expected promise to fail.');
        },
        function(error) {
            if (!(error instanceof Error)) {
                throw error;
            }
        },
    );
}

// Set in before hook, so won't be null during tests
var _client = null;
var clientSecret = null;

export function client() {
    return _client;
}

export function randomString() {
    return ((Math.random() * 0xffffff) << 0).toString(16);
}

export function unwrapExpr(obj: any) {
    if (obj instanceof Value) {
        return obj;
    } else if (obj instanceof Expr) {
        return unwrapExprValues(obj.raw);
    } else {
        return obj;
    }
}

export function unwrapExprValues(obj) {
    if (Array.isArray(obj)) {
        return obj.map(function(elem) {
            return unwrapExpr(elem);
        });
    } else if (typeof obj === 'object') {
        var rv = {};

        Object.keys(obj).forEach(function(key) {
            rv[key] = unwrapExpr(obj[key]);
        });

        return rv;
    } else {
        return obj;
    }
}

export const rootClient = getClient({ secret: testConfig.auth });
export const dbName = 'faunadb-js-test-' + randomString();
export const dbRef = query.Database(dbName);

// global before/after for every test

before(function() {
    this.timeout(10000);
    return rootClient
        .query(query.CreateDatabase({ name: dbName }))
        .then(function() {
            return rootClient.query(
                query.CreateKey({ database: Database(dbName), role: 'server' }),
            );
        })
        .then(function(key) {
            clientSecret = key.secret;
            _client = getClient();
        })
        .catch(function(exception) {
            console.log('failed: ' + exception);
        });
});

after(function() {
    this.timeout(10000);
    return rootClient.query(query.Delete(dbRef));
});
