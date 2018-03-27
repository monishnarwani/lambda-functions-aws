const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const gm = require('gm')
  .subClass({ imageMagick: true });
const S3Utils = require('./S3Utils');

const srcBucket = process.env.SRC_BUCKET;
const destBucket = process.env.DEST_BUCKET;

exports.handler = (event, context, callback) => {

  console.log(event);

  let imgName = event.imgName;
  let cropRatio = event.cropRatio;
  let productType = event.productType;
  let laptime = event.laptime;
  let addLaptime = false;
  let raceType = event.raceType
  if (productType === 'All' || productType === 'Single') {
    addLaptime = false
  } else if (productType === 'All with laptime' || productType === 'Single with laptime' ) {
    addLaptime = true
  }

  S3Utils.readFileFromBucket(s3, srcBucket, imgName).then(response => {
    let img = response.Body
    if (event.cropRatio && event.cropRatio.width) {
      if (!addLaptime) {
        cropImage(img, cropRatio).then(croppedImg => {
          writeImageToBucket(imgName, croppedImg).then(response => {
            callback(null, response)
          }).catch(err => {
            callback(err)
          })
        }).catch(err => {
          console.log(err.message, 'error in cropping img')
          callback('error in cropping img')
        })
      } else {
        cropImageWithLap(img, cropRatio, laptime, raceType).then(croppedImg => {
          writeImageToBucket(imgName, croppedImg).then(response => {
            callback(null, response)
          }).catch(err => {
            callback(err)
          })
        }).catch(err => {
          console.log(err.message, 'error in cropping img')
          callback('error in cropping img')
        })
      }
    } else if (addLaptime) {
      addLaptimeToImage(img, laptime, raceType).then(croppedImg => {
        writeImageToBucket(imgName, croppedImg).then(response => {
          callback(null, response)
        }).catch(err => {
          callback(err)
        })
      }).catch(err => {
        console.log(err.message, 'error in cropping img')
        callback('error in cropping img')
      })
    } else {
      writeImageToBucket(imgName, img).then(response => {
        callback(null, response)
      }).catch(err => {
        callback(err)
      })
    }
  }).catch(err => {
    console.log(err, err.message, err.code) // message: 'The specified key does not exist.',code: 'NoSuchKey'
    if (err.code === 'NoSuchKey') {
      // File not found
      callback('No file found')
    }
  })
};

function cropImage(img, cropRatio) {
  let width = cropRatio.width
  let height = cropRatio.height
  let ratio = 6.4;

  return new Promise((resolve, reject) => {
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

function cropImageWithLap(img, cropRatio, laptime, raceType) {
  let width = cropRatio.width
  let height = cropRatio.height
  let ratio = 6.4

  return new Promise((resolve, reject) => {
    console.log('cropping with lap image/jpeg');
    gm(img).crop(width * ratio, height * ratio, cropRatio.x * ratio, cropRatio.y * ratio)
      .fill('red').font('digital-7.ttf', 60).drawText((width * ratio) + (cropRatio.x * ratio) - 200, (height * ratio) + (cropRatio.y * ratio) - 30 , laptime)
      .drawText((width * ratio) + (cropRatio.x * ratio) - 400, (height * ratio) + (cropRatio.y * ratio) - 80 , raceType)
      .toBuffer('jpg', (err, imgBuffer) => {
        if (err) {
          return reject(err)
        } else {
          return resolve(imgBuffer)
        }
      })
  })
}

function addLaptimeToImage(img, laptime, raceType) {
  let width = 0;
  let height = 0;
  let ratio = 6.4;
  return new Promise((resolve, reject) => {
    gm(img).size((err, val) => {
      if (!err) {
        width = val.width
        height = val.height
      }
      gm(img)
        .fill('red').font('digital-7.ttf', 60).drawText((width) - 300, (height) - 20 , laptime).drawText((width - 400), (height - 70), raceType)
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

function writeImageToBucket (imgName, croppedImg, callback) {
  return new Promise((resolve, reject) => {
    S3Utils.writeFileToBucket(s3, destBucket, 'cropped_' + imgName, croppedImg, 'image/jpeg').then(response => {
      response.objectUrl = 'http://' + destBucket + '.s3.amazonaws.com/' + 'cropped_' + imgName
      resolve(response)
    }).catch(err => {
      reject(err)
    })
  })
}