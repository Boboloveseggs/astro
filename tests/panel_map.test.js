'use strict';

{

// ── panel.js 地图交互测试 ───────────────────────────────────────────────────
// 覆盖：Day 3 地图工具栏、引导文字、hover 卡内容
const { test, assert, assertEqual } = Suite;

function makeEarthFixture() {
  const host = document.createElement('div');
  host.style.width = '720px';
  host.style.height = '560px';
  document.body.appendChild(host);

  const nodes = [
    { id: 'a', name: '节点A', type: 'concept', role: 'primary', count: 12 },
    { id: 'b', name: '节点B', type: 'person', role: 'secondary', count: 3 },
    { id: 'c', name: '节点C', type: 'theory', role: 'background', count: 1 },
  ];
  const links = [
    { source: 'a', target: 'b', value: 2 },
    { source: 'b', target: 'c', value: 1 },
  ];
  const articles = [{
    id: 'rec001',
    savedAt: '2024-03-10T08:00:00.000Z',
    article: { title: '节点A 的文章' },
    analysis: {
      domain: '哲学',
      sub_domain: '认识论',
      nodes_hit: [{ name: '节点A', type: 'concept', role: 'primary', contribution: '用于测试 hover 命中点' }],
    },
  }];

  renderEarthSphere(nodes, links, host, articles);
  return host;
}

test('renderEarthSphere: 渲染工具栏、引导文字和 hover 容器', () => {
  const host = makeEarthFixture();
  assert(host.querySelector('#earthZoomOutBtn'), '应渲染缩小按钮');
  assert(host.querySelector('#earthZoomInBtn'), '应渲染放大按钮');
  assert(host.querySelector('#earthResetBtn'), '应渲染回到中心按钮');
  assert(host.querySelector('#enterUniverseBtn')?.textContent.includes('进入宇宙'), '单球视图应提供进入宇宙按钮');
  assert(host.querySelector('#mapNodeIndexBtn')?.classList.contains('map-node-fab'), '应把节点库入口放到地图浮动按钮');
  assert(host.querySelector('#mapNodeIndexBtn')?.textContent.includes('全局节点'), '浮动按钮文案应为全局节点');
  assert(host.querySelector('#mapHint')?.textContent.includes('停留 1 秒'), '应提示 1 秒 hover');
  assert(host.querySelector('#nodeHoverCard'), '应渲染 hover 卡容器');
  assert(host.querySelectorAll('.sphere-node').length === 3, '应渲染 3 个节点');
  assertEqual(earthSphereState?.zoom, EARTH_SPHERE_INITIAL_ZOOM);
  stopEarthSphere();
  host.remove();
});

test('showNodeHoverCard: 显示节点关联文章和命中点', () => {
  const host = makeEarthFixture();
  showNodeHoverCard('节点A', { clientX: 160, clientY: 160 });
  const card = host.querySelector('#nodeHoverCard');
  assert(card.classList.contains('visible'), 'hover 卡应显示');
  assert(card.textContent.includes('节点A 的文章'), 'hover 卡应列出关联文章');
  assert(card.textContent.includes('用于测试 hover 命中点'), 'hover 卡应显示 contribution');
  hideNodeHoverCard();
  stopEarthSphere();
  host.remove();
});

test('renderNodeAssetExplanation: 节点详情展示资产、指纹意义和延展方向', () => {
  const mentions = [{
    hit: { name: '位置决定命运', type: 'concept', role: 'primary', contribution: '解释人物命运的结构入口。' },
    projectName: '默认项目',
    rec: {
      id: 'node-detail-001',
      article: { title: '位置决定命运', type: 'article' },
      analysis: {
        domain: '文学',
        sub_domain: '社会结构',
        core_claim: '位置决定命运，信息差即权力',
        creator_strength: '擅长把文学人物转译成社会结构分析。',
        asset_cards: [
          {
            type: 'core_viewpoint',
            title: '位置决定命运',
            summary: '把人物命运放回结构位置。',
            keywords: ['位置决定命运'],
            why_reusable: '可迁移到现实议题。',
            reuse_score: 5,
          },
        ],
        nodes_hit: [
          { name: '位置决定命运', type: 'concept', role: 'primary', contribution: '解释人物命运的结构入口。' },
        ],
        next_suggestions: [
          { type: '延展', suggestion: '普通人为什么很难靠努力跨越阶层？', reason: '把位置主题迁移到现实。' },
        ],
      },
    },
  }];

  const html = renderNodeAssetExplanation(mentions, '位置决定命运', 'concept', ['默认项目']);
  assert(html.includes('作品资产解释卡'), '应展示节点解释卡');
  assert(html.includes('关联资产'), '应展示关联资产');
  assert(html.includes('写作指纹意义'), '应展示写作指纹意义');
  assert(html.includes('可延展方向'), '应展示可延展方向');
  assert(html.includes('普通人为什么很难靠努力跨越阶层？'), '应展示下一篇方向');
});

test('startEarthSphereDrag: 拖拽结束停在节点上时 1 秒内恢复 hover', async () => {
  const host = makeEarthFixture();
  const svg = host.querySelector('#earthSphere');
  const node = host.querySelector('.sphere-node');
  const oldElementFromPoint = document.elementFromPoint;
  svg.setPointerCapture = () => {};
  svg.releasePointerCapture = () => {};
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => node,
  });

  try {
    svg.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, button: 0, clientX: 80, clientY: 80, bubbles: true }));
    svg.dispatchEvent(new PointerEvent('pointermove', { pointerId: 9, button: 0, clientX: 120, clientY: 100, bubbles: true }));
    svg.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, button: 0, clientX: 120, clientY: 100, bubbles: true }));
    assertEqual(earthSphereState.drag, null);
    await new Promise(resolve => setTimeout(resolve, NODE_HOVER_SHOW_DELAY + 40));
    assert(host.querySelector('#nodeHoverCard')?.classList.contains('visible'), '拖拽结束后停在节点上应恢复 hover 卡');
  } finally {
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: oldElementFromPoint,
    });
    hideNodeHoverCard();
    stopEarthSphere();
    host.remove();
  }
});

