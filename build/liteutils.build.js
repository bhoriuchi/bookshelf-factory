var liteutils = require('liteutils')
var path = require('path')

var config = {
  dash: {
    minify: false,
    dest: path.resolve(__dirname, '../src/litedash.js'),
    compileDir: path.resolve(__dirname, './litedash'),
    babelrc: false,
    postClean: true,
    include: [
      'forEach',
      'first',
      'get',
      'has',
      'set',
      'merge',
      'intersection',
      'keys',
      'pickBy',
      'includes',
      'union',
      'reduce',
      'isHash',
      'isFunction',
      'isObject'
    ]
  }
}

liteutils(config).then(function () {
  console.log('liteutils build complete')
})
  .catch(console.error)
