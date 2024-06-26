const webpackConfig = require(__dirname + '/webpack.config');

module.exports = (env, argv) => webpackConfig(env, argv, {
	gecko: true,
	distribution: 'distribution-ff'
});
