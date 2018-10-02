// scales a clip coordinate (transformed by projection) into 
// NDC coordinates (vec3). Normally only x and y are used.
function ndc(out, v) {
  vec3.copy(out, v);
  return vec3.scale(out, out, 1.0 / v[3]);
}

function extend(v) {
  return vec4.fromValues(v[0], v[1], v[2], 1);
}

// Projects a vec4 using a mat4 and then scales to ndc
function project(out, v, M) {
  const clip = vec4.transformMat4(vec4.create(), v, M);
  return ndc(out, clip);
}

// Projects a 3D line to a 2D line
function project_line(line, M) {
  var p = vec3.create();
  project(p, extend(line.p), M);
  
  // TODO: How to transform u directly?
  var line_p1 = vec3.add(vec3.create(), line.p, line.u);
  var p1 = vec3.create();
  project(p1, extend(line_p1), M);

  return {
    p: p,
    u: vec3.subtract(vec3.create(), p1, p)
  };
}

function plane_plane_intersection(p1, p2) {
  const normal1 = vec3.clone(p1);
  const d1 = p1[3];
  const normal2 = vec3.clone(p2);
  const d2 = p2[3];
  // Find the normal of the plane - u
  const u = vec3.cross(vec3.create(), p1, p2);

  // Find a point on the line
  var p = 
    vec3.cross(vec3.create(),
      vec3.subtract(vec3.create(),
        vec3.scale(vec3.create(), normal1, d2),
        vec3.scale(vec3.create(), normal2, d1)),
      u);
  p = vec3.scale(vec3.create(), p, vec3.squaredLength(u));
  return {
    p: p,
    u: u,
  };
}

// Axis aligned line line intersection, e.g. x=-1
function aax_line_line(line, x) {
  const px = line.p[0], py = line.p[1];
  const ux = line.u[0], uy = line.u[1];
  return vec2.fromValues(x, py + uy * (x - px) / ux);
}

// Axis aligned line line intersection, e.g. y=-1
function aay_line_line(line, x) {
  const px = line.p[0], py = line.p[1];
  const ux = line.u[0], uy = line.u[1];
  return vec2.fromValues(px + ux * (y - py) / uy, y);
}

function clip_to_ndc(line) {
  const left = aax_line_line(line, -1);
  const right = aax_line_line(line, 1);
  return {p0: left, p1: right};
}

function transform_plane(out, plane, M) {
  var tmp = mat4.create();
  mat4.invert(tmp, M);
  mat4.transpose(tmp, tmp);
  vec4.transformMat4(out, plane, tmp);
  return out;
}

// camera - camera matrix
// scene - plane (e.g. y = 0) and height map function f(u, v)
function render(canvas, camera, scene) {
  const ctx = canvas.getContext("2d");
  ctx.transform(canvas.width/2, 0, 0, canvas.height/2, canvas.width/2, canvas.height/2);

  for (var z = -4; z < 0; z += 0.25) {
    console.log(z);
    // Construct plane parallel to camera
    var z_plane = vec4.fromValues(0, 0, 1, z);

    // Intersect scene plane and z plane
    const plane = transform_plane(vec4.create(), scene.plane, camera.pose);
    const line3d = plane_plane_intersection(plane, z_plane);
    console.log(line3d);

    // Project line
    const line2d = project_line(line3d, camera.projection);
    console.log(line2d);
    
    // Clip with screen edges
    const lineSegment = clip_to_ndc(line2d);
    console.log(lineSegment);

    ctx.lineWidth = 2 / canvas.height;
    ctx.beginPath();
    ctx.moveTo(lineSegment.p0[0], lineSegment.p0[1]);
    ctx.lineTo(lineSegment.p1[0], lineSegment.p1[1]);
    ctx.stroke();
  }  


  /*
  var projection = mat4.create();
  mat4.multiply(projection, camera.K, camera.pose);
  var vertices = [
    vec3.fromValues(0, 0, 0),
    vec3.fromValues(1, 0, 0),
    vec3.fromValues(1, 0, 1),
    vec3.fromValues(0, 0, 1),
  ];
  const r = 3;
  var screen = vec3.create();
  for (var i = 0; i < vertices.length; i++) {
    vec3.transformMat4(screen, vertices[i], projection);
    ctx.fillRect(
      canvas.width * (0.5 + screen[0] / screen[2]),
      canvas.height * (0.5 - screen[1] / screen[2]),
      r, r);
  }*/
}

function x2(x, y) {
  return 1 / (x*x + y*y);
}

function ready() {
  var up = vec3.fromValues(0, 1, 0);
  var eye = vec3.fromValues(0, 0.4, -2);
  var center = vec3.fromValues(0, 0, 0);
  var pose = mat4.create();
  mat4.lookAt(pose, eye, center, up);
  var projection = mat4.create();
  mat4.perspective(projection, 1.3, 640/480, 0.1, 2);

  const canvas = document.getElementById('target');
  const camera = {projection, pose};
  const scene = {heightmap: x2, plane: vec4.fromValues(0, 1, 0, 0)};
  render(canvas, camera, scene);
}

document.addEventListener('DOMContentLoaded', ready);
