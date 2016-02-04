// import assert from 'assert';
// import tuberDeploy from '../lib';
console.log("test started");
var assert = require("assert"),
  tuberClient = require("../lib");

describe('tuber-client', function () {
  var err = null;

  beforeEach(function(done) {
    tuberClient.createConnection(secretPemLocation, macaroonWithCaveat, location, function (err, response, body) {
      err = errObj;
      done();
    });
  });

  it('should have unit test!', function () {
  });
});