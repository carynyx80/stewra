"use client";

import { useEffect, useRef } from "react";

/**
 * Full-viewport WebGL "liquid" surface: slow domain-warped flow with lime caustic
 * highlights that bend toward the cursor and ripple where you click. It is an
 * abstract fluid, not a water simulation. Falls back to a static gradient when
 * WebGL or motion is unavailable.
 */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const FRAG = (octaves: number) => `
precision mediump float;
#define OCTAVES ${octaves}
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntensity;
uniform vec4 uRipples[6]; // xy = position (0..1), z = start time, w = strength

float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0., a = .5;
  mat2 r = mat2(.8,.6,-.6,.8);
  for(int i=0;i<OCTAVES;i++){ v += a*noise(p); p = r*p*2.02; a *= .5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = (gl_FragCoord.xy - .5*uRes.xy) / uRes.y;
  vec2 m = (uMouse - .5) * vec2(uRes.x/uRes.y, 1.);
  float t = uTime * .045;

  // cursor lens: the surface swells gently around the pointer
  float md = length(p - m);
  p += (p - m) * .12 * exp(-md*md*7.);

  // click ripples: travelling rings that displace the surface
  for(int i=0;i<6;i++){
    vec4 r = uRipples[i];
    if(r.w <= 0.) continue;
    float age = uTime - r.z;
    if(age < 0. || age > 3.) continue;
    vec2 rp = (r.xy - .5) * vec2(uRes.x/uRes.y, 1.);
    float d = length(p - rp);
    float ring = sin((d - age*.35) * 38.) * exp(-abs(d - age*.35)*14.) * exp(-age*1.3);
    p += normalize(p - rp + 1e-4) * ring * .018 * r.w;
  }

  vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 + vec2(5.2,1.3) - t));
  vec2 r = vec2(fbm(p*1.9 + 3.*q + vec2(1.7,9.2) + t*1.3), fbm(p*1.9 + 3.*q + vec2(8.3,2.8) - t));
  float f = fbm(p*1.4 + 2.6*r);

  // caustic-like bright filaments where the flow folds
  float fil = pow(1. - abs(sin(f*8. + t*3.)), 10.) * smoothstep(.3, .8, f);
  // glossy sheen: light catching the crest of each fold
  float crest = smoothstep(.55, .95, f) * (.5 + .5*sin(r.x*6.2 + t*2.));

  vec3 base = vec3(.027,.031,.024);
  vec3 deep = vec3(.075,.11,.035);
  vec3 lime = vec3(.71,.85,.2);
  vec3 col = mix(base, deep, smoothstep(.15, .85, f));
  col += lime * crest * .10;
  col += lime * fil * .75;
  col += lime * .09 * exp(-md*md*4.);

  // vignette keeps text areas calm
  float vig = smoothstep(1.35, .2, length(uv - vec2(.5,.45)) * 1.3);
  col = mix(base, col, vig * uIntensity);
  gl_FragColor = vec4(col, 1.);
}`;

export function LiquidCanvas({ intensity = 1, className = "" }: { intensity?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // phones and low-power devices: fewer noise octaves, lower resolution, 30 fps
    const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    const renderScale = lowPower ? 0.38 : 0.6;
    const frameInterval = lowPower ? 1000 / 30 : 0;
    let lastFrame = 0;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG(lowPower ? 3 : 5)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uIntensity = gl.getUniformLocation(prog, "uIntensity");
    const uRipples = gl.getUniformLocation(prog, "uRipples");

    const mouse = { x: 0.5, y: 0.55, tx: 0.5, ty: 0.55 };
    const ripples = new Float32Array(24);
    let rippleIdx = 0;
    const start = performance.now();
    let raf = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(canvas.clientWidth * dpr * renderScale);
      canvas.height = Math.floor(canvas.clientHeight * dpr * renderScale);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    };
    const onDown = (e: PointerEvent) => {
      const i = (rippleIdx++ % 6) * 4;
      ripples[i] = e.clientX / window.innerWidth;
      ripples[i + 1] = 1 - e.clientY / window.innerHeight;
      ripples[i + 2] = (performance.now() - start) / 1000;
      ripples[i + 3] = 1;
    };
    const onVis = () => (visible = document.visibilityState === "visible");

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const now = performance.now();
      if (frameInterval && now - lastFrame < frameInterval) return;
      lastFrame = now;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 12 : (performance.now() - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uIntensity, intensity);
      gl.uniform4fv(uRipples, ripples);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduced) cancelAnimationFrame(raf);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intensity]);

  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(140,180,30,0.10),transparent_60%)]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
