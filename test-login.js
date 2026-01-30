const http = require('http');

const data = JSON.stringify({
    username: 'admin@example.com',
    password: 'password123'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('BODY START:');
        console.log(body.substring(0, 500));
        console.log('BODY END');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
