const gm = require('gm')
  .subClass({ imageMagick: true });

gm('copy.png').toBuffer('png', function (err, val) {
  if (!err) {
    // console.log(val, 'success')
    gm(val).resize(200, 300, '^').composite('./copy1.png').font('digital-7.ttf', 40).drawText(400, 300, '10:14:58').write('./bufferImg.png', function (err, value) {
      if (!err) {
        console.log('success', value)
      } else {
        console.log(err)
      }
    })
  }
})