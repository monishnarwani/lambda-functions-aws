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
  let productType = event.productType;
  let laptime = event.laptime;
  let addLaptime = false;
  if (productType === 'All' || productType === 'Single') {
    addLaptime = false
  } else if (productType === 'All with laptime' || productType === 'Single with laptime' ) {
    addLaptime = true
  }
  console.log(cropRatio);

  readFileFromBucket(srcBucket, imgName).then(response => {
    console.log('file found') // content of file
    let img = response.Body
    if (event.cropRatio && event.cropRatio.width) {
      if (!addLaptime) {
        cropImage(img, cropRatio).then(croppedImg => {
          writeImageToBucket(imgName, croppedImg, callback)
        }).catch(err => {
          console.log(err.message, 'error in cropping img')
          callback('error in cropping img')
        })
      } else {
        cropImageWithLap(img, cropRatio, laptime).then(croppedImg => {
          writeImageToBucket(imgName, croppedImg, callback)
        }).catch(err => {
          console.log(err.message, 'error in cropping img')
          callback('error in cropping img')
        })
      }
    } else if (addLaptime) {
      addLaptimeToImage(img, laptime).then(croppedImg => {
        console.log('addlimet to imagesa')
        writeImageToBucket(imgName, croppedImg, callback)
      }).catch(err => {
        console.log(err.message, 'error in cropping img')
        callback('error in cropping img')
      })
    } else {
      writeImageToBucket(imgName, img, callback)
    }

  }).catch(err => {
    console.log(err, err.message, err.code) // message: 'The specified key does not exist.',code: 'NoSuchKey'
    if (err.code === 'NoSuchKey') {
      // File not found
      callback('No file found')
    }
  })
};

function readFileFromBucket (bucketName, fileName) {
  console.log('readFileFromBucket')
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
  console.log('writeFileToBucket')
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
  console.log('cropImage')
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

function cropImageWithLap(img, cropRatio, laptime) {
  console.log('cropImageWithLap')
  let width = cropRatio.width
  let height = cropRatio.height
  let ratio = 6.4

  return new Promise((resolve, reject) => {
    console.log('cropping with lap image/jpeg');
    gm(img).crop(width * ratio, height * ratio, cropRatio.x * ratio, cropRatio.y * ratio)
      .fill('red').font('digital-7.ttf', 60).drawText((width * ratio) + (cropRatio.x * ratio) - 200, (height * ratio) + (cropRatio.y * ratio) - 30 , laptime)
      .toBuffer('jpg', (err, imgBuffer) => {
        if (err) {
          return reject(err)
        } else {
          return resolve(imgBuffer)
        }
      })
  })
}

function addLaptimeToImage(img, laptime) {
  console.log('in adding laptime to image')
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
        .fill('red').font('digital-7.ttf', 60).drawText((width) - 200, (height) - 20 , laptime)
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
  console.log('writeImageToBucket')
  writeFileToBucket(destBucket, 'cropped_' + imgName, croppedImg, 'image/jpeg').then(response => {
    console.log('Hurah!! success')
    response.objectUrl = 'http://' + destBucket + '.s3.amazonaws.com/' + 'cropped_' + imgName
    callback(null, response)
  }).catch(err => {
    console.log(err.message, 'error in writing to dest')
    callback('error in writing to dest')
  })
}