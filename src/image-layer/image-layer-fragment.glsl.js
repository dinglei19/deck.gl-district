export default `\
uniform sampler2D texture;
varying vec2 vUV;

void main(void) {
  gl_FragColor = texture2D(texture, vUV.xy);
}
`;
