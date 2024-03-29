'use strict';

const gulp = require('gulp');
const pug = require('gulp-pug');
const sass = require ('gulp-sass');
const cleanCSS = require('gulp-clean-css');
const terser = require('gulp-terser');
const imagemin = require('gulp-imagemin');

const srcPaths = {
  sass: {
    src: './src/sass',
    dist: './dist/css'
  },
  views: {
    src: './src/views',
    dist: './dist/views',
  },
  js: {
    src: './src/js',
    dist: './dist/js',
  }
}

gulp.task('styles', function() {
  return gulp.src(srcPaths.sass.src + '/*.scss')
  .pipe(sass())
  .pipe(cleanCSS({compatibility: 'ie8'}))
  .pipe(gulp.dest(srcPaths.sass.dist))
});

gulp.task('scripts', function () {
  return gulp.src(srcPaths.js.src + '/**/*.js')
  .pipe(terser())
  .pipe(gulp.dest(srcPaths.js.dist))
});

gulp.task('views', function buildHTML() {
  return gulp.src(srcPaths.views.src + '/*.pug')
  .pipe(pug({
    pretty: true
  }))
  .pipe(gulp.dest(srcPaths.views.dist))
});

gulp.task('watch', function watch() {
  gulp.watch(srcPaths.views.src + '/**/*.pug', gulp.series('views'))

  gulp.watch(srcPaths.sass.src + '/**/*.scss', gulp.series('styles'))
  gulp.watch(srcPaths.js.src +'/**/*.js', gulp.series('scripts'))
});

  // Gulp task to minify JavaScript files
gulp.task('images', function() {
return gulp.src('./app/' + current_project + '/src/img/*')
  // Minify the file
  .pipe(imagemin())
  // Output
  .pipe(gulp.dest('./app/' + current_project + '/static/img'))
});

gulp.task('default', gulp.series('views', 'styles', 'scripts', 'watch'));