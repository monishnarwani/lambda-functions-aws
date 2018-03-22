const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const gm = require('gm')
  .subClass({ imageMagick: true });
const fs = require('fs');

const S3Utils = require('./S3Utils');

const srcBucket = process.env.SRC_BUCKET;
const destBucket = process.env.DEST_BUCKET;

exports.handler = (event, context, callback) => {

  let imgName = event.Records[0].s3.object.key;
  let eventName = imgName.split('/')[0];
  let watermarkImg = process.env.WATERMARK_IMG;
  let imageDetails = {
    width: 200,
    height: 300,
    offset: 75,
    orientation: 'portrait'
  };
  S3Utils.readFileFromBucket(s3, srcBucket, imgName).then(response => {
    let image = response.Body;
    gm(image).size((err, value) => {

      if (value && (value.width > value.height)) {
        imageDetails.width = 300;
        imageDetails.height = 200;
        imageDetails.offset = 0;
        imageDetails.orientation = 'landscape';
      }
      watermarkImg = eventName + '/' + imageDetails.orientation + watermarkImg;

      createThumbnail(image, imageDetails, watermarkImg).then(thumbnail => {
        S3Utils.writeFileToBucket(s3, destBucket, imgName, thumbnail, 'image/jpeg').then(response => {
          response.objectUrl = 'http://' + destBucket + '.s3.amazonaws.com/' + imgName;
          callback(null, response);
        }).catch(err => {
          console.log(err.message, 'error in writing to dest');
          callback('error in writing to dest.' + err.message);
        });
      }).catch(err => {
        console.log(err.message, 'error in creating thumbnail img');
        callback('error in creating thumbnail img.' + err.message);
      });

    });

  }).catch(err => {
    console.log(err, err.message, err.code); // message: 'The specified key does not exist.',code: 'NoSuchKey'
    if (err.code === 'NoSuchKey') {
      callback('No file found');
    }
    callback(err.message);
  });

};


function createThumbnail(img, imageDetails, watermarkImg) {
  let tempImageName = '/tmp/event.jpg';
  return new Promise((resolve, reject) => {
    let geometry = imageDetails.width + 'x' + imageDetails.height + '+0+' + imageDetails.offset;
    S3Utils.readFileFromBucket(s3, destBucket, watermarkImg).then(response => {
      let image = response.Body;
      fs.writeFile(tempImageName, image, (err) =>  {
        if (err) {
          console.log('error in writing file');
          return reject(err);
        }
      });
      gm(img).resize(imageDetails.width, imageDetails.height, '^')
        .gravity('center')
        .composite(tempImageName)
        .geometry(geometry)
        .toBuffer('jpg', (err, imgBuffer) => {
          if (err) {
            return reject(err);
          } else {
            return resolve(imgBuffer);
          }
        });
    }).catch(err => {
      console.log(err, err.message, err.code); // message: 'The specified key does not exist.',code: 'NoSuchKey'
      if (err.code === 'NoSuchKey') {
        return reject(err.code);
      }
      return reject(err);
    });
  });
}