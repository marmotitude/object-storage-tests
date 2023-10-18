import { randomBytes } from 'k6/crypto';
import { fail } from 'k6'
import file from 'k6/x/file';

// parse JSON
export function parseJsonOrFail(value) {
  let parsedResult;
  try {
    parsedResult = JSON.parse(value)
  } catch(e) {
    console.error(e)
    fail('Unparseable result response')
  }
  return parsedResult
}

// checks if every etag from a given etag list, is present in the stdOut string
export function checkParts(parts, etags) {
  return parts.reduce((result, part) => {
    return (etags.find(e => e.ETag == part.ETag) !== undefined) && result
  }, true)
}

export function generateMultipartFiles(chunkPrefix, chunkCount=2, chunkSize=6) {
  console.log("Generating files for test multipart upload...")
  const bigFile = randomBytes(chunkSize * chunkCount * 1024 * 1024);
  let chunks = []
  let initSlice = 0
  
  for (let i = 1; i <= chunkCount; i++) {
    let endSlice = (chunkSize * i) * 1024 * 1024
    let partData = bigFile.slice(initSlice, endSlice);
    let chunkPath = `${chunkPrefix}_${i}`
    file.writeBytes(
      chunkPath, 
      Array.from(new Uint8Array(partData)));
    initSlice = endSlice
    chunks.push({path: chunkPath, partNumber: i})
  }
  console.log("Done generating files for test multipart upload...")
  return chunks
}

export function removeMultipartFiles(chunkPrefix, chunkCount) {
  console.log("Cleaning files for test multipart upload...")
  for(let i = 1; i <= chunkCount; i++) {
    file.deleteFile(`${chunkPrefix}_${i}`)
  }
  console.log("Done cleaning files for test multipart upload...")
}
