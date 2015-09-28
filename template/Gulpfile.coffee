require 'coffee-script/register'

gulp = require 'gulp'
source = require 'vinyl-source-stream'
browserify = require 'browserify'
del = require 'del'
rename = require 'gulp-rename'
coffee = require 'gulp-coffee'

gulp.task 'clean', (cb) ->
    del ['lib/**'], cb

gulp.task 'bundle', ->
    bundler = browserify './scripts/template.coffee',
        transform: ['coffeeify']
        extensions: ['.coffee']
        debug: no
        standalone: 'template'
    bundler.bundle()
    .pipe source 'template.bundle.js'
    .pipe gulp.dest './scripts'

gulp.task 'build', ['bundle']
gulp.task 'default', ['build']
