const Srf = require('drachtio-srf');
const Mrf = require('..');
const srf = new Srf();
const mrf = new Mrf(srf);

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
    .then((ms) => {
      console.log('connected to media server');
      ms.disconnect();
      srf.disconnect();
    })
    .catch((err) => {
      console.log(err, 'error connecting to ms');
    });
}