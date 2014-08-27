/*jshint node:true*/
module.exports = function (grunt) {
	require('load-grunt-tasks')(grunt, [ 'grunt-*', 'intern-geezer' ]);
	var path = require('path');

	var stripComments = /<\!--.*?-->/g,
		collapseWhiteSpace = /\s+/g;

	grunt.initConfig({
		dojo: {
			dist: {
				options: {
					dojo: path.join('src', 'dojo', 'dojo.js'),
					dojoConfig: path.join('src', 'dojoConfig.js'),
					profile: path.join('profiles', 'dojo-playground.profile.js'),
					releaseDir: path.join('..', 'dist'),
					basePath: path.join(__dirname, 'src')
				}
			}
		},
		copy: {
			config: {
				options: {
					processContent: function (content) {
						return content.replace(/isDebug:\s+(true|1),?\s+/, '');
					}
				},
				files: [{
					src: path.join('src', 'dojoConfig.js'),
					dest: path.join('dist', 'dojoConfig.js')
				}]
			},
			index: {
				options: {
					processContent: function (content) {
						return content
							.replace(stripComments, '')
							.replace(collapseWhiteSpace, ' ')
						;
					}
				},
				files: [{
					src: path.join('src', 'index.html'),
					dest: path.join('dist', 'index.html')
				}]
			}
		},
		connect: {
			options: {
				port: 8888,
				hostname: 'localhost'
			},
			test: {
				options: {
					base: 'src'
				}
			},
			dist: {
				options: {
					base: 'dist'
				}
			}
		},
		clean: {
			dist: {
				files: [{
					dot: true,
					src: [
						'dist'
					]
				}]
			}
		},
		stylus: {
			compile: {
				options: {
					compress: false,
					'import': [ 'nib' ]
				},
				files: {
					'src/dojo-playground/resources/main.css': 'src/dojo-playground/resources/main.styl'
				}
			}
		},
		watch: {
			stylus: {
				files: 'src/dojo-playground/resources/**/*.styl',
				tasks: [ 'stylus:compile' ]
			}
		},
		intern: {
			local: {
				options: {
					runType: 'client',
					config: 'src/dojo-playground/tests/intern'
				}
			},
			remote: {
				options: {
					runType: 'runner',
					config: 'src/dojo-playground/tests/intern'
				}
			}
		}
	});

	grunt.registerTask('default', [ 'stylus:compile', 'watch:stylus' ]);
	grunt.registerTask('server', function (target) {
		if (target === 'dist') {
			return grunt.task.run([
				'build',
				'connect:dist:keepalive'
			]);
		}

		grunt.task.run([
			'stylus:compile',
			'connect:test',
			'watch:stylus'
		]);
	});
	grunt.registerTask('build', [ 'stylus:compile', 'clean', 'dojo:dist', 'copy' ]);
};
