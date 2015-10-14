'use strict';

var tls = require('tls'),
  _ = require("lodash");


module.exports = {
  createConnection: function (ip, port, macaroonWithCaveat, secretPem, callback) {

    cert; //needs to be pulled from the macaroonWithCaveat;

    var options = {
      // These are necessary only if using the client certificate authentication (so yeah, you need them)
      host: ip, 
      port: port,
      key: secretPem,
      cert: cert,
      rejectUnauthorized: false
     
      // This is necessary only if the server uses the self-signed certificate
      //ca: [ fs.readFileSync('server/server-certificate.pem') ]//HOW DO I IGNORE THIS
    };

    var socketClearTextStream = tls.connect(options, function () { return callback(socketClearTextStream); });

    return socketClearTextStream;    
  }
};
