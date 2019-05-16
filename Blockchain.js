
// Blockchain Dependencies
const SHA256 = require('crypto-js/sha256');
const RequestObject = require('./RequestObject.js'); //
const Block = require('./Block.js');
const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

//Global variables
let PROJ02_GLOBAL_DEBUG = 1; // 1: display debug data, 0: don't display


// Add data to levelDB with key/value pair
function addLevelDBData(key,value){
    return new Promise((resolve, reject) => {
      db.put(key, value, function(err){
        if(err){
          console.log('Block '+key+' submission failed ',err);
          reject(err);
        }
        resolve(value);
      });
    });
}

// Add data to levelDB with value
function addDataToLevelDB(value) { // works, not used 4/22/2019
    let i = 0;

      db.createReadStream()
      .on('data',  function(data) { i++; })
      .on('err',   function(err)  { console.log('Unable to read data stream!'); return(err); })
      .on('close', async function()     { console.log('Block #' + i);
                                          let addDataToLevelDB_result = await addLevelDBData(i, value);
                                          return(addDataToLevelDB_result); });
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/
class Blockchain{
  constructor(){
    this.tor = [];      // proj04 5min [t]ime [o]ut [r]equest, array of RequestObjects
    this.mempool = [];        // proj04 30min

    this.chain = [];          // proj02 persisted
		this.lHeight = -1;					 // (this validable added by Alex) this.lHeight = -1 for no block. LevelDB height [i] (see Comment Legend at top of file)
		this.cBlock = new Block(""); // current  block [i]
		this.cBlockValid = false;		 // current  block validity
		this.pBlock = new Block(""); // previous block [i-1] for i>0
		this.pBlockValid = false;		 // previous block validity [i]

    this.getBlockHeight().then( h => {
      if(h == -1){
        //console.log('BlockChain::constructor::height= ', 0);
        this.addBlock(new Block("First block in the chain - Genesis block"));
      }
    }); // conditionally add genesis Block

  }

  //given a walletAddress
  // this returns a pre-existing tor (timeout request) or zero
  getTor(cWalletAddress){// add this : this.tor[cWalletAddress]
    return this.tor[cWalletAddress]
    /*
    for(var i = 0; i < this.tor.length - 1; i++){
      if(this.tor[i].address == cTor.address){
        console.log('getTor(): pre Existing found: ',this.tor[i].address);
        return this.tor[i].body;
      }
    }
    return 0;
    */
  }

  // add Time Out Request (tor), input: RequestObject
  addTor(newTor, timeout){
    //console.log('addTor():this.tor.length: ',this.tor.length);
    console.log('addTor():this.tor (before add) ',this.tor);
    //works 8-May to manage timeouts w/ 1 request add:

    //this.tor[newTor.address] = setTimeout(function(){self.removeValidationRequest(self.tor[newTor.address])} , timeout );
    console.log('addTor(): newTor.address ',newTor.address);
    this.mempool[newTor.address] = newTor;

    var self = this; // self is 'patch or connector outside scope of setTimeout(function(){~})'
    this.tor[newTor.address] = setTimeout(self.removeValidationRequest , timeout, self.tor[newTor.address]);
    //console.log('addTor(): this.tor.length: ',this.tor.length);// undef
    //console.log('addTor(): this.tor[self.tor.length-1]: ',this.tor[self.tor.length-1]);// undef
    console.log('addTor(): this.tor[newTor.address] (after add): ', this.tor[newTor.address]);
    console.log('addTor(): this.mempool[newTor.address] (after add): ', this.mempool[newTor.address]);
  }

  //removes TimeOut Request matching a specified walletAddress
  removeValidationRequest(cWalletAddress){ // not working last left off 21:47-8MAY
    //for(var i = 0; i < this.tor.length - 1; i++){
    //  if(this.tor[i].address == cWalletAddress){
        //console.log('removeValidationRequest: this.tor[cWalletAddress] '+this.tor[cWalletAddress]+' removed')

        //console.log('removeValidationRequest():this.tor (before remove)',this.tor);
        //this.tor.splice(this.tor.indexOf(cWalletAddress)); //works?
        console.log('removeValidationRequest(): removing '+cWalletAddress);
        //console.log('removeValidationRequest(): this.tor[cWalletAddress]: ',this.tor[cWalletAddress]);
        //console.log('removeValidationRequest():this.tor (after remove)',this.tor);
        //this.tor[cWalletAddress] = clearTimeout(this.tor[cWalletAddress]); // works ?
        this.mempool[cWalletAddress] = null;
        this.tor[cWalletAddress] = null;
        clearTimeout(this.tor[cWalletAddress]); // works ?

        console.log('removeValidationRequest():this.mempool: ',this.mempool);
        console.log('removeValidationRequest():this.tor: ',this.tor)
    //  }
    //}
  }

  // Add new block
  async addBlock(newBlock){
    // Block height
    let nbheight = await this.getBlockHeight();
    if(PROJ02_GLOBAL_DEBUG) console.log('addBlock: nbheight (before cond)= ', nbheight);
    if (nbheight == -1)    {newBlock.height = 0; }
    else if(nbheight == 0) {newBlock.height = 1; }       // persist Genesis block with height=0 (not -1)
    else if(nbheight >= 1) {nbheight++; newBlock.height = nbheight; }
    if(PROJ02_GLOBAL_DEBUG) console.log('addBlock:newBlock.height(after cond)= ', newBlock.height);
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if( newBlock.height > 0 ){
      this.pBlock = await this.getBlock(newBlock.height - 1);
      if(PROJ02_GLOBAL_DEBUG == 1){console.log('addBlock::this.pBlock.hash= ', this.pBlock.hash);}
      newBlock.previousBlockHash = this.pBlock.hash;
    }

    //debug
    if(PROJ02_GLOBAL_DEBUG == 1){
    		//console.log('addBlock: newBlock (before hashCalced)= /n', newBlock);
    		//console.log('addBlock: SHA256(JSON.stringify(newBlock)).toString()/n (before HashCalced)= ',
    		//						SHA256(JSON.stringify(newBlock)).toString());
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    //debug
    if(PROJ02_GLOBAL_DEBUG == 1){
    		console.log('addBlock: newBlock (after hashCalced)= /n', newBlock);
    		console.log('addBlock: SHA256(JSON.stringify(newBlock)).toString()/n (after  HashCalced)= ',
    								SHA256(JSON.stringify(newBlock)).toString());
    }

		//persist data via addLevelDBData(key,value) // works
    let addLevelDBData_result = await addLevelDBData(newBlock.height, JSON.stringify(newBlock).toString());
    if(PROJ02_GLOBAL_DEBUG) console.log('addLevelDBData_result= ',addLevelDBData_result);
  }



  // Get block height
  getBlockHeight(){ // udacity approved

    return new Promise((resolve, reject) => {
      let height_count = 0;
      db.createReadStream()
      .on('data',  function(data){ height_count++;})
      .on('err',   function(err) { console.log('getBlockHeight error: ', err);reject(err);})
      .on('close', function(){height_count--;
                    if(PROJ02_GLOBAL_DEBUG == 1) { console.log('Blockchain height= ', height_count); }
                   resolve(height_count);});
    });

  }

  // get block via blockHeight
  getBlock(blockHeight){ // realized from getLevelDBData() *Udacity Approved APR2019
    return new Promise((resolve, reject) => {
      db.get(blockHeight, function(err, gotBlock){
        if(err) return console.log('Not found: ', err);
        resolve(JSON.parse(gotBlock));
      });
    });
  }

  // validate block
  async validateBlock(blockHeight){
		// get block object
    //clear this.cBlock
    this.cBlock.hash = "";
    this.cBlock.height = 0;
    this.cBlock.body = "";
    this.cBlock.time = 0;
    this.cBlock.previousBlockHash = "";

    try {
      this.cBlock = await this.getBlock(blockHeight);
      if(PROJ02_GLOBAL_DEBUG) console.log('validateBlock: this.cBlock= ', this.cBlock);
    }catch(err){
      console.log('validateBlock error: ', err);
    }

    // get block hash
    let blockHash = this.cBlock.hash;
    if(PROJ02_GLOBAL_DEBUG == 1){ console.log('validateBlock: this.cBlock.hash= ', this.cBlock.hash); }
    // remove block hash to test block integrity
    this.cBlock.hash = '';
    // generate block hash
    let validBlockHash = SHA256(JSON.stringify(this.cBlock)).toString();
    if(PROJ02_GLOBAL_DEBUG == 1){ console.log('validateBlock: validBlockHash= ', validBlockHash); }
    // Compare
    if(blockHash===validBlockHash){
      this.cBlockValid = true;//incase return doesn't "propogate"
      if(PROJ02_GLOBAL_DEBUG) console.log('Block '+blockHeight+' is [[[Valid]]] (this.cBlockValid= '+this.cBlockValid+')');
      return this.cBlockValid; //this.cBlockValid = true;
    } else{
      if(PROJ02_GLOBAL_DEBUG) console.log('Block '+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
      this.cBlockValid = false;//incase return doesn't "propogate"
      console.log('this.cBlockValid= ', this.cBlockValid);
      return this.cBlockValid; //this.cBlockValid = false;
    }
  }//validateBlock()end

 // Validate blockchain
  async validateChain(){ // need to use db.createReadStream()
    let errorLog = [];
    try{
      this.lHeight = await this.getBlockHeight();
      if(PROJ02_GLOBAL_DEBUG) console.log('validateChain: this.lHeight= ', this.lHeight);
    }catch(err){
      console.log('validateChain: getBlockHeight: Error: ', err);
    }

    if(this.lHeight > 0) { // can only validate if there is at least 2: height=0(Gentsis) and height=1

      for (var i = 1; i <= this.lHeight; i++) {
        if(i > 0) { //start validation with i=0 and i=1
          // validate block
    			try{
            let cBlockValid = false; // reset
            cBlockValid = await this.validateBlock(i); // evaluates this.cBlockValid
            if (!cBlockValid)errorLog.push(i);

            // compare blocks hash link
            this.cBlock = await this.getBlock(i);
            let blockHash = this.cBlock.previousBlockHash; //let blockHash = this.cBlock.hash;//original
            this.pBlock = await this.getBlock(i-1);
            let previousHash = this.pBlock.hash; //let previousHash = this.pBlock.previousBlockHash;//original

            if (blockHash!==previousHash) {
              errorLog.push(i);
            }
          }catch(err){
            console.log('validateChain:this.validateBlock('+ i +'):error: ', err);
          }
        }//if
      }//for
  }//if
    if (errorLog.length>0) {
      console.log('Block errors = ' + errorLog.length);
      console.log('Blocks: '+errorLog);
    } else {
      console.log('No errors detected');
    }
  }
}// Blockchain class
module.exports = Blockchain;
