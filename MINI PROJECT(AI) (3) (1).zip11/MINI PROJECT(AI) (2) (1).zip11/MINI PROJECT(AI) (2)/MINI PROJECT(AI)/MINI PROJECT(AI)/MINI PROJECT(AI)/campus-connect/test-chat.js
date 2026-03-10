const http = require('http');

const data = JSON.stringify({ message: 'hello from test script' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  },
  timeout: 8000
};

const req = http.request(options, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
  });
});

req.on('error', (e) => {
  console.error('ERR', e);
  process.exitCode = 2;
});

req.on('timeout', () => {
  console.error('ERR timeout');
  req.abort();
  process.exitCode = 2;
});

req.write(data);
req.end();

