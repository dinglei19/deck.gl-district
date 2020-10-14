const getFragment = () => `\
  precision highp float;

  varying vec4 vColor;
  varying float isValid;

  uniform vec3 project_uCameraPosition;

  vec4 aColor;

  void main(void) {
    if (isValid < 0.5) {
      discard;
    }
    gl_FragColor = vColor;

    DECKGL_FILTER_COLOR(gl_FragColor, geometry);
  }`;

export default getFragment;
