const test = require('tape').test ;
const exec = require('child_process').exec ;

test('starting docker network..', (t) => {
  exec(`docker-compose -f ${__dirname}/docker-compose-testbed.yaml up -d`, (err, stdout, stderr) => {
    setTimeout(t.end.bind(null, err), 1000);
  });
});

