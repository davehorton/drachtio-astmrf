const test = require('blue-tape') ;
const exec = require('child_process').exec ;

test('stopping docker network..', (t) => {
  return new Promise((resolve) => {
    exec(`docker-compose -f ${__dirname}/docker-compose-testbed.yaml down`, (err, stdout, stderr) => {
      //console.log(`stderr: ${stderr}`);
      //process.exit(0);
      resolve();
    });  
  })
});

