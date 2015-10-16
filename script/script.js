var tuberClient = require("../lib"),
  fs = require("fs"),
  args = process.argv.slice(2),
  ip = args[0],
  port = args[1],
  secretFileLocation = args[2],
  macaroonFileLocation = args[3];

tuberClient.createConnection(
  ip, 
  port, 
  fs.readFileSync(secretFileLocation, "utf8"), 
  JSON.parse(fs.readFileSync(macaroonFileLocation, "utf8")), 
  function (socketClearTextStream){
    


  });