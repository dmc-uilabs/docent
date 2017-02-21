// Gulp Dependencies
var gulp = require('gulp');
var rename = require('gulp-rename');

// Build Dependencies
var browserify = require('gulp-browserify');
var uglify = require('gulp-uglify');

// Style Dependencies
var less = require('gulp-less');
var prefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');

// Development Dependencies
var jshint = require('gulp-jshint');

// Test Dependencies
var mochaPhantomjs = require('gulp-mocha-phantomjs');



// Lint

gulp.task('lint-client', function() {
  return gulp.src('./app/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('lint-test', function() {
  return gulp.src('./test/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});



// Browserify
gulp.task('browserify-client', ['lint-client'], function() {
  return gulp.src('app/app.js')
    .pipe(browserify({
      insertGlobals: true
    }))
    .pipe(rename('build-app.js'))
    .pipe(gulp.dest('build'))
    .pipe(gulp.dest('public/javascripts'));
});

gulp.task('browserify-test', ['lint-test'], function() {
  return gulp.src('test/client/index.js')
    .pipe(browserify({
      insertGlobals: true
    }))
    .pipe(rename('client-test.js'))
    .pipe(gulp.dest('build'));
});



// Styles

gulp.task('styles', function() {
  return gulp.src('css/app.css')
    .pipe(less())
    .pipe(prefix({ cascade: true }))
    .pipe(rename('mra.css'))
    .pipe(gulp.dest('build'))
    .pipe(gulp.dest('public/stylesheets'));
});



// Build

gulp.task('minify', ['styles'], function() {
  return gulp.src('build/mra.css')
    .pipe(minifyCSS())
    .pipe(rename('mra.min.css'))
    .pipe(gulp.dest('public/stylesheets'));
});

gulp.task('uglify', ['browserify-client'], function() {
  return gulp.src('build/mra.js')
    .pipe(uglify())
    .pipe(rename('mra.min.js'))
    .pipe(gulp.dest('public/javascripts'));
});



// Test

gulp.task('test', ['lint-test', 'browserify-test'], function() {
  return gulp.src('test/client/index.html')
    .pipe(mochaPhantomjs());
});

gulp.task('watch', function() {
  gulp.watch('client/**/*.js', ['browserify-client', 'test']);
  gulp.watch('test/client/**/*.js', ['test']);
  gulp.watch('client/**/*.less', ['styles']);
});



// Tasks

gulp.task('build', ['uglify', 'minify']);
gulp.task('default', ['test', 'build', 'watch']);
