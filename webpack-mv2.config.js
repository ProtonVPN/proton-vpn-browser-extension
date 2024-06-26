const webpackConfig = require(__dirname + '/webpack.config');

module.exports = (env, argv) => webpackConfig(env, argv, {
	gecko: true,
	mv: 2,
	distribution: 'distribution-mv2'
});
