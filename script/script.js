var tuberClient = require("../lib"),
  fs = require("fs"),
  args = process.argv.slice(2),
  ip = args[0],
  port = args[1],
  secretFileLocation = args[2],
  macaroonFileLocation = args[3];

var socketClearTextStream = tuberClient.createConnection(
  fs.readFileSync(secretFileLocation, "utf8"), 
  JSON.parse(fs.readFileSync(macaroonFileLocation, "utf8")),
  "https://" + ip + ":" + port,
  function (error, response, body) {
    if(response.statusCode == 201){
      console.log('document saved as: http://mikeal.iriscouch.com/testjs/'+ rand)
    } else {
      console.log('error: '+ response.statusCode)
      console.log(body);
    }
  });