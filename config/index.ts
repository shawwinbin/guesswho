// config/index.ts
const config = {
  projectName: 'history-figure-guess',
  date: '2026-4-20',
  designWidth: 750,
  framework: 'react',
  compiler: { type: 'webpack5', prebundle: { enable: false } },
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src-taro',
  outputRoot: 'dist-taro',
  plugins: ['@tarojs/plugin-framework-react'],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    prebundle: { enable: false },
    postcss: {
      autoprefixer: {
        enable: true,
        config: {}
      },
      pxtransform: {
        enable: true,
        config: {}
      }
    }
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}