test('earthNodeFill: 节点按写作频次变亮且不再渲染实体外圈', () => {
  assertEqual(earthNodeFill({ lv: 5 }), '#fff6cf');
  assertEqual(earthNodeFill({ lv: 3 }), '#c8a44a');
  assertEqual(earthNodeFill({ lv: 1 }), '#4c4a42');
  assertEqual(earthNodeStrokeColor({ lv: 5 }), 'none');
  assertEqual(earthNodeStrokeWidth({ lv: 5 }), 0);
  assert(earthNodeOpacity({ lv: 5 }) > earthNodeOpacity({ lv: 1 }), '高频节点应比低频节点更亮');
  assertEqual(earthNodeGlowFilter({ lv: 5 }), 'url(#node-glow-strong)');
  assertEqual(earthNodeGlowFilter({ lv: 1 }), 'url(#node-glow-dim)');
  assertEqual(TYPE_META.person.color, '#5858c0');
});

test('renderEarthSphere: 节点使用柔光滤镜且不保留实体光圈', () => {
  const host = makeEarthFixture();
  assert(host.querySelector('#node-glow-strong'), '应定义高频节点柔光滤镜');
  assert(host.querySelector('#node-glow-dim'), '应定义低频节点柔光滤镜');
  assert(host.querySelector('#rg-glow'), '应定义中心椭圆光晕渐变');
  assert(host.querySelector('#mapGlow')?.getAttribute('fill') === 'url(#rg-glow)', '应渲染中心椭圆光晕');
  assertEqual(host.querySelectorAll('.sphere-node circle:not(.sphere-node-core)').length, 0);
  assert(host.querySelector('#sphereShell')?.children.length === 0, '球体外轮廓和辅助线应隐藏，不再渲染 shell 子元素');
  assert(host.querySelectorAll('.sphere-shell-line').length === 0, '球体外环辅助线不应出现在 DOM 中');
  assert(!host.querySelector('#earthSphereBody'), '不应再保留错误的球面主体渐变');
  assert(!host.querySelector('#earthSphereBodyLayer'), '不应再渲染球面填充层');
  stopEarthSphere();
  host.remove();
});

