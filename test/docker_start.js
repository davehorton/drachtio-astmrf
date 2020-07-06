const test = require('blue-tape') ;
const exec = require('child_process').exec ;

test('starting docker network..', (t) => {
  return new Promise((resolve, reject) => {
    exec(`docker-compose -f ${__dirname}/docker-compose-testbed.yaml up -d`, (err, stdout, stderr) => {
      setTimeout(() => {
        console.log('docker up');
        resolve();
      }, 1000);
    });  
  })
});

