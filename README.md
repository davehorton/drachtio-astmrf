# drachtio-astmrf [![Build Status](https://secure.travis-ci.org/davehorton/drachtio-astmrf.png)](http://travis-ci.org/davehorton/drachtio-astmrf) [![NPM version](https://badge.fury.io/js/drachtio-astmrf.svg)](http://badge.fury.io/js/drachtio-astmrf)

A companion module to [drachtio-srf](https://www.npmjs.com/package/drachtio-srf) that lets you build [drachtio](https://drachtio.org) applications and utilize [Asterisk](https://www.asterisk.org) as a media server.

```js
const Srf = require('drachtio-srf');
const Mrf = require('drachtio-astmrf');
const srf = new Srf();
const mrf = new Mrf(srf);

// as per usual
srf.connect(..);

// we are connecting to ARI
mrf.connect({
  ari: {
    address: "127.0.0.1",
    username: "asterisk",
    password: "asterisk",
    port: 8088
  },
  sip: {
    address: "172.21.0.11",
    port: 5060
  }
}).then((mediaserver) => {
  do_start(mediaserver);
});

function do_start(ms) {
  srf.invite((req, res) => {
    ms.connectCaller(req, res, {localSdp: req.body})
      .then(({endpoint, dialog})=> {
        const ari = ms.ari;
        const channel = endpoint.channel;

        dialog.on('destroy', () => endpoint.destroy());

        const playback = ari.Playback();
        channel.play({media: 'sound:tt-monkeys'}, playback, (err, newPlayback) => {..});
      });
  });
}
```
As you can see from the example above, the library consists of a thin wrapper over [ari-client](https://www.npmjs.com/package/ari-client), exposing a Mediaserver object that wraps an ari client connection, and an Endpoint object that wraps an ari channel object.

Mediaserver objects are produced by calling the `Mrf#connect` method which connects to an asterisk ari server and starts a Stasis application.

Endpoint objects are produced either by 
* `Mediaserver#createEndpoint`, or by
* `Mediaserver#connectCaller`, which connects an incoming call to the Asterisk server.

Once you have an Endpoint, you will typically use the `Endpoint#channel` and the `Mediaserver#ari` properties to manipulate media server resources, as described in the [ari-client README](https://github.com/asterisk/node-ari-client/blob/master/README.md)

## How it works

Some configuration is necessary on the Asterisk server in order for calls to be routed properly to the Stasis application(s) created behind the scenes by this library.

In particular, two things must be true:
1. An incoming call must be identified to be from a drachtio application.
2. A dialplan must exist that matches the call and executes a Stasis application created by that application.

Here is the recommended way to accomplish that.
>> Note: that for those preferring to use Docker can obtain a [Docker image](https://cloud.docker.com/u/drachtio/repository/docker/drachtio/asterisk/) that is preconfigured to work )

First, in `pjsip.conf` route incoming calls with a User-Agent header matching 'drachtio' to a specific context:
```
[drachtio]
type=endpoint
transport=transport-udp
context=drachtio
allow=all
disallow=none

[drachtio]
type=identify
endpoint=drachtio
match_header=User-Agent: drachtio
```
Next, in `extensions.conf` have a simple diaplan in the context named "drachtio" that looks like this:
```
[drachtio]
exten => _drachtio.,1,NoOp()
 same => n,Stasis(${EXTEN})
```
This dialplan matches any invite request where the user part of the Request-URI starts with "drachtio" to a Stasis application with a name equal to the full user value.

This works because the library generates a unique Stasis app name for each Asterisk it connects to, and puts that name in the Request-URI of all INVITEs it routes to that Asterisk server.

## API

### Mrf
Represents a media resource framework.  Generally, you will create a single instance of this in your application and use it to connect to one or many Asterisk servers.  You must pass in the constructor an instance of the [Srf](https://drachtio.org/api#srf) class.

##### Constructor
`new Mrf(srf)` - returns an instance of the media resource framework that can then be used to connect to media servers.

##### Methods
`connect(opts)` - connects to an Asterisk ARI server and returns a Promise that resolves to an instance of the Mediaserver class.
```
opts.ari.address  - address of ARI http server
opts.ari.username - username to authenticate to ARI 
opts.ari.password - password to authenticate with
opts.ari.port     - ARI listening port (default: 8088)
opts.sip.address  - sip address that Asterisk is listening on
opts.sip.port     - sip port that Asterisk is listening on (default: 5060)
```

### Mediaserver
Represents an Asterisk media server, and is a thin wrapper around the "ari" object exposed by [ari-client](https://www.npmjs.com/package/ari-client#api).  There is no public constructor for this class; the only way to obtain a media server instance is to invoke the `Mrf#connect` method.

When a Mediaserver is created it starts a Stasis application with a unique name/uuid on the Asterisk server.

##### Methods
`createEndpoint(opts, callback)` - creates an Endpoint (/channel) on the Asterisk media server.  This method can accept either a callback or return a Promise that resolves to an `Endpoint` object.
```
opts.remoteSdp - (optional) a remote SDP that Asterisk should stream to.  If not provided an SDP is generated that will initially be inactive.
```

`connectCaller(req, res, opts, callback)` - connects an incoming call to the Asterisk server.  This method can accept either a callback or a Promise that resolves to an object containing a `dialog` and an `endpoint` property representing both the UAS SIP dialog created for the call as well as the Endpoint that has been allocated on the media server.
```
opts.headers - SIP headers to include on the 200 OK response sent back to to the caller
```

`disconnect()` - stops the Stasis application and disconnects from the ARI server.
##### properties
`ari` - the underlying ari object

### Endpoint 
Represents a channel on the Asterisk media server, and is a thin wrapper around the "channel" object exposed by [ari-client](https://www.npmjs.com/package/ari-client#api) as well as the [SIP Dialog](https://drachtio.org/api#dialog) object between the drachtio server and Asterisk.  

There is no public constructor for this class; the only way to obtain an Endpoint is via the `Mediaserver#createEndpoint` or `Mediaserver#connectCaller` methods.

#### Methods
`destroy()` - sends a BYE to Asterisk for the SIP call related to this endpoint, which clears the associated channel.
#### Properties
`channel`     - the underlying channel object

`channelId`   - the Asterisk channel id

`channelName` - the Asterisk channel name

`dialog`      - the underlying [sip dialog](https://drachtio.org/api#dialog) object
