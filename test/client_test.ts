import { assert } from 'chai';
import * as errors from '../src/errors';
import * as query from '../src/query';
import * as util from './util';
import Client from '../src/Client';

var client: Client;

describe('Client', function() {
    before(function() {
        // Hideous way to ensure that the client is initialized.
        client = util.client();

        return client.query(query.CreateClass({ name: 'my_class' }));
    });

    it('invalid key', function(done) {
        var badClient = util.getClient({ secret: { user: 'bad_key' } });
        badClient.query(util.dbRef).catch(err => {
            assert.isNotNull(err);
            done();
        });
    });

    it('ping', function() {
        return client.ping('node', 2000).then(function(res) {
            assert.equal(res, 'Scope node is OK');
        });
    });

    it('paginates', function() {
        return createInstance().then(function(instance) {
            return client.paginate(instance.ref).each(function(page) {
                page.forEach(function(i) {
                    assert.deepEqual(instance.ref, i);
                });
            });
        });
    });
});

function createInstance() {
    return client.query(query.Create(query.Class('my_class'), {}));
}
