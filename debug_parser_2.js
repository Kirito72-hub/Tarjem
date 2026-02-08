const { parseMediaFilename } = require('./src/main/utils/guessitParser');

const filename = '[Erai-raws] Sousou no Frieren - 03 [1080p][HEVC][55BADCC4].mkv';
const result = parseMediaFilename(filename);

console.log('Filename:', filename);
console.log('Parsed Result:', JSON.stringify(result, null, 2));
