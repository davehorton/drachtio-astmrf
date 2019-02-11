const Srf = require('drachtio-srf');
const Mrf = require('..');
const srf = new Srf();
const mrf = new Mrf(srf);
let ms;

srf.connect({host: '127.0.0.1', port: 9022, secret: 'cymru'})
  .on('connect', (err, hp) => {
    if (err) throw err;
    console.log(hp, 'connected');
    connectMS();
  })
  .on('error', (err) => {
    console.log(err);
  });

function connectMS() {
  mrf.connect({
    ari: {
      address: '159.65.71.69', 
      port: 8088, 
      username: 'asterisk', 
      password: 'asterisk'
    }
  })
    .then((mediaserver) => {
      console.log('connected to media server');
      ms = mediaserver;
    })
    .catch((err) => {
      console.log(err, 'error connecting to ms');
    });
}

srf.invite((req, res) => {
  ms.connectCaller(req, res, {
    localSdp: req.body
  })
    .then(({endpoint, dialog}) => {
      console.log('successfully connected call');
      dialog.on('destroy', () => {
        console.log('caller hung up');
        endpoint.destroy();
      })
    })
    .catch((err) => {
      console.log(err, 'error connecting call');
    })
});
