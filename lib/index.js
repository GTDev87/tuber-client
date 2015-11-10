'use strict';

var tls = require('tls'),
  _ = require("lodash"),
  fs = require("fs"),
  NodeRSA = require("node-rsa"),
  request = require("request"),
  macaroons = require('macaroons.js'),
  MacaroonsBuilder = require('macaroons.js').MacaroonsBuilder;

function getMacPartsFn(delimiter) {
  return function (element) {
    var initialLoc = element.indexOf(delimiter) + delimiter.length;
    var key = element.substring(0, element.indexOf(delimiter));
    var value = element.substring(initialLoc);

    return [key, value];
  }
}

function macStringToPairs(mac, splitterFn) {
  return _.chain(mac.split("\n"))
    .filter(_.identity)
    .map(splitterFn)
    .value();
}

function macaroonPairsToObj(mac, splitterFn) { return _.object(macStringToPairs(mac, splitterFn)); }

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

function find3rdPartyCaveatParts(macaroonWithCaveat, secretPem) {
  var macaroonSerialized = macaroonWithCaveat.macaroon;
  var discharge = macaroonWithCaveat.discharge;

  var key = new NodeRSA();
  key.importKey(secretPem);

  var macaroon = MacaroonsBuilder.deserialize(macaroonSerialized);

  var getDischargeParts = getMacPartsFn(" = ");

  var macObj = macaroonPairsToObj(key.decrypt(discharge).toString('utf8'), getDischargeParts);

  var caveatKey = macObj.caveat_key;
  var message = macObj.message;

  var macaroon = MacaroonsBuilder.deserialize(macaroonSerialized);

  var getMacaroonParts = getMacPartsFn(" ");
  var stringMacPairs = macStringToPairs(macaroon.inspect(), getMacaroonParts);

  var identifierLoc = _.findIndex(stringMacPairs, function (pair) {
    return pair[0] === "cid" && pair[1] === "enc = " + discharge;
  });

  var caveatIdentifier = stringMacPairs[identifierLoc][1];
  var caveatLocation = stringMacPairs[identifierLoc + 2][1];//kind of a hack

  return {
    caveatKey: caveatKey,
    macRaw: macaroonSerialized,
    thirdParty: {
      messageObj: macaroonPairsToObj(macObj.message, getDischargeParts),
      identifier: caveatIdentifier,
      location: caveatLocation
    }
  };
}

module.exports = {
  createConnection: function (secretPemLocation, macaroonWithCaveat, location, callback) {

    var secretPem = fs.readFileSync(secretPemLocation, "utf8");
    var url = "https://" + location.ip + ":" + location.port + (location.route || "");
    var macObj = find3rdPartyCaveatParts(macaroonWithCaveat, secretPem);
    var messageObj = macObj.thirdParty.messageObj;
    var caveatKey = macObj.caveatKey;
    var caveatIdentifier = macObj.thirdParty.identifier;
    var caveatLocation = macObj.thirdParty.location;

    var fullCert = expandPem(messageObj.cert);

    var dischargedSerialized  = new MacaroonsBuilder(caveatLocation, caveatKey, caveatIdentifier)
      .add_first_party_caveat("cert = " + messageObj.cert)
      .getMacaroon()
      .serialize();

    var options = {
      // These are necessary only if using the client certificate authentication (so yeah, you need them)
      headers: { Authorization: "Bearer " + macObj.macRaw + "," + dischargedSerialized },
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