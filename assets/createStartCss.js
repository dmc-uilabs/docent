var fs = require('fs');
var inData = fs.readFileSync('./app/mra.css', 'utf8');
var singleLine = inData.split('\n').join(' ');
// var encoded = encodeURI(singleLine);
singleLine = singleLine.replace("../images/menu-close.png", "https://dmcmra.s3.amazonaws.com/dev/menu-close.png?AWSAccessKeyId=AKIAJC3XRFBNOJQRODRA&Expires=1529090621&Signature=qdxYWAX89JDnh%2B%2Bqg0lGU23lVpU%3D")
singleLine = singleLine.replace("../images/menu.png", "https://dmcmra.s3.amazonaws.com/dev/menu.png?AWSAccessKeyId=AKIAJC3XRFBNOJQRODRA&Expires=1529090615&Signature=I5icA2VdCHZruO9rzh9hHtTQiW0%3D")

var encoded = singleLine;
fs.writeFile('./assets/inputCss.css', encoded, 'utf8', function(err) {
  if(err) return console.log(err);
});