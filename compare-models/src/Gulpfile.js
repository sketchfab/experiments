var pkg = require('./package.json');

var browserify = require('browserify');
var gulp = require('gulp');
var prefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');
var rename = require('gulp-rename');
var template = require('gulp-template');
var stringify = require('stringify');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');

gulp.task('browserify', function() {
    return browserify(['./src/js/app.js'], {
            'debug': false,
        })
        .transform(stringify(['.tpl']))
        .bundle()
        .pipe(source('js/app.js'))
        .pipe(rename("app." + pkg.version + ".js"))
        // .pipe(streamify(uglify()))
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('style', function() {
    gulp.src('./src/style/*.css')
        .pipe(minifyCSS({
            keepBreaks: true
        }))
        .pipe(prefix({
            cascade: true
        }))
        .pipe(rename("app." + pkg.version + ".css"))
        .pipe(gulp.dest('./dist/style/'))
});

gulp.task('copy', function() {
    gulp.src('src/assets/**')
        .pipe(gulp.dest('./dist/assets'));
    gulp.src('src/js/vendors/**')
        .pipe(gulp.dest('./dist/js/vendors'));
});

gulp.task('html', function() {
    return gulp.src('src/index.html')
        .pipe(template({
            version: pkg.version
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
    gulp.watch('src/**', ['build']);
    gulp.watch('css/**', ['minify-css']);
});

gulp.task('build', ['copy', 'html', 'style', 'browserify']);

gulp.task('default', ['build']);
