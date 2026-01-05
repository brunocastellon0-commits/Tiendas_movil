module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Este es el plugin mágico que hace funcionar las animaciones
      'react-native-reanimated/plugin',
    ],
  };
};