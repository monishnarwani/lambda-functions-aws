const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const gm = require('gm')
  .subClass({ imageMagick: true });
const fs = require('fs');
const srcBucket = process.env.SRC_BUCKET;
const destBucket = process.env.DEST_BUCKET;
const S3Utils = require('./S3Utils')

exports.handler = (event, context, callback) => {
  let imgName = event.Records[0].s3.object.key;
  let watermarkImg = 'copyright.png';
  let width = 200;
  let height = 300;
  let offset = 75;
  let orientation = 'portrait';

  S3Utils.readFileFromBucket(s3, srcBucket, imgName).then(response => {
    let img = response.Body
    gm(img).size((err, value) => {
      if (value && (value.width > value.height)) {
        width = 300;
        height = 200;
        offset = 0;
        orientation = 'landscape';
      }
      createThumbnail(img, width, height, offset, orientation, watermarkImg).then(thumbnail => {
        S3Utils.writeFileToBucket(s3, destBucket, imgName, thumbnail, 'image/jpeg').then(response => {
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


function createThumbnail(img, width, height, offset, orientation, watermarkImg) {
  return new Promise((resolve, reject) => {
    let geometry = width + 'x' + height + '+0+' + offset
    S3Utils.readFileFromBucket(s3, srcBucket, watermarkImg).then(response => {
      let image = response.Body
      fs.writeFile('/tmp/event.jpg', image, (err) =>  {
        if (err) console.log('error in writing file')
      })
      gm(img).resize(width, height, '^')
        .gravity('center')
        .composite('/tmp/event.jpg')
        .geometry(geometry)
        .toBuffer('jpg', (err, imgBuffer) => {
          if (err) {
            return reject(err)
          } else {
            return resolve(imgBuffer)
          }
        })
    })
  })
}