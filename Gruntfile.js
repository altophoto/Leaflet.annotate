module.exports = function(grunt) {

    // Project configuration.

    var bannerString = '/**' + grunt.util.linefeed + '    This is <%= pkg.name %>-<%= pkg.version %>' + grunt.util.linefeed
        + '    Author: <%= pkg.author %> ' + grunt.util.linefeed
        + '    Project Page: <%= pkg.homepage %> ' + grunt.util.linefeed
     + '    API Documentation:, https://github.com/mukil/Leaflet.annotate#readme **/'+ grunt.util.linefeed + grunt.util.linefeed

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            js_en_US: {
                files: {
                    'dist/Leaflet.annotate.Microdata-<%= pkg.version %>_en_US.js': [
                        'Leaflet.annotate.Microdata.js',
                        'Leaflet.annotate.types.en_US.js'
                    ]
                }
            },
            js_de_DE: {
                files: {
                    'dist/Leaflet.annotate.Microdata-<%= pkg.version %>_de_DE.js': [
                        'Leaflet.annotate.Microdata.js',
                        'Leaflet.annotate.types.de_DE.js'
                    ]
                }
            },
            js_annotate_Viewer: {
                files: {
                    'dist/Leaflet.annotate.Viewer-<%= pkg.version %>.js': [
                        'Leaflet.annotate.Viewer.js'
                    ]
                }
            }
        },
        uglify: {
            js_en_US: {
                options: {
                    banner: bannerString
                },
                files: {
                    'dist/Leaflet.annotate.Microdata-<%= pkg.version %>_en_US.min.js': [
                        'dist/Leaflet.annotate.Microdata-<%= pkg.version %>_en_US.js'
                    ]
                }
            },
            js_de_DE: {
                options: {
                    banner: bannerString
                },
                files: {
                    'dist/Leaflet.annotate.Microdata-<%= pkg.version %>_de_DE.min.js': [
                        'dist/Leaflet.annotate.Microdata-<%= pkg.version %>_de_DE.js'
                    ]
                }
            },
            js_viewer: {
                options: {
                    banner: bannerString
                },
                files: {
                    'dist/Leaflet.annotate.Viewer-<%= pkg.version %>.min.js': [
                        'dist/Leaflet.annotate.Viewer-<%= pkg.version %>.js'
                    ]
                }
            }
        },
        copy: {
            paris_example_Microdata: {
                src: 'dist/Leaflet.annotate.Microdata-<%= pkg.version %>_en_US.min.js',
                dest: 'docs/example/Leaflet.annotate.Microdata-<%= pkg.version %>_en_US.min.js'
            },
            paris_example_Viewer: {
                src: 'dist/Leaflet.annotate.Viewer-<%= pkg.version %>.min.js',
                dest: 'docs/example/Leaflet.annotate.Viewer-<%= pkg.version %>.min.js'
            },
            paris_example_viewerCSS: {
                src: 'css/viewer-style.css',
                dest: 'docs/example/paris/css/viewer-style.css'
            },
            paris_example_viewerIcon: {
                src: 'css/readerView-Icon-decentblue-transparent.png',
                dest: 'docs/example/paris/css/readerView-Icon-decentblue-transparent.png'
            },
            dist_viewerIcon: {
                src: 'css/readerView-Icon-decentblue-transparent.png',
                dest: 'dist/css/readerView-Icon-decentblue-transparent.png'
            },
            dist_viewerCSS: {
                src: 'css/viewer-style.css',
                dest: 'dist/css/viewer-style.css'
            },
            dist_readme: {
                src: 'README.md',
                dest: 'dist/README.md'
            },
            dist_license: {
                src: 'LICENSE',
                dest: 'dist/LICENSE'
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-uglify')
    grunt.loadNpmTasks('grunt-contrib-concat')
    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.registerTask('default', ['concat', 'uglify', 'copy'])

}
