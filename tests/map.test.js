'use strict';

{

// ── 3D 地球数学测试 ─────────────────────────────────────────────────────────
// 覆盖：单位球坐标、Fibonacci 防重叠、亮度 5 等级
const { test, assert, assertEqual } = Suite;

test('spherePoint: 返回单位向量', () => {
  const p = spherePoint(35, 128);
  const len = Math.hypot(p.x, p.y, p.z);
  assert(Math.abs(len - 1) < 1e-9, 'spherePoint 应返回单位向量');
});

test('spherePoint: 北极点 y 接近 1', () => {
  const p = spherePoint(90, 0);
  assert(Math.abs(p.y - 1) < 1e-9, '纬度 90 应映射到北极');
});

test('sphereVectorForSeed: 100 个节点最小间距仍保持分散', () => {
  const points = Array.from({ length: 100 }, (_, i) => sphereVectorForSeed('n' + i, 100, i));
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y, points[i].z - points[j].z);
      min = Math.min(min, d);
    }
  }
  assert(min > 0.18, 'Fibonacci sphere 的 100 个点不应挤在一起');
});

test('sphereVectorForSeed: 同 total 和 slot 下位置稳定', () => {
  assertEqual(sphereVectorForSeed('康德', 30, 7), sphereVectorForSeed('康德', 30, 7));
});

test('rotateAroundAxis: 可围绕 Y 轴旋转到侧面', () => {
  const p = rotateAroundAxis({ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }, Math.PI / 2);
  assert(Math.abs(p.x - 1) < 1e-9, '旋转后 x 应接近 1');
  assert(Math.abs(p.z) < 1e-9, '旋转后 z 应接近 0');
});

test('nodeBrightnessLevel: 按引用数和 primary role 提升级别', () => {
  assertEqual(nodeBrightnessLevel({ count: 1, role: 'background' }), 1);
  assertEqual(nodeBrightnessLevel({ count: 2, role: 'background' }), 2);
  assertEqual(nodeBrightnessLevel({ count: 4, role: 'secondary' }), 3);
  assertEqual(nodeBrightnessLevel({ count: 7, role: 'secondary' }), 4);
  assertEqual(nodeBrightnessLevel({ count: 11, role: 'primary' }), 5);
  assertEqual(nodeBrightnessLevel({ count: 7, role: 'primary' }), 5);
});

test('nodeBrightnessVisual: 亮度等级映射半径与透明度', () => {
  assertEqual(nodeBrightnessVisual(1), { radius: 4, opacity: 0.40, glow: 0 });
  assertEqual(nodeBrightnessVisual(5), { radius: 10, opacity: 1.00, glow: 6 });
});

}
