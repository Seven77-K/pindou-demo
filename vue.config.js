const path = require("path");
function resolve(dir) {
	return path.join(__dirname, dir);
}
const { defineConfig } = require('@vue/cli-service')

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/'

module.exports = defineConfig({
	publicPath,
	transpileDependencies: true,
	runtimeCompiler: true,
	lintOnSave: false,

	pages: {
		index: {
			entry: 'src/main.js',
			title: '后台管理系统',
		},
	},

	devServer: {
		port: 7077,
		client: {
			overlay: {
				runtimeErrors: (error) => {
					const message = error?.message || String(error || '')
					return !message.includes('ResizeObserver loop')
				},
			},
		},
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:5091',
				changeOrigin: true,
			},
			'/uploads': {
				target: 'http://127.0.0.1:5091',
				changeOrigin: true,
			},
		}
	},

	configureWebpack: {
		output: {
			filename: 'js/[name].[contenthash:8].js',
			chunkFilename: 'js/[name].[contenthash:8].js',
		},
	},

	chainWebpack: config => {
		config.plugins.delete('prefetch')
		config.plugins.delete('preload')

		const CompressionWebpackPlugin = require('compression-webpack-plugin')
		if (process.env.NODE_ENV === 'production') {
			config.plugin('CompressionPlugin').use(
				new CompressionWebpackPlugin({
					filename: '[path][base].gz[query]',
					algorithm: 'gzip',
					test: /\.js$|\.css$/,
					threshold: 10240,
					minRatio: 1,
					deleteOriginalAssets: false
				})
			)
		}

		config.resolve.alias
			.set("@", resolve("src"))
			.set("assets", resolve("src/assets"))
			.set("view", resolve("src/view"))
			.set("components", resolve("src/components"));
	},

	css: {
		loaderOptions: {
			scss: {
				api: "modern"
			}
		}
	},
})
