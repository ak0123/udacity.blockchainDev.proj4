/* ===== Request Object Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/
class RequestObject{
	constructor(address, message){
    this.walletAddress = address, // example "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL"
    this.requestTimeStamp = new Date().getTime().toString().slice(0,-3), // example "1541605128"
    this.message = message, //example "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL:1541605128:starRegistry",
    this.validationWindow = 0 //example "300"
    }
}
module.exports = RequestObject;
