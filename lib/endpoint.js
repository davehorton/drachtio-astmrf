const Emitter = require('events').EventEmitter ;
const debug = require('debug')('drachtio:astmrf') ;

const State = {
  NOT_CONNECTED: 1,
  EARLY: 2,
  CONNECTED: 3,
  DISCONNECTED: 4
};


/**
 * A media resource on a freeswitch-based MediaServer that is capable of play,
 * record, signal detection, and signal generation
 * Note: This constructor should not be called directly: rather, call MediaServer#createEndpoint
 * to create an instance of an Endpoint on a MediaServer
 * @constructor
 * @param {esl.Connection} conn - outbound connection from a media server for one session
 * @param {Dialog}   dialog - SIP Dialog to Freeswitch
 * @param {MediaServer}   ms - MediaServer that contains this Endpoint
 * @param {Endpoint~createOptions} [opts] configuration options
 */
class Endpoint extends Emitter {
  constructor(channel, dialog, ms, opts) {
    super() ;

    opts = opts || {} ;

    this._channel = channel ;
    this._ms = ms ;
    this._dialog = dialog ;

    this._dialog.on('destroy', this._onBye.bind(this));

    this.logger.info(`Endpoint: channel ${this.channelId}: ${this.channelName}`);

    //debug(`Endpoint created with channel ${JSON.stringify(channel)}`);

    /**
     * defines the local network connection of the Endpoint
     * @type {Endpoint~NetworkConnection}
     */
    this.local = {
      sdp: this._dialog.remote.sdp
    } ;
    /**
     * defines the remote network connection of the Endpoint
     * @type {Endpoint~NetworkConnection}
     */
    this.remote = {
      sdp: this._dialog.local.sdp
    } ;
    /**
     * defines the SIP signaling parameters of the Endpoint
     * @type {Endpoint~SipInfo}
     */
    this.sip = {} ;

    /**
     * conference name and memberId associated with the conference that the endpoint is currently joined to
     * @type {Object}
     */
    this.conf = {} ;
    this.state = State.CONNECTED ;
  }

  /**
   * @return {MediaServer} the mediaserver that contains this endpoint
   */
  get mediaserver() {
    return this._ms ;
  }

  /**
   * @return {Srf} the Srf instance used to send SIP signaling to this endpoint and associated mediaserver
   */
  get srf() {
    return this._ms.srf ;
  }

  /**
   * @return {esl.Connection} the Freeswitch outbound connection used to control this Endpoint
   */
  get channel() {
    return this._channel ;
  }

  get channelId() {
    return this._channel.id;
  }

  get channelName() {
    return this._channel.name;
  }

  get logger() {
    return this._ms.logger;
  }

  get dialog() {
    return this._dialog ;
  }

  destroy() {
    this.dialog.destroy();
  }

  _onBye() {
    this.channel.hangup();
  }

  channelEnded(evt) {
    this.state = State.DISCONNECTED;
    this.emit('destroy');
  }

}

module.exports = exports = Endpoint ;
