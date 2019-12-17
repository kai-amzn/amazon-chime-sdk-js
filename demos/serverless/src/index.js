const fs = require('fs');

exports.handler = async (event, context, callback) => {
  const response = {
    'statusCode': 200,
    'headers': {
      'Content-Type': 'text/html'
    },
    'body': '',
    'isBase64Encoded': false
  };

  const userAgent = event.headers && event.headers['User-Agent'];
  const mobilePath = './mobile.html';

  if (userAgent && userAgent.toLowerCase().match('android') && fs.existsSync(mobilePath)) {
    response.body = fs.readFileSync(mobilePath, { encoding: 'utf8' });
  } else {
    response.body = fs.readFileSync('./index.html', { encoding: 'utf8' });
  }
  
  callback(null, response);
};