test('linkClass/earthLegendHtml: 连线按强弱分级并用连线图例', () => {
  assertEqual(linkClass({ value: 3 }), 'strong');
  assertEqual(linkClass({ value: 1 }), 'mid');
  assertEqual(linkClass({ value: 0 }), 'weak');
  assertEqual(linkClass({ kind: 'wikilink', value: 9 }), 'weak');
  const html = earthLegendHtml();
  assert(html.includes('强连接'), '图例应说明强连接');
  assert(html.includes('弱连接'), '图例应说明弱连接');
  assert(html.includes('待点亮'), '图例应说明 wikilink 待点亮连接');
  assert(!html.includes('人物'), '图例不再展示节点类型色');
});

const UNIVERSE_FIXTURE = [
  {
    id: 'u1',
    project_id: 'p1',
    article: { title: '经济作品', type: 'article' },
    analysis: {
      domain: '经济学',
      nodes_hit: [{ name: '市场', type: 'concept' }, { name: '周期', type: 'theory' }],
    },
  },
  {
    id: 'u2',
    project_id: 'p1',
    article: { title: '哲学作品', type: 'article' },
    analysis: {
      domain: '哲学',
      nodes_hit: [{ name: '市场', type: 'concept' }, { name: '主体', type: 'concept' }],
    },
  },
  {
    id: 'u3',
    project_id: 'p2',
    article: { title: '未分类作品', type: 'article' },
    analysis: {
      domain: '',
      nodes_hit: [{ name: '主体', type: 'concept' }],
    },
  },
];

test('prepareUniverseBalls: domain 模式按领域分球并统计节点', () => {
  const balls = prepareUniverseBalls(UNIVERSE_FIXTURE, 'domain');
  assertEqual([...new Set(balls.map(b => b.name))].sort(), ['哲学', '未分类', '经济学'].sort());
  const economy = balls.find(b => b.name === '经济学');
  assertEqual(economy.articleCount, 1);
  assertEqual(economy.nodeCount, 2);
});

test('prepareUniverseBalls: project 模式按项目分球并使用项目名', () => {
  const balls = prepareUniverseBalls(UNIVERSE_FIXTURE, 'project', { p1: '主项目', p2: '副项目' });
  assertEqual(balls.map(b => b.name), ['主项目', '副项目']);
  assertEqual(balls.find(b => b.ballId === 'p1').articleCount, 2);
});

test('prepareUniverseBalls: 空 domain 归入未分类球', () => {
  const balls = prepareUniverseBalls(UNIVERSE_FIXTURE, 'domain');
  const uncategorized = balls.find(b => b.ballId === '未分类');
  assert(uncategorized, '应存在未分类球');
  assertEqual(uncategorized.articleCount, 1);
});

test('findCrossBallLinks: 跨球同名节点生成引力线', () => {
  const balls = prepareUniverseBalls(UNIVERSE_FIXTURE, 'domain');
  const links = findCrossBallLinks(balls);
  assert(links.some(link => link.shared.includes('市场')), '经济学与哲学应因市场节点相连');
  assert(links.some(link => link.shared.includes('主体')), '哲学与未分类应因主体节点相连');
});

test('universeBallVisual: 作品越多星球越大越亮', () => {
  const small = universeBallVisual({ articleCount: 1 }, 9);
  const large = universeBallVisual({ articleCount: 9 }, 9);
  assert(large.radius > small.radius, '高产星球半径应更大');
  assert(large.glowOpacity > small.glowOpacity, '高产星球光晕应更亮');
  assert(large.glowRadius > small.glowRadius, '高产星球模糊光晕应更大');
});

