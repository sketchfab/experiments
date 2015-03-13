var browserify = require('browserify');
var stringify = require('stringify');
var source = require('vinyl-source-stream');
var pkg = require('./package.json');

var gulp = require('gulp');
var minifyCSS = require('gulp-minify-css');
var prefix = require('gulp-autoprefixer');

gulp.task('browserify', function() {
    return browserify(['./src/js/app.js'], {
            'debug': false,
        })
        .transform(stringify(['.tpl']))
        .bundle()
        .pipe(source('js/app.js' ))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('style', function() {
    gulp.src('./src/style/*.css')
        .pipe(minifyCSS({
            keepBreaks: true
        }))
        .pipe(prefix({ cascade: true }))
        .pipe(gulp.dest('./dist/style/'))
});

gulp.task('copy', function(){
    gulp.src('src/index.html')
        .pipe(gulp.dest('./dist/'));
    gulp.src('src/style/app.css')
        .pipe(gulp.dest('./dist/style/'));
    gulp.src('src/js/vendors/**')
        .pipe(gulp.dest('./dist/js/vendors'));
    gulp.src('src/assets/**')
        .pipe(gulp.dest('./dist/assets'));
});

gulp.task('watch', function(){
    gulp.watch('src/**', ['build']);
    gulp.watch('css/**', ['minify-css']);
});

gulp.task('build', [ 'copy', 'style', 'browserify']);

gulp.task('default', ['build']);
