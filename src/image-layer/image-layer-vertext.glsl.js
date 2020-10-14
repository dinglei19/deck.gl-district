export default `\
attribute vec4 positions;
attribute vec2 uv;

varying float opacity;
varying vec2 vUV;

void main(void) {
    vec4 common_position = project_position(positions);
    vUV = uv;
    gl_Position =  project_common_position_to_clipspace(common_position);
}`;