test('resolveUniverseLockBallId: 默认不自动锁定，只有显式 activeBallId 才锁定', () => {
  const oldActiveProject = activeProject;
  const oldActiveBallId = activeBallId;
  const projectFixture = [
    ...UNIVERSE_FIXTURE,
    { id: 'u4', project_id: 'p1', article: { title: '哲学追加', type: 'article' }, analysis: { domain: '哲学', nodes_hit: [] } },
  ];
  activeProject = 'p1';
  activeBallId = null;
  const balls = prepareUniverseBalls(projectFixture, 'domain');
  assertEqual(resolveUniverseLockBallId(projectFixture, balls, 'domain'), null);
  activeProject = 'p2';
  assertEqual(resolveUniverseLockBallId(projectFixture, balls, 'domain'), null);
  activeBallId = '哲学';
  assertEqual(resolveUniverseLockBallId(projectFixture, balls, 'domain'), '哲学');
  activeBallId = '不存在的球';
  assertEqual(resolveUniverseLockBallId(projectFixture, balls, 'domain'), null);
  activeProject = oldActiveProject;
  activeBallId = oldActiveBallId;
});

test('renderUniverseView: 默认显示宇宙全貌，显式选择后才锁定知识星球', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const oldActiveProject = activeProject;
  const oldActiveBallId = activeBallId;
  activeProject = 'p1';
  activeBallId = null;

  renderUniverseView(UNIVERSE_FIXTURE, [{ id: 'p1', name: '主项目' }, { id: 'p2', name: '副项目' }], host, 'domain');
  assert(host.querySelector('#universeCanvasWrap canvas'), '应渲染 WebGL canvas');
  assert(host.querySelector('#universeStarTooltip'), '应提供 hover 星点名称浮层');
  assert(!host.querySelector('#universeLockCard.visible'), '地图入口应默认显示宇宙全貌，不自动锁定知识星球');
  assertEqual(activeBallId, null);
  assertEqual(universeSceneState?.lockedObject, null);
  assertEqual(universeSceneState?.starSprites?.length, 3);
  assert(universeSceneState?.galaxyPlane?.material?.map?.userData?.width >= 2000, 'galaxy texture should stay high-res when camera zooms in');
  assertEqual(universeSceneState?.galaxyPlane?.material?.map?.userData?.palette, 'purple-black-gold');
  assertEqual(universeSceneState?.planetTexture?.userData?.kind, 'planet');
  assertEqual(universeSceneState?.planetTexture?.userData?.palette, 'purple-black-gold');
  assert(universeSceneState?.spiralCloud?.geometry?.attributes?.position?.count >= 9000, 'galaxy should include a structured spiral particle layer');
  assertEqual(universeSceneState?.spiralCloud?.userData?.mode, 'spiral');
  assertEqual(universeSceneState?.spiralCloud?.userData?.palette, 'purple-black-gold');
  assert(universeSceneState?.galaxyPlane, '应渲染程序生成的星云纹理层');
  assert(universeSceneState?.galaxyPlane?.material?.map?.userData?.particleCount >= 9000, '星云纹理应主要由高密度粒子构成');
  assert(universeSceneState?.haloCloud?.geometry?.attributes?.position?.count >= 3000, '应有包围星云的 3D halo 粒子层，避免侧翻露出平面');
  assert(universeSceneState?.ribbonCloud?.geometry?.attributes?.position?.count >= 9000, '应有 3D 星云丝带层，让侧面也保留星云轮廓');
  assert(universeSceneState?.hazeCloud?.geometry?.attributes?.position?.count >= 3000, '应有低透明度 haze 粒子层');
  assert(universeSceneState?.dustCloud?.geometry?.attributes?.position?.count >= 6000, '应有高密度 dust 粒子层');
  assert(universeSceneState?.brightCloud?.geometry?.attributes?.position?.count >= 1200, '应有高亮星点粒子层');
  const spiralZ = universeSceneState.spiralCloud.geometry.attributes.position.array.filter((_, index) => index % 3 === 2);
  assert(Math.max(...spiralZ) - Math.min(...spiralZ) > 260, '螺旋星云应有足够 z 纵深，不能只是薄平面');
  const ribbonZ = universeSceneState.ribbonCloud.geometry.attributes.position.array.filter((_, index) => index % 3 === 2);
  assert(Math.max(...ribbonZ) - Math.min(...ribbonZ) > 360, '星云丝带应有更强 z 纵深，侧翻时仍能看到轨迹');
  const starZ = universeSceneState.starSprites.map(sprite => sprite.position.z);
  assert(Math.max(...starZ) - Math.min(...starZ) > 100, '知识星球应分布在 3D 深度中，而不是贴在同一平面');
  assert(!host.querySelector('.universe-ball-core'), '3D 宇宙星点不应再渲染带边框的 SVG 球体');

  activeBallId = '哲学';
  renderUniverseView(UNIVERSE_FIXTURE, [{ id: 'p1', name: '主项目' }, { id: 'p2', name: '副项目' }], host, 'domain');
  assert(host.querySelector('#universeLockCard.visible'), '显式选择知识星球后应进入锁定预览');
  assertEqual(universeSceneState?.lockedObject?.material?.map?.userData?.kind, 'knowledge-preview');
  assertEqual(universeSceneState?.lockedObject?.material?.map?.userData?.palette, 'purple-black-gold');
  assert(universeSceneState?.lockedObject?.material?.map?.userData?.nodeCount > 0, 'locked universe point should preview the ball nodes before entering');
  assert(universeSceneState?.lockedObject?.material?.map?.userData?.labelCount > 0, 'locked preview should include readable node labels');
  assert(universeSceneState?.lockedObject?.scale?.x >= 154, 'locked preview should zoom in enough to read labels');
  assert(universeSceneState?.lockedObject, '锁定后应保存 3D 星点对象用于镜头跟随');
  assert(universeSceneState?.focusGlow, '应提供锁定星点的柔光推进层');
  assert(universeSceneState?.cameraTween, '进入宇宙时应有 PPT 式镜头缓动');
  const target = universeCameraTargetForObject(universeSceneState.lockedObject);
  const objectPos = universeSceneState.lockedObject.getWorldPosition(new THREE.Vector3());
  assert(target.camera.z - objectPos.z < 210, '锁定镜头应贴近星云平面，形成沉浸式进入感');
  assert(Math.hypot(target.camera.x - objectPos.x, target.camera.y - objectPos.y) > 60, '锁定镜头应斜向飞入而不是正俯视放大');
  assert(!host.querySelector('.universe-ball-core'), '3D 宇宙星点不应再渲染带边框的 SVG 球体');

  const canvas = host.querySelector('#universeCanvasWrap canvas');
  const oldZoom = universeSceneState.targetZoom;
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true }));
  assert(universeSceneState.targetZoom < oldZoom, 'wheel up should zoom the universe camera inward');
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
  assertEqual(universeSceneState.lockedObject, null, 'wheel down from a locked planet should return to the universe overview');
  assertEqual(activeBallId, null, 'wheel overview return should clear the active universe ball');
  assert(universeSceneState.targetRotation, '拖拽应使用 targetRotation 做平滑追随');
  const oldYaw = universeSceneState.targetRotation.y;
  const oldRoll = universeSceneState.targetRotation.z;
  canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 120, clientY: 120, bubbles: true }));
  canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, button: 0, clientX: 190, clientY: 94, bubbles: true }));
  canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, button: 0, clientX: 190, clientY: 94, bubbles: true }));
  assert(Math.abs(universeSceneState.targetRotation.y - oldYaw) > 0.30, 'horizontal drag should primarily yaw the universe left and right');
  assert(Math.abs(universeSceneState.targetRotation.z - oldRoll) < Math.abs(universeSceneState.targetRotation.y - oldYaw), 'horizontal drag should not mostly roll the universe in screen space');
  canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, button: 0, clientX: 160, clientY: 120, bubbles: true }));
  canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, button: 0, clientX: 160, clientY: 560, bubbles: true }));
  canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, button: 0, clientX: 160, clientY: 560, bubbles: true }));
  assert(universeSceneState.targetRotation.x > 0.9, 'vertical drag should allow deep pitch rotation instead of being clamped like a flat board');
  assert(Math.abs(universeSceneState.userRotation.x - universeSceneState.targetRotation.x) > 0.05, 'actual rotation should follow target smoothly instead of jumping instantly');

  stopMapSimulation();
  activeProject = oldActiveProject;
  activeBallId = oldActiveBallId;
  host.remove();
});

