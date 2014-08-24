var gulp=require('gulp'),
    gulputil=require('gulp-util'),
    path=require('path'),
    fs = require('fs-extra'),
    concat=require('gulp-concat'),
    uglify = require('gulp-uglify'),
    merge = require('merge-stream'),
    build=require('./build.json'),
    release=require('./build/dist.json'),
    src='./src',
    dist='./dist';




gulp.task('default',function(){
    console.log('elliptical-browser build..."tasks: gulp build|minify"');
});

gulp.task('build',function(){

    var build_=srcStream()
        .pipe(concat('elliptical-browser.js'))
        .pipe(gulp.dest(src));

    var release_=releaseStream()
        .pipe(concat('elliptical-browser.js'))
        .pipe(gulp.dest(dist));

    return merge(build_, release_);

});

gulp.task('minify',function(){

    var build_=srcStream()
        .pipe(concat('elliptical-browser.js'))
        .pipe(gulp.dest(src));

    var minify_=releaseStream()
        .pipe(concat('elliptical-browser.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(dist));

    return merge(build_, minify_);
});

function srcStream(){
    return gulp.src(build);
}

function releaseStream(){
    return gulp.src(release);
}
