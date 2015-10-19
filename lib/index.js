'use strict';

var tls = require('tls'),
  _ = require("lodash"),
  NodeRSA = require("node-rsa"),
  request = require("request"),
  macaroons = require('macaroons.js'),
  MacaroonsBuilder = require('macaroons.js').MacaroonsBuilder;

function getMacParts(element) {
  var delimiter = " = ";
  var initialLoc = element.indexOf(delimiter) + delimiter.length;
  var key = element.substring(0, element.indexOf(delimiter));
  var value = element.substring(initialLoc);

  return [key, value];
}

function macaroonPairsToObj(decryptedDischarge) {
  return _.chain(decryptedDischarge.split("\n"))
    .filter(_.identity)
    .map(getMacParts)
    .object()
    .value();
}

var CHARACTERS_ON_CERTIFICATE_LINE = 64;

function base64WithSplitCharLines(string){
  return _.chain(string)
    .chunk(CHARACTERS_ON_CERTIFICATE_LINE)
    .map(function (str) {return str.join(""); } )
    .value();
}

function expandPem(string){
  return _.flatten([
    ["-----BEGIN CERTIFICATE-----"],
    base64WithSplitCharLines(string),
    ["-----END CERTIFICATE-----"]
  ], true).join("\n");
}

module.exports = {
  createConnection: function (secretPem, macaroonWithCaveat, url, callback) {

    var macaroonSerialized = macaroonWithCaveat.macaroon;
    var discharge = macaroonWithCaveat.discharge;

    var key = new NodeRSA();
    key.importKey(secretPem);

    var macObj = macaroonPairsToObj(key.decrypt(discharge).toString('utf8'));

    var caveatKey = macObj.caveat_key;
    var message = macObj.message;

    var messageObj = macaroonPairsToObj(macObj.message);
    var fullCert = expandPem(messageObj.cert);

    var discharged  = new MacaroonsBuilder("Tuber Client Proto", caveatKey, "this is the cert specific discharge for " + url)
      .add_first_party_caveat("cert = " + messageObj.cert)
      .getMacaroon();

    var dischargeAndRoot = MacaroonsBuilder.modify(MacaroonsBuilder.deserialize(macaroonSerialized))
      .prepare_for_request(discharged)
      .getMacaroon()
      .serialize();

    var options = {
      // These are necessary only if using the client certificate authentication (so yeah, you need them)
      headers: { Authorization: "Bearer " + dischargeAndRoot },
      key: secretPem,
      cert: fullCert,
      rejectUnauthorized: false,
      url: url
     
      // This is necessary only if the server uses the self-signed certificate
      //ca: [ fs.readFileSync('server/server-certificate.pem') ]//HOW DO I IGNORE THIS
    };

    return request.get(options, callback)
  }
};
