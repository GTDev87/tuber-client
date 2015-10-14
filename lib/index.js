var pem = require("pem"),
  _ = require("lodash");


module.exports = {
  createConnection: function (ip, port, macaroonWithCaveat) {
    pem.createCertificate({days:1, selfSigned:true}, function(err, keys){

      // console.log("cert = " + keys.certificate);
      // console.log("priv = " + keys.serviceKey);

    });
  }
};
