export class JStrokeControls {
  constructor(hostEl) {
    this.hostEl = hostEl;
    this.isDrawing = false;
    this.points = [];

    this.onStroke = () => {};
    this.onStart = () => {};
    this.onMove = () => {};
    this.onEnd = () => {};

    this.startStroke = this.startStroke_.bind(this);
    this.moveStroke = this.moveStroke_.bind(this);
    this.endStroke = this.endStroke_.bind(this);
    this.leaveStroke = this.leaveStroke_.bind(this);

    this.startStroke = this.startStroke_.bind(this);
    this.moveStroke = this.moveStroke_.bind(this);
    this.endStroke = this.endStroke_.bind(this);
    this.leaveStroke = this.leaveStroke_.bind(this);
  }
  activate() {
    this.hostEl.addEventListener("mousedown", this.startStroke);
    this.hostEl.addEventListener("mousemove", this.moveStroke);
    this.hostEl.addEventListener("mouseup", this.endStroke);
    this.hostEl.addEventListener("mouseleave", this.leaveStroke);

    this.hostEl.addEventListener("touchstart", this.startStroke);
    this.hostEl.addEventListener("touchmove", this.moveStroke);
    this.hostEl.addEventListener("touchend", this.endStroke);
  }
  deactivate() {
    this.hostEl.removeEventListener("mousedown", this.startStroke);
    this.hostEl.removeEventListener("mousemove", this.moveStroke);
    this.hostEl.removeEventListener("mouseup", this.endStroke);
    this.hostEl.removeEventListener("mouseleave", this.leaveStroke);

    this.hostEl.removeEventListener("touchstart", this.startStroke);
    this.hostEl.removeEventListener("touchmove", this.moveStroke);
    this.hostEl.removeEventListener("touchend", this.endStroke);
  }
  _getPosition(cx, cy) {
    const rect = this.hostEl.getBoundingClientRect();
    return {
      x: (cx - rect.left) / rect.width,
      y: (cy - rect.top) / rect.height,
      t: Date.now(),
    };
  }
  _getPointFromEvent(e) {
    const { clientX, clientY } = "touches" in e ? e.touches[0] : e;
    // console.log(clientX, clientY)
    return [clientX, clientY];
  }
  startStroke_(e) {
    // console.log(e);
    // e.preventDefault();
    const [cx, cy] = this._getPointFromEvent(e);
    this.isDrawing = true;
    this.points = [];
    const pos = this._getPosition(cx, cy);
    this.points.push(pos);
    this.onStart(pos);
  }
  moveStroke_(e) {
    // console.log(e);
    e.preventDefault();
    const [cx, cy] = this._getPointFromEvent(e);
    if (!this.isDrawing) {
      return;
    }
    const pos = this._getPosition(cx, cy);
    this.points.push(pos);
    this.onMove(pos);
  }
  endStroke_(e) {
    // console.log(e);
    // e.preventDefault();
    if (!this.isDrawing || this.points.length < 2) {
      this.points = [];
      return;
    }
    this.isDrawing = false;
    if (this.points.length < 2) {
      return;
    }
    const spoints = douglasPeucker(this.points);
    const info = getStrokeInfo(spoints);
    const res = { points: spoints, ...info };
    // console.log(res);
    this.onEnd();
    this.onStroke(res);
  }
  leaveStroke_() {
    if (this.isDrawing) {
      this.endStroke_();
    }
  }
}

function douglasPeucker(points, eps = 0.05) {
  const stack = [];
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  stack.push([0, points.length - 1]);
  while (stack.length > 0) {
    const [si, ei] = stack.pop();
    const sp = points[si];
    const ep = points[ei];
    let mi = -1;
    let mdist = -1;
    for (let i = 1; i < ei - si; i++) {
      const ti = si + i;
      const tp = points[ti];
      const dist = pointToLineDist(tp, sp, ep);
      if (dist > mdist) {
        mdist = dist;
        mi = ti;
      }
    }
    if (mdist < eps) {
      continue;
    }
    keep[mi] = true;
    stack.push([si, mi], [mi, ei]);
  }
  return points.filter((_, i) => keep[i]);
}

function pointToLineDist(p, sp, ep) {
  // dot prod
  // dot = |ep-sp|*|p-sp|*cos(alpha)
  // dot = (ep-sp).x*(p-sp).x + (ep-sp).y*(p-sp).y
  // alpha = acos(dot/(|ep-sp|*|p-sp|));
  const spep = vSub(ep, sp);
  const spp = vSub(p, sp);
  const spepLen = vLen(spep);
  const sppLen = vLen(spp);
  const dot = vDot(spep, spp);
  const alpha = Math.acos(dot / (spepLen * sppLen));
  const dist = sppLen * Math.sin(alpha);
  return dist;
}
function vAdd(lhs, rhs) {
  return { x: lhs.x + rhs.x, y: lhs.y + rhs.y };
}
function vSub(lhs, rhs) {
  return { x: lhs.x - rhs.x, y: lhs.y - rhs.y };
}
function vDot(lhs, rhs) {
  return lhs.x * rhs.x + lhs.y * rhs.y;
}
function vLen(lhs) {
  return Math.sqrt(lhs.x * lhs.x + lhs.y * lhs.y);
}
function getStrokeInfo(points, angleDiffThld = Math.PI / 12) {
  const bbox = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    width: null,
    height: null,
  };
  points.forEach((p) => {
    bbox.minX = Math.min(bbox.minX, p.x);
    bbox.maxX = Math.max(bbox.maxX, p.x);
    bbox.minY = Math.min(bbox.minY, p.y);
    bbox.maxY = Math.max(bbox.maxY, p.y);
  });
  bbox.width = bbox.maxX - bbox.minX;
  bbox.height = bbox.maxY - bbox.minY;

  let totalLength = 0;
  let directionChanges = 0;
  let prevAngle = null;
  const angles = [];
  const directions = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const dp = vSub(p1, p0);
    const segmentLength = vLen(dp);
    totalLength += segmentLength;

    const angle = Math.atan2(dp.y, dp.x);
    angles.push(angle);
    const direction = angle2direction(angle);
    directions.push(direction);
    if (prevAngle !== null) {
      const angleDiff = Math.abs(angle - prevAngle);
      if (angleDiff > angleDiffThld) {
        directionChanges++;
      }
    }

    prevAngle = angle;
  }

  const directDistance = vLen(vSub(points[points.length - 1], points[0]));
  const straightness = totalLength > 0 ? directDistance / totalLength : 0;

  return {
    bbox,
    directionChanges,
    straightness,
    totalLength,
    angles,
    directions,
  };
}

function angle2direction(angle) {
  angle = angle < 0 ? angle + Math.PI * 2 : angle;
  const directions = [
    "r",
    "dr",
    "dr",
    "d",
    "d",
    "dl",
    "dl",
    "l",
    "l",
    "ul",
    "ul",
    "u",
    "u",
    "ur",
    "ur",
    "r",
  ];
  const step = (Math.PI * 2) / directions.length;
  const idx = Math.floor(angle / step);
  return directions[idx];
}

export function classifyStroke(info) {
  const {
    bbox,
    directionChanges,
    straightness,
    totalLength,
    angles,
    directions,
  } = info;
  if (straightness > 0.9 && directionChanges < 2) {
    // straight lines
    if (bbox.width > bbox.height*2) {
        return `line|horizontal|directions:` +directions.join(',');
    }
    if (bbox.height > bbox.width*2) {
        return `line|vertical|directions:` +directions.join(',');
    }
  }
  return `curve|directions:` +directions.join(',');
}


