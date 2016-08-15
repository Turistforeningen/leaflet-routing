var gulp = require('gulp');
var concat = require('gulp-concat');

gulp.task('default', function() {
  return gulp.src(['src/L.Routing.js', './src/**/*.js'])
    .pipe(concat('leaflet.routing.js'))
    .pipe(gulp.dest('./dist/'));
});
