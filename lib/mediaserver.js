const Emitter = require('events').EventEmitter ;
const async = require('async') ;
const generateUuid = require('uuid') ;
const Endpoint = require('./endpoint') ;
const {makeInactiveSdp} = require('./utils');
const debug = require('debug')('drachtio:astmrf') ;

/**
 * An asterisk-based media-processing resource that contains Endpoints and Conferences.
 * @constructor
 * @param {Object} ari   ari instance
 * @param {Mrf} mrf   media resource function that instantiated this MediaServer
 *
 * @fires MediaServer#connect
 * @fires MediaServer#ready
 * @fires MediaServer#error
 */

class MediaServer extends Emitter {
  constructor(ari, mrf) {
    super() ;

    this._ari = ari ;
    this._mrf = mrf ;
    this._srf = mrf.srf ;
    this._uuid = `drachtio-${generateUuid.v4()}` ;
    this.pendingConnections = new Map();
    this.endpoints = new Map();

    debug(`creating media server with uuid ${this.id}`);

    this._connected = true;
    ari
      .on('StasisStart', (evt, channel) => {
        const uuid = evt.channel.caller.number;
        debug(`StasisStart: channel ${channel.id}`);
        if (this.pendingConnections.has(uuid)) {
          this.pendingConnections.set(uuid, {evt, channel});
          channel.answer();
        }
        else {
          this.logger.error(`uknown uuid ${uuid}`);
          channel.continue();
        }
      })
      .on('StasisEnd', (evt, channel) => {
        debug(`StasisEnd: channel ${channel.id}`);
        const uuid = evt.channel.caller.number;
        if (this.pendingConnections.has(uuid)) {
          this.pendingConnections.delete(uuid);
        }
        if (this.endpoints.has(channel.id)) {
          const ep = this.endpoints.get(channel.id);
          this.endpoints.delete(channel.id);
          ep.channelEnded(evt);
        }
        else {
          debug(`StasisEnd: could not find channel ${channel.id}!`);
        }
      });

    ari.start(this.id)
      .then(() => this.emit('ready'))
      .catch((err) => this.logger.error(err, 'error starting statis app'));

  }

  get address() {
    //return this.conn.socket && this.conn.socket.remoteAddress ;
  }

  get ari() {
    return this._ari ;
  }

  get srf() {
    return this._srf;
  }

  get mrf() {
    return this._mrf;
  }

  get id() {
    return this._uuid;
  }

  get logger() {
    return this.mrf.logger;
  }

  connected() {
    return this._connected;
  }
  /**
   * disconnect from the media server
   */
  disconnect() {
    this.ari.stop() ;
  }

  /**
   * allocate an Endpoint on the MediaServer, optionally allocating a media session to stream to a
   * remote far end SDP (session description protocol).  If no far end SDP is provided, the endpoint
   * is initially created in the inactive state.
   * @param  {MediaServer~EndpointOptions}   [opts] - create options
   * @param  {MediaServer~createEndpointCallback} [callback] callback that provides error or Endpoint
   * @return {Promise|Mediaserver} returns a Promise if no callback supplied; otherwise
   * a reference to the mediaserver object
   */
  createEndpoint(opts, callback) {
    if (typeof opts === 'function') {
      callback = opts ;
      opts = {} ;
    }
    opts = opts || {} ;

    opts.headers = opts.headers || {};
    opts.customEvents = this._mrf.customEvents;

    opts.remoteSdp = opts.remoteSdp || makeInactiveSdp(this.ari.remoteAddress);

    var family = opts.family || 'ipv4' ;
    var proto = opts.dtls ? 'dtls' : 'udp';

    const __x = (callback) => {
      if (!this.connected()) {
        return process.nextTick(() => { callback(new Error('too early: mediaserver is not connected')) ;}) ;
      }

      // generate a unique id to track the endpoint during creation
      const uuid = generateUuid.v4();
      const uri = `sip:${this.id}@${this.ari.remoteAddress}`;
  
      this.pendingConnections.set(uuid, null);
      const connectionTimeout = setTimeout(() => {
        this.logger.error(`timeout connecting to asterisk for uuid ${uuid}`);
        this.pendingConnections.delete(uuid);
        callback(new Error('Connection timeout')) ;
      }, 4000) ;

      this.srf.createUAC(uri, {
        headers: {
          'User-Agent': 'drachtio',
          'From': `<sip:${uuid}@localhost>`
        },
        localSdp: opts.remoteSdp
      })
        .then((dlg) => {
          clearTimeout(connectionTimeout);
          if (!this.pendingConnections.has(uuid)) {
            this.logger.info(`received late response to ${uuid}`);
            dlg.destroy();
          }
          else {
            const {evt, channel} = this.pendingConnections.get(uuid);
            const endpoint = new Endpoint(channel, dlg, this, opts);
            this.endpoints.set(channel.id, endpoint);
            return callback(null, endpoint);  
          }
        })
        .catch((err) => {
          this.logger.error(err, `MediaServer#createEndpoint - createUAC returned error for ${uuid}`) ;
          this.pendingConnections.delete(uuid) ;
          callback(new Error(`${err.status} ${err.reason}`));
        });
    };

    if (callback) {
      __x(callback);
      return this ;
    }

    return new Promise((resolve, reject) => {
      __x((err, endpoint) => {
        if (err) return reject(err);
        resolve(endpoint);
      });
    });
  }

  /**
   * connects an incoming call to the media server, producing both an Endpoint and a SIP Dialog upon success
   * @param  {Object}   req  - drachtio request object for incoming call
   * @param  {Object}   res  - drachtio response object for incoming call
   * @param  {MediaServer~EndpointOptions}   [opts] - options for creating endpoint and responding to caller
   * @param  {MediaServer~connectCallerCallback} callback   callback invoked on completion of operation
   * @return {Promise|Mediaserver} returns a Promise if no callback supplied; otherwise
   * a reference to the mediaserver object
  */
  connectCaller(req, res, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts ;
      opts = {} ;
    }
    opts = opts || {} ;

    const __x = (callback) => {
      async.waterfall([
        function createEndpoint(callback) {
          this.createEndpoint({
            remoteSdp: req.body,
            codecs: opts.codecs
          }, callback) ;
        }.bind(this),
        function respondToCaller(endpoint, callback) {
          this.logger.info('connectCaller - successfully connected call to media server');

          this.srf.createUAS(req, res, {
            localSdp: endpoint.local.sdp,
            headers: opts.headers
          }, (err, dialog) => {
            if (err) {
              endpoint.destroy();
              return callback(err);
            }
            callback(null, {endpoint, dialog}) ;
          }) ;
        }.bind(this)
      ], (err, pair) => {
        callback(err, pair) ;
      }) ;
    };

    if (callback) {
      __x(callback);
      return this ;
    }

    return new Promise((resolve, reject) => {
      __x((err, pair) => {
        if (err) return reject(err);
        resolve(pair);
      });
    });
  }

}

module.exports = exports = MediaServer ;
