const main = `
attribute vec2 vertexPositions;
attribute float vertexValid;

uniform float elevationScale;
uniform float opacity;


varying vec4 vColor;
varying float isValid;
varying vec3 a_pos;

struct PolygonProps {
  vec4 fillColors;
  vec3 positions;
  vec3 nextPositions;
  vec3 pickingColors;
  vec3 positions64Low;
  vec3 nextPositions64Low;
  float elevations;
};

vec3 project_offset_normal(vec3 vector) {
  if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT ||
    project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT_OFFSETS) {
    return normalize(vector * project_uCommonUnitsPerWorldUnit);
  }
  return project_normal(vector);
}
`;

const getVertex = (type) => {
  if (type === 'side') {
    return `\
        #define SHADER_NAME build-layer-vertex-shader-side

        attribute vec3 instancePositions;
        attribute vec3 nextPositions;
        attribute vec3 instancePositions64Low;
        attribute vec3 nextPositions64Low;
        attribute float instanceElevations;
        attribute vec4 instanceFillColors;
        attribute vec3 instancePickingColors;

        uniform vec2 gradient;
        
        ${main}

        void calculatePosition(PolygonProps props) {
          vec3 pos;
          vec3 pos64Low;
          vec3 normal;
          vec4 colors = props.fillColors;
        
          geometry.worldPosition = props.positions;
          geometry.worldPositionAlt = props.nextPositions;
          geometry.pickingColor = props.pickingColors;
        
          pos = mix(props.positions, props.nextPositions, vertexPositions.x);
          pos64Low = mix(props.positions64Low, props.nextPositions64Low, vertexPositions.x);
          isValid = vertexValid;
        
          pos.z += props.elevations * vertexPositions.y * elevationScale;
          normal = vec3(props.positions.y - props.nextPositions.y, props.nextPositions.x - props.positions.x, 0.0);
          normal = project_offset_normal(normal);
          geometry.normal = normal;
          

          gl_Position = project_position_to_clipspace(pos, pos64Low, vec3(0.), geometry.position);
          DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

          float a = gradient.x + (gradient.y - gradient.x ) * vertexPositions.y;
          vec3 lightColor = lighting_getLightColor(colors.rgb, project_uCameraPosition, geometry.position.xyz, normal);
          vColor = vec4(lightColor.rgb, a);

          DECKGL_FILTER_COLOR(vColor, geometry);
        }

        void main(void) {
          PolygonProps props;
        
          props.positions = instancePositions;
          props.positions64Low = instancePositions64Low;
          props.elevations = instanceElevations;
          props.fillColors = instanceFillColors;
          props.pickingColors = instancePickingColors;
          props.nextPositions = nextPositions;
          props.nextPositions64Low = nextPositions64Low;
          
          calculatePosition(props);
        }
      `;
  }
  return `
          #define SHADER_NAME top-polygon-layer-vertex-shader

          attribute vec3 positions;
          attribute vec3 positions64Low;
          attribute float elevations;
          attribute vec4 fillColors;
          attribute vec3 pickingColors;

          uniform vec2 gradient;

          ${main}

          void calculatePosition(PolygonProps props) {
            vec3 pos;
            vec3 pos64Low;
            vec4 colors = props.fillColors;
          
            geometry.worldPosition = props.positions;
            geometry.worldPositionAlt = props.nextPositions;
            geometry.pickingColor = props.pickingColors;
          
            pos = props.positions;
            pos64Low = props.positions64Low;
            isValid = 1.0;
          
            pos.z = props.elevations * elevationScale;

            gl_Position = project_position_to_clipspace(pos, pos64Low, vec3(0.), geometry.position);
            DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

            vec3 lightColor = lighting_getLightColor(colors.rgb, project_uCameraPosition, geometry.position.xyz, vec3(0.0, 0.0, 1.0));
            vColor = vec4(lightColor.rgb, opacity);
            DECKGL_FILTER_COLOR(vColor, geometry);
          }

          void main(void) {
            PolygonProps props;

            props.positions = positions;
            props.positions64Low = positions64Low;
            props.elevations = elevations;
            props.fillColors = fillColors;
            props.pickingColors = pickingColors;

            calculatePosition(props);
          }`;
};

export { getVertex as default };
