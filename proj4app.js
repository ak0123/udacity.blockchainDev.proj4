// getting started https://hapijs.com/tutorials

'use strict';
const Hapi = require('hapi');
const Joi = require('joi'); //  validation
const RequestObject = require('./RequestObject.js'); // must be capital first char
const Block = require('./Block.js');
const Blockchain = require('./Blockchain.js');


let mbc = new Blockchain(); //my Blockchain (mbc)
/*
// test data from proj 2
mbc.getBlockHeight().then( h => {
  if(h < 0 ){ // works 4/23
    //add test data
    (function theLoop (i) { // works 4/22/2019
      setTimeout(function () {
        mbc.addBlock(new Block("test data timeout "+i));
        if (--i) theLoop(i);
      }, 100);
    })(10);
  }
}); // conditionally add genesis Block
*/

// define web service API
const init = async () => {

    const server = Hapi.server({
        port: 8000, // per proj04 ruberic
        host: 'localhost' // per proj04 ruberic
    });

    server.route({
      method: 'GET', // works in Postman per Ruberic 4/23
      path:'/block/{blockHeight}',
      handler: async (request, h) => {
        let mbcHeight = await mbc.getBlockHeight(); // notes to self: multiple awaits work in 1 async func
        let rBlockHeight = `${encodeURIComponent(request.params.blockHeight)}`; // works with `` not ''. requested blockHeight

        if ( rBlockHeight < 0 ) { // works 4/23
          return 'GET error: Specified block height too low' }
        else if ( rBlockHeight > mbcHeight ) { // works 4/23
          return 'GET error: Specified block height too high' }
        else {
          let rBlock = new Block(""); // requsted block
          rBlock = await mbc.getBlock(rBlockHeight); // proj03 works
          return JSON.stringify(rBlock, null, '\t'); // proj03 works
        }
      },
      options: {
        validate: {
          params: {
            blockHeight: Joi.number().integer() //proj03 works
          }
        }
      }
    }),
    server.route({
      method: 'POST',
      path:'/requestValidation', // proj04 ruberic#1
      config: {
        validate: {
          payload: {
            address:  Joi.string().required()
          }
        }
      }, // don't forget these commas (not auto-added)
      handler: function (request, h) {
        const payload = request.payload;
        if (payload.address != "") {
          // add timeout request only if non pre-exists

          let TIMEOUT_REQUESTS_WINDOW_TIME = 10*1000;//5*60*1000; // 5 min = 60 ms * 1000 * 5

          let newTor = new RequestObject(payload.address, 'tempTest Body Data');
          console.log('newTor.requestTimeStamp ',newTor.requestTimeStamp);
console.log('newTor.address: ',newTor.address);
          let timeElapse = (new Date().getTime().toString().slice(0,-3)) - newTor.requestTimeStamp;
          let timeLeft = (TIMEOUT_REQUESTS_WINDOW_TIME/1000) - timeElapse;
          newTor.validationWindow = timeLeft;
          console.log('newTor.validationWindow ',newTor.validationWindow );

          let cTorStatus = mbc.getTor(newTor.address);
          console.log('cTorStatus: ',cTorStatus);
          if( cTorStatus == undefined ) { // tor.indexOf not found returns -1
            mbc.addTor(newTor, TIMEOUT_REQUESTS_WINDOW_TIME);
            return "timeout request added for 5 min";
          }
          else {
            console.log('cTorStatus: ',cTorStatus);
            return cTorStatus; // if not 0, pre-existing is returned
          }

        }
        else {
          return 'Please specify a non-empty string for the Address of your new Request :)'; // payload.body accessible as of 4/23
        }
      }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
