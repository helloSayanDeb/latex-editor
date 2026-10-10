/**
 * GPU Detection and WebGL2 Accelerated Rendering Pipeline for PDF Viewer
 */

export interface GPUInfo {
  tier: 'webgl2' | 'webgl' | 'cpu';
  renderer: string;
  vendor: string;
  isDedicated: boolean;
  maxTextureSize: number;
}

export function detectGPU(): GPUInfo {
  if (typeof window === 'undefined') {
    return {
      tier: 'cpu',
      renderer: 'Server / Headless',
      vendor: 'Unknown',
      isDedicated: false,
      maxTextureSize: 2048,
    };
  }

  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let tier: 'webgl2' | 'webgl' | 'cpu' = 'cpu';

  try {
    gl = canvas.getContext('webgl2');
    if (gl) {
      tier = 'webgl2';
    } else {
      gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (gl) {
        tier = 'webgl';
      }
    }
  } catch {
    tier = 'cpu';
  }

  if (!gl) {
    return {
      tier: 'cpu',
      renderer: 'Software Fallback',
      vendor: 'Unknown',
      isDedicated: false,
      maxTextureSize: 2048,
    };
  }

  let renderer = 'Generic WebGL';
  let vendor = 'Generic Vendor';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
    vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
  }

  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
  const isDedicated = /NVIDIA|AMD|Radeon|GeForce|RTX|GTX|Apple M\d Max|Apple M\d Pro/i.test(renderer);

  return {
    tier,
    renderer,
    vendor,
    isDedicated,
    maxTextureSize,
  };
}

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
out vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uInvert; // 0.0 = normal, 1.0 = dark paper mode
uniform float uBrightness;
uniform float uContrast;

void main() {
  vec4 color = texture(uTexture, vTexCoord);
  vec3 rgb = color.rgb;

  // Dark paper inversion (white page becomes dark slate, black text becomes crisp white)
  if (uInvert > 0.5) {
    // Luminance-weighted inversion
    rgb = 1.0 - rgb;
    // Tint slightly toward cold slate for eye comfort (#1e212b equivalent)
    rgb = rgb * vec3(0.92, 0.94, 0.98);
  }

  // Adjust contrast & brightness
  rgb = (rgb - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
  fragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}
`;

export class WebGLCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  private uInvertLoc: WebGLUniformLocation | null = null;
  private uBrightnessLoc: WebGLUniformLocation | null = null;
  private uContrastLoc: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: true, desynchronized: true });
    if (this.gl) {
      this.initGL();
    }
  }

  public isAvailable(): boolean {
    return this.gl !== null && this.program !== null;
  }

  private initGL(): void {
    const gl = this.gl;
    if (!gl) return;

    const vShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vShader || !fShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('WebGL2 program link error:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    gl.useProgram(program);

    this.uInvertLoc = gl.getUniformLocation(program, 'uInvert');
    this.uBrightnessLoc = gl.getUniformLocation(program, 'uBrightness');
    this.uContrastLoc = gl.getUniformLocation(program, 'uContrast');

    // Quad geometry: two triangles covering clip space
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // UV coordinates (flip Y for canvas rendering)
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]);
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texLoc = gl.getAttribLocation(program, 'aTexCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  private compileShader(type: number, src: string): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public render(
    sourceCanvas: HTMLCanvasElement | ImageBitmap,
    options: { darkPaper?: boolean; brightness?: number; contrast?: number } = {}
  ): void {
    const gl = this.gl;
    if (!gl || !this.program || !this.texture) return;

    const { darkPaper = false, brightness = 1.0, contrast = 1.0 } = options;

    this.canvas.width = sourceCanvas.width;
    this.canvas.height = sourceCanvas.height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.useProgram(this.program);
    gl.uniform1f(this.uInvertLoc, darkPaper ? 1.0 : 0.0);
    gl.uniform1f(this.uBrightnessLoc, brightness);
    gl.uniform1f(this.uContrastLoc, contrast);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
    if (this.program) gl.deleteProgram(this.program);
  }
}
