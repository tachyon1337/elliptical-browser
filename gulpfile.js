
var gulp=require('gulp'),
    fs = require('fs-extra'),
    concat=require('gulp-concat'),
    uglify = require('gulp-uglify'),
    BUILD_JSON=require('./build.json'),
    BUILD_NAME='elliptical.browser.js',
    MIN_NAME='elliptical.browser.min.js',
    REPO_NAME='elliptical browser',
    BOWER='./bower_components',
    BOWER_EC='./bower_components/elliptical-browser',
    BOWER_EC_DIST='./bower_components/elliptical-browser/dist';
    DIST='./dist';


gulp.task('default',function(){
    console.log(REPO_NAME + ' ..."tasks: gulp build|minify|demo"');
});

gulp.task('build',function(){
    concatStream(BUILD_NAME)
        .pipe(gulp.dest(DIST));
});

gulp.task('minify',function(){
    concatStream(MIN_NAME)
        .pipe(uglify())
        .pipe(gulp.dest(DIST));
});

gulp.task('demo',function(){
    fileStream('./elliptical-browser.html',BOWER_EC);
    fileStream('./faker.html',BOWER_EC);
    fileStream('./demo/index.html','./');
    concatStream(BUILD_NAME)
        .pipe(gulp.dest(BOWER_EC_DIST));
});

function srcStream(src){
    if(src===undefined) src=BUILD_JSON;
    return gulp.src(src);
}

function concatStream(name,src){
    if(src===undefined) src=BUILD_JSON;
    return srcStream(src)
        .pipe(concat(name))
}

function fileStream(src,dest){
    gulp.src(src)
        .pipe(gulp.dest(dest));
}

function concatFileStream(src,dest,name){
    gulp.src(src)
        .pipe(concat(name))
        .pipe(gulp.dest(dest));
}

function minFileStream(src,dest,name){
    gulp.src(src)
        .pipe(concat(name))
        .pipe(uglify())
        .pipe(gulp.dest(dest));
}