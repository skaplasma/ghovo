// Los iconos de @expo/vector-icons cargan una fuente por require(): el registro de
// assets de Jest no resuelve esos binarios, así que en pruebas se sustituyen por Text.
const React = require('react');
const { Text } = require('react-native');

function createIcon(name) {
  const Icon = ({ name: glyph, size, color, ...rest }) =>
    React.createElement(Text, { ...rest, style: { fontSize: size, color } }, String(glyph ?? name));
  Icon.displayName = name;
  return Icon;
}

module.exports = {
  __esModule: true,
  Ionicons: createIcon('Ionicons'),
  MaterialIcons: createIcon('MaterialIcons'),
  MaterialCommunityIcons: createIcon('MaterialCommunityIcons'),
  Feather: createIcon('Feather'),
  AntDesign: createIcon('AntDesign'),
  FontAwesome: createIcon('FontAwesome'),
};
