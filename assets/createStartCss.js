var fs = require('fs');
var inData = fs.readFileSync('./app/mra.css', 'utf8');
var singleLine = inData.split('\n').join(' ');
var encoded = encodeURI(singleLine);
fs.writeFile('./assets/inputCss.txt', encoded, 'utf8', function(err) {
  if(err) return console.log(err);
});