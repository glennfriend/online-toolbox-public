import { registerCheck } from '../registry.js';
import { hash, row, unsupported } from '../util.js';
registerCheck({ id: 'webgl', group: '指紋', title: 'WebGL 與參數指紋', async run() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return [unsupported('WebGL', '瀏覽器停用或未提供 WebGL')];
  try {
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const fields = ['VERSION', 'SHADING_LANGUAGE_VERSION', 'VENDOR', 'RENDERER', 'MAX_TEXTURE_SIZE', 'MAX_CUBE_MAP_TEXTURE_SIZE', 'MAX_RENDERBUFFER_SIZE', 'MAX_VERTEX_ATTRIBS', 'MAX_VERTEX_UNIFORM_VECTORS', 'MAX_FRAGMENT_UNIFORM_VECTORS', 'MAX_VARYING_VECTORS', 'MAX_COMBINED_TEXTURE_IMAGE_UNITS', 'MAX_VIEWPORT_DIMS', 'ALIASED_LINE_WIDTH_RANGE', 'ALIASED_POINT_SIZE_RANGE'];
    const parameters = Object.fromEntries(fields.map(key => { const value = gl.getParameter(gl[key]); return [key, ArrayBuffer.isView(value) ? Array.from(value) : value]; }));
    parameters.extensions = (gl.getSupportedExtensions() || []).sort();
    return [row('WebGL vendor / renderer', `${parameters.VENDOR}\n${parameters.RENDERER}`), debug ? row('WebGL unmasked vendor / renderer', `${gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)}\n${gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)}`) : unsupported('WebGL unmasked', '瀏覽器未提供 WEBGL_debug_renderer_info'), row('WebGL 參數 SHA-256', await hash(parameters), `依 WebGL 1 參數與擴充清單計算\n${JSON.stringify(parameters, null, 2)}`)];
  } finally { gl.getExtension('WEBGL_lose_context')?.loseContext(); }
} });
