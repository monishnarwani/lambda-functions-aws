const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const gm = require('gm')
  .subClass({ imageMagick: true });

const srcBucket = process.env.SRC_BUCKET;
const destBucket = process.env.DEST_BUCKET;

exports.handler = (event, context, callback) => {

  console.log(srcBucket, destBucket, event)
  let imgName = event.Records[0].s3.object.key;

  let width = 200;
  let height = 300;

  readFileFromBucket(srcBucket, imgName).then(response => {
    let img = response.Body

    createThumbnail(img, width, height).then(thumbnail => {
      writeFileToBucket(destBucket, 'thumbnail_' + imgName, thumbnail, 'image/jpeg').then(response => {
        callback(null, JSON.stringify(response))
      }).catch(err => {
        console.log(err.message, 'error in writing to dest')
        callback('error in writing to dest')
      })
    }).catch(err => {
      console.log(err.message, 'error in creating thumbnail img')
      callback('error in creating thumbnail img')
    });

  }).catch(err => {
    console.log(err, err.message, err.code) // message: 'The specified key does not exist.',code: 'NoSuchKey'
    if (err.code === 'NoSuchKey') {
      callback('No file found')
    }
  })
};

function readFileFromBucket (bucketName, fileName) {
  let params = {
    Bucket: bucketName,
    Key: fileName
  };
  return new Promise(((resolve, reject) => {
    s3.getObject(params, (err, fileData) => {
      if (err) {
        return reject(err)
      } else {
        resolve(fileData)
      }
    })
  }))
}

function writeFileToBucket (bucketName, fileName, content, contentType) {
  let params = {
    Bucket: bucketName,
    Key: fileName,
    Body: content,
    ContentType: contentType
  }
  return new Promise((resolve, reject) => {
    s3.putObject(params, (err, response) => {
      if (err) {
        return reject(err)
      } else {
        return resolve(response)
      }
    })
  })
}

function createThumbnail(img, width, height) {

  return new Promise((resolve, reject) => {
    console.log('creating thumbnail image/jpeg');
    gm(img).resize(width, height, '^')
      .gravity('center')
      .toBuffer('jpg', (err, imgBuffer) => {
        if (err) {
          return reject(err)
        } else {
          return resolve(imgBuffer)
        }
      })
  })
}