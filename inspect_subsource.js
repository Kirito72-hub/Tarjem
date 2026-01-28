const https = require('https');

const query = 'Chainsaw Man';
const url = `https://api.subsource.net/v1/subtitles?query=${encodeURIComponent(query)}`;

console.log(`Fetching from: ${url}`);

const options = {
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Response status:', res.statusCode);
      if (json.data && json.data.length > 0) {
        console.log('First result structure:');
        console.log(JSON.stringify(json.data[0], null, 2));
      } else {
        console.log('No data found or data is empty.');
        console.log('Full response:', JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw data:', data);
    }
  });

}).on('error', (err) => {
  console.error('Error:', err.message);
});