test('renderEarthSphere: 演示星球只渲染匿名填充点并跟随球面旋转', () => {
  const host = makeEarthFixture();
  try {
    const btn = host.querySelector('#earthDemoFillBtn');
    assert(btn, '应提供演示星球开关');
    assertEqual(host.querySelectorAll('.sphere-demo-node').length, 0);

    btn.click();
    assert(btn.classList.contains('active'), '打开演示后按钮应进入 active 状态');
    assertEqual(host.querySelectorAll('.sphere-demo-node').length, EARTH_SPHERE_DEMO_POINT_COUNT);
    assertEqual(host.querySelectorAll('.sphere-demo-glow').length, 0);
    assertEqual(host.querySelectorAll('.sphere-node').length, 3);
    assertEqual(earthSphereState.nodeLayer.style.display, 'none');
    assertEqual(earthSphereState.linkLayer.style.display, 'none');
    assert(!host.querySelector('.sphere-demo-node')?.dataset.name, '演示点不应暴露真实节点名称');

    const before = { ...earthSphereState.demoPoints[0].view };
    rotateEarthSphereBy(24, 8);
    updateEarthSpherePositions(earthSphereState, earthSphereState.staticLinks || []);
    const after = earthSphereState.demoPoints[0].view;
    const delta = Math.abs(before.x - after.x) + Math.abs(before.y - after.y) + Math.abs(before.z - after.z);
    assert(delta > 0.001, '演示点应跟随球面旋转，而不是静态贴图');

    btn.click();
    assertEqual(host.querySelectorAll('.sphere-demo-node').length, 0);
    assertEqual(earthSphereState.nodeLayer.style.display, '');
    assertEqual(earthSphereState.linkLayer.style.display, '');
  } finally {
    earthSphereDemoFillEnabled = false;
    stopEarthSphere();
    host.remove();
  }
});

