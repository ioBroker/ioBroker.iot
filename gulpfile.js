
var gulp      = require('gulp');
var fs        = require('fs');
var srcDir    = __dirname + '/';
var pkg       = require('./package.json');
var iopackage = require('./io-package.json');
var version   = (pkg && pkg.version) ? pkg.version : iopackage.common.version;
/*var appName   = getAppName();

function getAppName() {
    var parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1].split('.')[0].toLowerCase();
}
*/
gulp.task('updatePackages', function (done) {
    iopackage.common.version = pkg.version;
    iopackage.common.news = iopackage.common.news || {};
    if (!iopackage.common.news[pkg.version]) {
        var news = iopackage.common.news;
        var newNews = {};

        newNews[pkg.version] = {
            en: 'news',
            de: 'neues',
            ru: 'новое'
        };
        iopackage.common.news = Object.assign(newNews, news);
    }
    fs.writeFileSync('io-package.json', JSON.stringify(iopackage, null, 4));
    done();
});

gulp.task('updateReadme', function (done) {
    var readme = fs.readFileSync('README.md').toString();
    var pos = readme.indexOf('## Changelog\n');
    if (pos !== -1) {
        var readmeStart = readme.substring(0, pos + '## Changelog\n'.length);
        var readmeEnd   = readme.substring(pos + '## Changelog\n'.length);

        if (readme.indexOf(version) === -1) {
            var timestamp = new Date();
            var date = timestamp.getFullYear() + '-' +
                ('0' + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
                ('0' + (timestamp.getDate()).toString(10)).slice(-2);

            var news = '';
            if (iopackage.common.news && iopackage.common.news[pkg.version]) {
                news += '* ' + iopackage.common.news[pkg.version].en;
            }

            fs.writeFileSync('README.md', readmeStart + '### ' + version + ' (' + date + ')\n' + (news ? news + '\n\n' : '\n') + readmeEnd);
        }
    }
    done();
});

gulp.task('default', ['updatePackages', 'updateReadme']);