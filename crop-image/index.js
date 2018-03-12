const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const gm = require('gm')
  .subClass({ imageMagick: true });

const srcBucket = process.env.SRC_BUCKET;
const destBucket = process.env.DEST_BUCKET;

exports.handler = (event, context, callback) => {

  // let imgName = event.Records[0].s3.object.key;
  let imgName = event.imgName;
  let cropRatio = event.cropRatio;
  console.log(cropRatio);

  readFileFromBucket(srcBucket, imgName).then(response => {
    console.log('file found') // content of file
    let img = response.Body
    cropImage(img, cropRatio).then(croppedImg => {
      writeFileToBucket(destBucket, 'cropped_' + imgName, croppedImg, 'image/jpeg').then(response => {
        console.log('Hurah!! success')
        response.objectUrl = 'http://' + destBucket + '.s3.amazonaws.com/' + 'cropped_' + imgName
        callback(null, response)
      }).catch(err => {
        console.log(err.message, 'error in writing to dest')
        callback('error in writing to dest')
      })
    }).catch(err => {
      console.log(err.message, 'error in cropping img')
      callback('error in cropping img')
    })

  }).catch(err => {
    console.log(err, err.message, err.code) // message: 'The specified key does not exist.',code: 'NoSuchKey'
    if (err.code === 'NoSuchKey') {
      // File not found
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

function cropImage(img, cropRatio) {
  let width = cropRatio.width
  let height = cropRatio.height
  let ratio = 6.4
  return new Promise((resolve, reject) => {
    console.log('cropping image/jpeg');
    gm(img).crop(width * ratio, height * ratio, cropRatio.x * ratio, cropRatio.y * ratio)
      .toBuffer('jpg', (err, imgBuffer) => {
        if (err) {
          return reject(err)
        } else {
          return resolve(imgBuffer)
        }
      })
  })
}