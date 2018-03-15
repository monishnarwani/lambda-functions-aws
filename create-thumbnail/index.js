const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const gm = require('gm')
  .subClass({ imageMagick: true });

const srcBucket = process.env.SRC_BUCKET;
const destBucket = process.env.DEST_BUCKET;

exports.handler = (event, context, callback) => {
  let imgName = event.Records[0].s3.object.key;
  let eventLogo = 'https://s3.ap-south-1.amazonaws.com/resume.narwanimonish.co/copyright.png'
  let watermarkImg = eventLogo;
  // let watermarkImg = './copy1.png';
  let width = 200;
  let height = 300;
  let offset = 75;
  let orientation = 'portrait';

  readFileFromBucket(srcBucket, imgName).then(response => {
    let img = response.Body

    gm(img).size((err, value) => {
      if (value && (value.width > value.height)) {
        width = 300;
        height = 200;
        offset = 0;
        orientation = 'landscape';
      }
      createThumbnail(img, width, height, offset, orientation, watermarkImg).then(thumbnail => {
        writeFileToBucket(destBucket, imgName, thumbnail, 'image/jpeg').then(response => {
          response.objectUrl = 'http://' + destBucket + '.s3.amazonaws.com/' + imgName
          callback(null, response)
        }).catch(err => {
          console.log(err.message, 'error in writing to dest')
          callback('error in writing to dest')
        })
      }).catch(err => {
        console.log(err.message, 'error in creating thumbnail img')
        callback('error in creating thumbnail img')
      });
    })

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

function createThumbnail(img, width, height, offset, orientation, watermarkImg) {

  console.log(watermarkImg)


  return new Promise((resolve, reject) => {
    console.log('creating thumbnail image/jpeg');
    let geometry = width + 'x' + height + '+0+' + offset
    console.log(geometry)
    gm(img).resize(width, height, '^')
      .gravity('center')
      .composite(watermarkImg)
      .geometry(geometry)
      .toBuffer('jpg', (err, imgBuffer) => {
        if (err) {
          return reject(err)
        } else {
          return resolve(imgBuffer)
        }
      })
  })
}