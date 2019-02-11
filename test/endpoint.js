const test = require('tape').test ;
const Srf = require('drachtio-srf') ;
const Mrf = require('..') ;
const config = require('config') ;
const clearRequire = require('clear-require');
const async = require('async');
const Endpoint = require('../lib/endpoint');
const EP_FILE = '/tmp/endpoint_record.wav';
const EP_FILE2 = '/tmp/endpoint_record2.wav';

// connect the 2 apps to their drachtio servers
function connect(agents) {
  return new Promise((resolve, reject) => {
    async.each(agents, (agent, callback) => {
      agent.once('connect', (err, hostport) => {
        callback(err) ;
      }) ;
    }, (err) => {
      if (err) { return reject(err); }
      resolve() ;
    });
  });
}

// disconnect the 2 apps
function disconnect(agents) {
  agents.forEach((app) => {app.disconnect();}) ;
  clearRequire('./../app');
}


test('MediaServer#createEndpoint create idle endpoint using callback', (t) => {
  t.timeoutAfter(60000);

  const srf = new Srf();
  srf.connect(config.get('drachtio')) ;
  const mrf = new Mrf(srf) ;

  return connect([srf])
    .then(() => {
      return mrf.connect(config.get('asterisk'));
    })
    .then((mediaserver) => {
      return mediaserver.createEndpoint((err, endpoint) => {
        if (err) t.fail(err);
        t.ok(endpoint instanceof Endpoint, 'created endpoint');
        endpoint.destroy() ;
        mediaserver.disconnect() ;
        disconnect([srf]);
        t.end() ;
      });
    });
}) ;
