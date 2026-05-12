'use strict';

function normalize3(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function spherePoint(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  return normalize3({
    x: Math.cos(lat) * Math.sin(lon),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.cos(lon),
  });
}

function sphereVectorForSeed(name, total, slot) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const safeTotal = Math.max(1, total);
  const safeSlot = Math.max(0, Math.min(safeTotal - 1, slot));
  const t = (safeSlot + 0.5) / safeTotal;
  const lat = Math.asin(1 - 2 * t) * 180 / Math.PI;
  const lon = ((safeSlot * golden) * 180 / Math.PI) % 360 - 180;
  return spherePoint(lat, lon);
}

function rotateAroundAxis(point, axis, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = point.x * axis.x + point.y * axis.y + point.z * axis.z;
  return {
    x: point.x * cos + (axis.y * point.z - axis.z * point.y) * sin + axis.x * dot * (1 - cos),
    y: point.y * cos + (axis.z * point.x - axis.x * point.z) * sin + axis.y * dot * (1 - cos),
    z: point.z * cos + (axis.x * point.y - axis.y * point.x) * sin + axis.z * dot * (1 - cos),
  };
}

function rotateToFront(target, point) {
  const z = Math.max(-1, Math.min(1, target.z));
  const angle = Math.acos(z);
  if (angle < 0.001) return point;
  const axis = Math.abs(z + 1) < 0.001 ? { x: 0, y: 1, z: 0 } : normalize3({ x: target.y, y: -target.x, z: 0 });
  return rotateAroundAxis(point, axis, angle);
}

function nodeBrightnessLevel(n) {
  let lv = 1;
  const count = Number(n?.count || 0);
  if (count >= 11) lv = 5;
  else if (count >= 7) lv = 4;
  else if (count >= 4) lv = 3;
  else if (count >= 2) lv = 2;
  if (n?.role === 'primary') lv = Math.min(5, lv + 1);
  return lv;
}

function nodeBrightnessVisual(level) {
  const table = {
    1: { radius: 4,  opacity: 0.40, glow: 0 },
    2: { radius: 5,  opacity: 0.55, glow: 0 },
    3: { radius: 6,  opacity: 0.70, glow: 2 },
    4: { radius: 8,  opacity: 0.85, glow: 4 },
    5: { radius: 10, opacity: 1.00, glow: 6 },
  };
  return table[level] || table[1];
}