test('setEarthSphereZoom: 放开知识球缩放上限以支持更近距离聚焦', () => {
  const host = makeEarthFixture();
  try {
    setEarthSphereZoom(10);
    assertEqual(earthSphereState.zoom, EARTH_SPHERE_MAX_ZOOM);
    setEarthSphereZoom(-10);
    assertEqual(earthSphereState.zoom, EARTH_SPHERE_MIN_ZOOM);
    resetEarthSphereView();
    assertEqual(earthSphereState.zoom, EARTH_SPHERE_INITIAL_ZOOM);
  } finally {
    stopEarthSphere();
    host.remove();
  }
});

test('saveMapState/loadMapState: 宇宙视图状态持久化到 chrome.storage.local', async () => {
  const oldChrome = window.chrome;
  const store = {};
  window.chrome = {
    storage: {
      local: {
        async set(obj) { Object.assign(store, obj); },
        async get(key) { return { [key]: store[key] }; },
      },
    },
  };

  mapView = 'universe';
  universeMode = 'project';
  activeBallId = 'p1';
  await saveMapState();
  mapView = 'single';
  universeMode = 'domain';
  activeBallId = null;
  const loaded = await loadMapState();

  assertEqual(loaded, true);
  assertEqual(mapView, 'universe');
  assertEqual(universeMode, 'project');
  assertEqual(activeBallId, 'p1');
  window.chrome = oldChrome;
  mapView = 'single';
  universeMode = 'domain';
  activeBallId = null;
});

}
