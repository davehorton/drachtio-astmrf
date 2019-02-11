const client = require('ari-client');
const assert = require('assert') ;
const MediaServer = require('./mediaserver') ;
const Emitter = require('events').EventEmitter ;
const os = require('os');
//const debug = require('debug')('drachtio:astmrf') ;
const defaultLogger = process.env.NODE_ENV === 'test' ?
  {
    info: (...args) => {},
    error: (...args) => {}
  } :
  {
    info: (...args) => {console.log(...args); },
    error: (...args) => {console.error(...args); }
  };

/**
 * Creates a media resource framework instance.
 * @constructor
 * @param {Srf} srf Srf instance
 * @param {Mrf~createOptions} [opts] configuration options
 */
class Mrf extends Emitter {

  constructor(srf, opts) {
    super() ;

    opts = opts || {} ;

    this._srf = srf ;
    this.mediaservers = [] ;
    this.localAddresses = [];
    this._logger = defaultLogger;

    const interfaces = os.networkInterfaces();
    for (const k in interfaces) {
      for (const k2 in interfaces[k]) {
        const address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
          this.localAddresses.push(address.address);
        }
      }
    }
  }

  get srf() {
    return this._srf ;
  }

  set logger (l) {
    assert.ok(typeof l.info === 'function', 'logger.info must be a function');
    assert.ok(typeof l.error === 'function', 'logger.error must be a function');

    this._logger = l;
  }

  get logger() {
    return this._logger;
  }

  /**
   * connect to a specified media server
   * @param  {Mrf~ConnectOptions}   opts options describing media server to connect to
   * @param  {Mrf~ConnectCallback} [callback] callback
   * @return {Promise} if no callback is specified
   */
  connect(opts, callback) {
    assert.equal(typeof opts, 'object', 'argument \'opts\' must be provided with connection options') ;
    assert.equal(typeof opts.ari, 'object', 'argument \'opts.ari\' must be provided with ari address, username, and password') ;
    assert.equal(typeof opts.ari.address, 'string', `argument \'opts.address\' containing asterisk ari listening address is required`) ;
    assert.equal(typeof opts.ari.username, 'string', `argument \'opts.ari.username\' is required`) ;
    assert.equal(typeof opts.ari.password, 'string', `argument \'opts.ari.password\' is required`) ;

    const sip = opts.sip || {};

    const __x = (callback) => {

      const url = `http://${opts.ari.address}:${opts.ari.port || 8088}`;
      this.logger.info(`connecting to ARI ${url}, username ${opts.ari.username} password ${opts.ari.password}`);
      client.connect(url, opts.ari.username, opts.ari.password)
        .then((ari) => {
          this.logger.info('connected to ari server');
          ari.remoteAddress = `${sip.address || opts.ari.address}:${sip.port || 5060}`;
          const ms = new MediaServer(ari, this);
          ms.on('ready', () => {
            this.mediaservers.push(ms) ;
            callback(null, ms);  
          })
        })
        .catch((err) => {
          this.logger.info(err, `Error connecting to ari server at ${opts.url}`);
          callback(err);
        });
    };

    if (callback) return __x(callback) ;

    return new Promise((resolve, reject) => {
      __x((err, mediaserver) => {
        if (err) return reject(err);
        resolve(mediaserver);
      });
    });
  }

}


module.exports = exports = Mrf ;
