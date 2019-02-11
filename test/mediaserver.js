const test = require('tape').test ;
const Srf = require('drachtio-srf') ;
const Mrf = require('..') ;
const config = require('config') ;
const async = require('async');
const { output, sippUac } = require('./sipp')('test_drachtio-astmrf');
const Uas = require('./scripts/uas');
const debug = require('debug')('drachtio:astmrf') ;

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

function disconnect(agents) {
  agents.forEach((app) => {app.disconnect();}) ;
}

test('Mrf#connect using Promise', (t) => {
  t.timeoutAfter(5000);

  const srf = new Srf();
  srf.connect(config.get('drachtio')) ;
  const mrf = new Mrf(srf) ;

  connect([srf])
    .then(() => {
      return mrf.connect(config.get('asterisk'));
    })
    .then((mediaserver) => {
      t.ok(mediaserver.srf instanceof Srf, 'mediaserver.srf is an Srf');
      t.ok(mrf.mediaservers.length === 1, 'mrf.mediaservers is populated');
      t.ok(mediaserver.endpoints.size === 0, 'mediaserver.endpoints is initially empty');
      mediaserver.disconnect() ;
      disconnect([srf]);
      t.end() ;
      return;
    })
    .catch((err) => {
      t.fail(err);
    });
}) ;

test('Mrf#connect using callback', (t) => {
  t.timeoutAfter(5000);

  const srf = new Srf();
  srf.connect(config.get('drachtio')) ;
  const mrf = new Mrf(srf) ;

  connect([srf])
    .then(() => {
      return mrf.connect(config.get('asterisk'), (err, mediaserver) => {
        t.ok(mediaserver.srf instanceof Srf, 'mediaserver.srf is an Srf');
        t.ok(mrf.mediaservers.length === 1, 'mrf.mediaservers is populated');
        t.ok(mediaserver.endpoints.size === 0, 'mediaserver.endpoints is initially empty');
        mediaserver.disconnect() ;
        disconnect([srf]);
        t.end() ;  
      })
    })
    .catch((err) => {
      t.fail(err);
    });
}) ;

test('Mrf#connect incoming call to asterisk', (t) => {
  t.timeoutAfter(20000);

  const uas = new Uas();
  uas.connect()
    .then(() => {
      return uas.accept(t);
    })
    .then(() => {
      uas.once('done', () => {
        t.pass('endpoint releaseed');
      });
      return sippUac('uac-pcap.xml');
    })
    .then(() => {
      t.pass('call successfully completed');
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          uas.disconnect();
          resolve();
        }, 500);
      });
    })
    .then(() => {
      return t.end();
    })
    .catch((err) => {
      console.log(`error received: ${err}`);
      console.log(output());
      t.fail(err);
    });
}) ;
