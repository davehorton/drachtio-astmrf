const Emitter = require('events');
const Srf = require('drachtio-srf');
const Mrf = require('../..');
const config = require('config');
const debug = require('debug')('drachtio:astmrf') ;

class App extends Emitter {
  constructor() {
    super();

    this.srf = new Srf() ;
    this.mrf = new Mrf(this.srf);
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.srf.connect(config.get('drachtio'), (err) => {
        if (err) return reject(err);
        resolve();
      })
    })
      .then(() => {
        debug('connected to srf');
        return this.mrf.connect(config.get('asterisk'));
      })
      .then((ms) => {
        debug('connected to asterisk');
        return this.ms = ms;
      })
      .catch((err) => {
        console.error(err, 'error connecting uas app');
      });
  }

  accept(t) {
    this.srf.invite((req, res) => {

      this.ms.connectCaller(req, res, {localSdp: req.body})
        .then(({endpoint, dialog}) => {
          t.pass('sucessfully connected call to asterisk');
          dialog.on('destroy', () => {
            debug('caller hung up');
            endpoint.destroy();
          });
          endpoint.on('destroy', () => {
            debug('endpoint removed from asterisk side');
            this.emit('done');
          });
        });
    });

    return this;
  }

  disconnect() {
    this.srf.disconnect();
    this.ms.disconnect();
    return this;
  }
}

module.exports = App;
