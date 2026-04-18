// ==UserScript==
// @name         DJI 语种快速切换2
// @namespace    https://store.dji.com/
// @version      4.8.2
// @description  在 DJI 商城及后台编辑页右侧注入语种快捷切换按钮面板，MKT 后台弹窗语种快选，产品页 SKU 快速切换，左侧模块导航面板
// @author       o-park.chen
// @match        https://store.dji.com/*
// @match        https://stag-www-reactor.dbeta.me/*
// @match        https://www-reactor.dji.com/*
// @match        https://mkt.djiits.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/dji-store-lang-switcher.user.js
// @downloadURL  https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/dji-store-lang-switcher.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ── 跨模块共享的当前状态（供 switchTo 读取）────────────
  let _currentVid = null;          // 当前选中 SKU 的 vid
  let _currentModSelector = null;  // 当前高亮模块的选择器

  // ── 语种配置（数据来自弹窗 a.switchcountry_click 实测）────
  // path:   URL 路径段；美国特殊，无前缀，path 为 null
  // region: set_region 参数值，所有地区都需要
  // sub:    同一语种多个国家时展开子菜单
  const LANGS = [
    {
      label: '中文',
      path: 'cn', region: 'CN',
      gradient: 'linear-gradient(135deg, #f6a623, #f97316)',
    },
    {
      label: '繁體中文',
      path: 'hk', region: 'HK',
      gradient: 'linear-gradient(135deg, #a78bfa, #ec4899)',
      sub: [
        { label: '香港',   path: 'hk', region: 'HK' },
        { label: '台灣',   path: 'tw', region: 'TW' },
        { label: '澳門',   path: 'mo', region: 'MO' },
      ],
    },
    {
      label: 'English',
      path: 'hk-en', region: 'HK',
      gradient: 'linear-gradient(135deg, #34d399, #06b6d4)',
      sub: [
        { label: 'Hong Kong (EN)', path: 'hk-en', region: 'HK' },
        { label: 'United States',    path: null,    region: 'US' },
        { label: 'United Kingdom',   path: 'uk',    region: 'GB' },
        { label: 'Australia',        path: 'au',    region: 'AU' },
        { label: 'Canada',           path: 'ca',    region: 'CA' },
        { label: 'Singapore',        path: 'sg',    region: 'SG' },
        { label: 'New Zealand',      path: 'nz',    region: 'NZ' },
        { label: 'Philippines',      path: 'ph',    region: 'PH' },
        { label: 'Puerto Rico',      path: 'pr',    region: 'PR' },
        { label: 'Belgium',          path: 'be',    region: 'BE' },
        { label: 'Bulgaria',         path: 'bg',    region: 'BG' },
        { label: 'Croatia',          path: 'hr',    region: 'HR' },
        { label: 'Czech Republic',   path: 'cz',    region: 'CZ' },
        { label: 'Denmark',          path: 'dk',    region: 'DK' },
        { label: 'Estonia',          path: 'ee',    region: 'EE' },
        { label: 'Finland',          path: 'fi',    region: 'FI' },
        { label: 'Greece',           path: 'gr',    region: 'GR' },
        { label: 'Hungary',          path: 'hu',    region: 'HU' },
        { label: 'Ireland',          path: 'ie',    region: 'IE' },
        { label: 'Latvia',           path: 'lv',    region: 'LV' },
        { label: 'Lithuania',        path: 'lt',    region: 'LT' },
        { label: 'Malta',            path: 'mt',    region: 'MT' },
        { label: 'Netherlands',      path: 'nl',    region: 'NL' },
        { label: 'Norway',           path: 'no',    region: 'NO' },
        { label: 'Poland',           path: 'pl',    region: 'PL' },
        { label: 'Portugal',         path: 'pt',    region: 'PT' },
        { label: 'Romania',          path: 'ro',    region: 'RO' },
        { label: 'Slovakia',         path: 'sk',    region: 'SK' },
        { label: 'Slovenia',         path: 'si',    region: 'SI' },
        { label: 'Sweden',           path: 'se',    region: 'SE' },
        { label: 'Switzerland',      path: 'ch',    region: 'CH' },
      ],
    },
    {
      label: '日本語',
      path: 'jp', region: 'JP',
      gradient: 'linear-gradient(135deg, #f472b6, #fb7185)',
    },
    {
      label: '한국어',
      path: 'kr', region: 'KR',
      gradient: 'linear-gradient(135deg, #818cf8, #6366f1)',
    },
    {
      label: 'Deutsch',
      path: 'de', region: 'DE',
      gradient: 'linear-gradient(135deg, #fb923c, #f97316)',
      sub: [
        { label: 'Deutschland',   path: 'de', region: 'DE' },
        { label: 'Österreich',    path: 'at', region: 'AT' },
        { label: 'Liechtenstein', path: 'li', region: 'LI' },
      ],
    },
    {
      label: 'Français',
      path: 'fr', region: 'FR',
      gradient: 'linear-gradient(135deg, #38bdf8, #06b6d4)',
      sub: [
        { label: 'France',        path: 'fr',    region: 'FR' },
        { label: 'Canada (FR)',   path: 'ca-fr', region: 'CA' },
        { label: 'Luxembourg',    path: 'lu',    region: 'LU' },
        { label: 'Monaco',        path: 'mc',    region: 'MC' },
      ],
    },
    {
      label: 'Español',
      path: 'es', region: 'ES',
      gradient: 'linear-gradient(135deg, #f87171, #fb923c)',
    },
    {
      label: 'Italiano',
      path: 'it', region: 'IT',
      gradient: 'linear-gradient(135deg, #4ade80, #34d399)',
    },
  ];

  // ── 站点配置 ─────────────────────────────────────────────
  const host = location.hostname;
  const isDbeta = host.includes('dbeta.me');
  const isReactor = host.includes('www-reactor.dji.com');
  const isMkt = host.includes('mkt.djiits.com');

  // ── MKT 后台：弹窗语种快选（独立逻辑）────────────────────
  if (isMkt) {
    initMktLangSelector();
    return; // MKT 站不需要右侧语种切换面板
  }

  // ── URL 切换函数 ──────────────────────────────────────────
  // path=null 表示美国，URL 无语种前缀
  function switchTo(path, region) {
    const url = new URL(window.location.href);
    const parts = url.pathname.split('/').filter(Boolean);

    // 判断第一段是否为语种前缀
    const knownPageSegments = (isDbeta)
      ? ['mobile', 'edit', 'product', 'category', 'cart', 'account', 'search']
      : isReactor
      ? ['handheld', 'edit', 'product', 'category', 'cart', 'account', 'search']
      : ['product', 'category', 'cart', 'account', 'search', 'combo'];
    const hasLangPrefix = parts.length > 0 && !knownPageSegments.includes(parts[0]);

    if (path === null) {
      // 美国：去掉语种前缀
      if (hasLangPrefix) parts.shift();
    } else {
      // 有前缀的地区
      if (hasLangPrefix) {
        parts[0] = path;
      } else {
        parts.unshift(path);
      }
    }

    url.pathname = '/' + parts.join('/');

    if (isDbeta || isReactor) {
      // dbeta / reactor：只保留 workspace，不需要 set_region
      url.searchParams.delete('set_region');
      url.searchParams.delete('from');
    } else {
      // DJI Store：需要 set_region
      url.searchParams.delete('set_region');
      url.searchParams.delete('from');
      url.searchParams.set('set_region', region);
    }

    // 跳转前保存当前状态（产品页），新页面加载后恢复
    if (/\/product\//.test(location.pathname)) {
      try {
        sessionStorage.setItem('dji-lang-switch-state', JSON.stringify({
          vid: _currentVid,
          moduleSelector: _currentModSelector,
          timestamp: Date.now(),
        }));
        console.log('[DJI 语种切换] 已保存状态 vid=' + _currentVid + ' module=' + _currentModSelector);
      } catch (e) { /* sessionStorage 不可用时静默跳过 */ }
    }

    window.location.href = url.toString();
  }

  // ── 设备检测与切换（仅 dbeta / reactor）─────────────────
  function isMobileUrl() {
    const parts = location.pathname.split('/').filter(Boolean);
    const knownPageSegs = ['mobile', 'edit', 'handheld', 'product', 'category', 'cart', 'account', 'search'];
    const hasLangPrefix = parts.length > 0 && !knownPageSegs.includes(parts[0]);
    const mobileIndex = hasLangPrefix ? 1 : 0;
    return parts[mobileIndex] === 'mobile';
  }

  function switchDevice(toMobile) {
    const url = new URL(window.location.href);
    const parts = url.pathname.split('/').filter(Boolean);
    const knownPageSegs = ['mobile', 'edit', 'handheld', 'product', 'category', 'cart', 'account', 'search'];
    const hasLangPrefix = parts.length > 0 && !knownPageSegs.includes(parts[0]);
    const mobileIndex = hasLangPrefix ? 1 : 0;
    const hasMobile = parts[mobileIndex] === 'mobile';

    if (toMobile && !hasMobile) {
      // 插入 mobile 到语种后面
      parts.splice(mobileIndex, 0, 'mobile');
    } else if (!toMobile && hasMobile) {
      // 移除 mobile
      parts.splice(mobileIndex, 1);
    } else {
      return; // 已经是目标状态，不操作
    }

    url.pathname = '/' + parts.join('/');
    window.location.href = url.toString();
  }

  // ── 注入样式 ──────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #dji-lang-panel {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px 8px 10px 8px;
      background: rgba(18, 18, 28, 0.93);
      border-radius: 14px 0 0 14px;
      box-shadow: -4px 0 24px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      transition: transform 0.25s cubic-bezier(.4,0,.2,1);
      user-select: none;
      max-height: 90vh;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.2) transparent;
    }

    #dji-lang-panel.collapsed {
      transform: translateY(-50%) translateX(calc(100% + 0px));
    }

    /* 收起/展开 tab，固定在面板左侧外部，不受 overflow 影响 */
    #dji-lang-tab {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      z-index: 999998;
      width: 20px;
      height: 56px;
      background: rgba(18, 18, 28, 0.93);
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: rgba(255,255,255,0.8);
      box-shadow: -3px 0 10px rgba(0,0,0,0.4);
      transition: color 0.15s, right 0.25s cubic-bezier(.4,0,.2,1);
    }

    #dji-lang-tab:hover {
      color: #fff;
    }

    .dji-lang-item {
      display: flex;
      flex-direction: column;
    }

    .dji-lang-btn {
      position: relative;
      height: 40px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      display: flex;
      align-items: center;
      padding: 0 10px;
      gap: 6px;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      white-space: nowrap;
      flex-shrink: 0;
      width: 128px;
    }

    .dji-lang-btn:hover {
      transform: scale(1.04);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }

    .dji-lang-btn .dji-star {
      font-size: 14px;
      flex-shrink: 0;
    }

    .dji-lang-btn .dji-label {
      flex: 1;
      text-align: left;
    }

    /* 语种主按钮 + 箭头按钮并排容器 */
    .dji-lang-row {
      display: flex;
      gap: 4px;
      align-items: stretch;
    }

    /* 箭头按钮：独立小块，和主按钮分开 */
    .dji-arrow-btn {
      position: relative;
      flex-shrink: 0;
      width: 32px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 10px;
      color: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .dji-arrow-btn:hover {
      filter: brightness(1.15);
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    }

    .dji-arrow-btn.open {
      transform: rotate(180deg);
    }

    /* Tooltip：hover 箭头时显示 */
    .dji-arrow-btn .dji-tooltip {
      display: none;
      position: absolute;
      right: 38px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(10,10,20,0.92);
      color: #fff;
      font-size: 11px;
      font-weight: 500;
      padding: 5px 9px;
      border-radius: 7px;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .dji-arrow-btn .dji-tooltip::after {
      content: '';
      position: absolute;
      right: -5px;
      top: 50%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-right: none;
      border-left-color: rgba(10,10,20,0.92);
    }

    .dji-arrow-btn:hover .dji-tooltip {
      display: block;
    }

    /* 下拉子菜单 */
    .dji-sub-menu {
      display: none;
      flex-direction: column;
      gap: 3px;
      padding: 4px 0 2px 10px;
      max-height: 300px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
    }

    .dji-sub-menu.open {
      display: flex;
    }

    .dji-sub-btn {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 7px;
      color: #ddd;
      font-size: 11px;
      font-weight: 500;
      padding: 5px 10px;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      width: 118px;
    }

    .dji-sub-btn:hover {
      background: rgba(255,255,255,0.2);
      color: #fff;
    }

    /* PC/MB 设备切换按钮 */
    .dji-device-row {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }

    .dji-device-btn {
      flex: 1;
      height: 36px;
      border: 2px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.15s;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    .dji-device-btn.active {
      background: rgba(59, 130, 246, 0.9);
      color: #fff;
      border-color: rgba(96, 165, 250, 0.6);
      box-shadow: 0 2px 12px rgba(59,130,246,0.4);
    }

    .dji-device-btn.inactive {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.45);
      border-color: rgba(255,255,255,0.1);
    }

    .dji-device-btn.inactive:hover {
      background: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.8);
    }

    /* 拖拽手柄 */
    .dji-drag-handle {
      width: 100%;
      height: 16px;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.3);
      font-size: 10px;
      letter-spacing: 3px;
      user-select: none;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      margin-bottom: 4px;
      flex-shrink: 0;
    }
    .dji-drag-handle:hover { color: rgba(255,255,255,0.6); }
    .dji-drag-handle:active { cursor: grabbing; }
  `;
  document.head.appendChild(style);

  // ── 共用拖拽函数 ──────────────────────────────────────────
  // panelEl: 面板 DOM, tabEl: 收起/展开 tab DOM, getCollapsed: 返回折叠状态
  function makeDraggable(panelEl, tabEl, getCollapsed) {
    let isDragging = false;
    let startMouseY = 0;
    let startTop = 0;

    const handle = document.createElement('div');
    handle.className = 'dji-drag-handle';
    handle.textContent = '⋮⋮⋮';
    handle.title = '拖拽移动面板';
    panelEl.insertBefore(handle, panelEl.firstChild);

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      startMouseY = e.clientY;
      // 获取当前面板的实际 top 像素值
      const rect = panelEl.getBoundingClientRect();
      startTop = rect.top;
      // 拖拽时去掉 translateY 居中，改为直接 top 定位
      panelEl.style.transform = getCollapsed() ? 'translateX(100%)' : 'none';
      panelEl.style.top = startTop + 'px';
      // tab 也同步
      tabEl.style.transform = 'none';
      tabEl.style.top = startTop + 'px';
      document.body.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startMouseY;
      let newTop = startTop + deltaY;
      // 限制在视口内
      newTop = Math.max(10, Math.min(window.innerHeight - 60, newTop));
      panelEl.style.top = newTop + 'px';
      tabEl.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = '';
    });

    return handle;
  }

  // ── 构建面板 ──────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'dji-lang-panel';

  // 独立的收起/展开 tab（脱离面板，不受 overflow 影响）
  const tab = document.createElement('div');
  tab.id = 'dji-lang-tab';
  tab.title = '收起/展开语种面板';
  tab.textContent = '◀';

  let collapsed = false;
  tab.addEventListener('click', () => {
    collapsed = !collapsed;
    if (collapsed) {
      panel.style.transform = 'translateY(-50%) translateX(100%)';
      tab.style.right = '0px';
      tab.textContent = '▶';
    } else {
      panel.style.transform = 'translateY(-50%)';
      tab.style.right = (panel.offsetWidth) + 'px';
      tab.textContent = '◀';
    }
  });

  // 面板展开时 tab 跟着面板左边
  function updateTabPosition() {
    if (!collapsed) {
      tab.style.right = panel.offsetWidth + 'px';
    }
  }

  // ── PC/MB 设备切换按钮（仅 dbeta / reactor）──────────────
  if (isDbeta || isReactor) {
    const deviceRow = document.createElement('div');
    deviceRow.className = 'dji-device-row';

    const mobile = isMobileUrl();

    const pcBtn = document.createElement('button');
    pcBtn.className = 'dji-device-btn ' + (mobile ? 'inactive' : 'active');
    pcBtn.textContent = '🖥 PC';
    pcBtn.title = '切换到电脑端';
    pcBtn.addEventListener('click', () => switchDevice(false));

    const mbBtn = document.createElement('button');
    mbBtn.className = 'dji-device-btn ' + (mobile ? 'active' : 'inactive');
    mbBtn.textContent = '📱 MB';
    mbBtn.title = '切换到手机端';
    mbBtn.addEventListener('click', () => switchDevice(true));

    deviceRow.appendChild(pcBtn);
    deviceRow.appendChild(mbBtn);
    panel.appendChild(deviceRow);
  }

  // 生成语种按钮
  LANGS.forEach((lang) => {
    const item = document.createElement('div');
    item.className = 'dji-lang-item';

    const btn = document.createElement('button');
    btn.className = 'dji-lang-btn';
    btn.style.background = lang.gradient;

    const star = document.createElement('span');
    star.className = 'dji-star';
    star.textContent = '⭐';

    const label = document.createElement('span');
    label.className = 'dji-label';
    label.textContent = lang.label;

    btn.appendChild(star);
    btn.appendChild(label);

    if (lang.sub) {
      // ── 有子选项：主按钮直接跳默认（第一个），箭头独立控制展开 ──
      const row = document.createElement('div');
      row.className = 'dji-lang-row';

      // 主按钮：宽度缩短给箭头让位，点击直接跳第一个国家
      btn.style.flex = '1';
      btn.style.width = 'auto';
      btn.addEventListener('click', () => switchTo(lang.sub[0].path, lang.sub[0].region));

      // 箭头按钮
      const arrowBtn = document.createElement('button');
      arrowBtn.className = 'dji-arrow-btn';
      arrowBtn.style.background = lang.gradient;
      arrowBtn.textContent = '▼';

      // Tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'dji-tooltip';
      tooltip.textContent = '展开更多国家';
      arrowBtn.appendChild(tooltip);

      const subMenu = document.createElement('div');
      subMenu.className = 'dji-sub-menu';

      lang.sub.forEach((s) => {
        const subBtn = document.createElement('button');
        subBtn.className = 'dji-sub-btn';
        subBtn.textContent = s.label;
        subBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          switchTo(s.path, s.region);
        });
        subMenu.appendChild(subBtn);
      });

      arrowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = subMenu.classList.toggle('open');
        arrowBtn.classList.toggle('open', isOpen);
        tooltip.textContent = isOpen ? '收起' : '展开更多国家';
      });

      row.appendChild(btn);
      row.appendChild(arrowBtn);
      item.appendChild(row);
      item.appendChild(subMenu);
    } else {
      // 无子选项 → 直接跳转
      btn.addEventListener('click', () => switchTo(lang.path, lang.region));
      item.appendChild(btn);
    }

    panel.appendChild(item);
  });

  document.body.appendChild(tab);
  document.body.appendChild(panel);

  // 语言面板：加拖拽手柄
  makeDraggable(panel, tab, () => collapsed);

  // 产品页时，语言面板默认下移，给 SKU 面板留空间
  const isProductPage = /\/product\//.test(location.pathname);
  if (isProductPage) {
    panel.style.top = '65%';
    tab.style.top = '65%';
  }

  // 初始化 tab 位置（等面板渲染完）
  requestAnimationFrame(() => updateTabPosition());

  // ══════════════════════════════════════════════════════════
  // ██ SKU 快速切换浮动面板（仅 DJI Store 产品页）
  // ══════════════════════════════════════════════════════════

  if (isProductPage) {
    console.log('[DJI SKU Switcher] 产品页检测到，启动 SKU 面板');

    // ── SKU 面板样式 ──────────────────────────────────────
    const skuStyle = document.createElement('style');
    skuStyle.textContent = `
      #dji-sku-panel {
        position: fixed;
        top: 80px;
        right: 0;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 8px 10px 8px;
        background: rgba(18, 18, 28, 0.93);
        border-radius: 14px 0 0 14px;
        box-shadow: -4px 0 24px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);
        transition: transform 0.25s cubic-bezier(.4,0,.2,1);
        user-select: none;
        max-height: 50vh;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.2) transparent;
      }

      #dji-sku-panel.collapsed {
        transform: translateX(calc(100% + 0px));
      }

      #dji-sku-tab {
        position: fixed;
        top: 80px;
        right: 0;
        z-index: 999998;
        width: 20px;
        height: 48px;
        background: rgba(18, 18, 28, 0.93);
        border-radius: 8px 0 0 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: rgba(255,255,255,0.8);
        box-shadow: -3px 0 10px rgba(0,0,0,0.4);
        transition: color 0.15s, right 0.25s cubic-bezier(.4,0,.2,1);
      }

      #dji-sku-tab:hover {
        color: #fff;
      }

      #dji-sku-panel .sku-title {
        font-size: 10px;
        font-weight: 700;
        color: rgba(255,255,255,0.5);
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 0 4px 4px 4px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 2px;
        white-space: nowrap;
      }

      .dji-sku-btn {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        width: 180px;
        min-height: 34px;
        padding: 5px 10px;
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: rgba(255,255,255,0.8);
        background: rgba(255,255,255,0.06);
        transition: all 0.15s;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        text-align: left;
        line-height: 1.3;
      }

      .dji-sku-btn:hover {
        background: rgba(255,255,255,0.15);
        color: #fff;
        transform: scale(1.02);
      }

      .dji-sku-btn.active {
        border-color: rgba(0, 96, 239, 0.9);
        background: rgba(0, 96, 239, 0.2);
        color: #fff;
        box-shadow: 0 2px 10px rgba(0,96,239,0.3);
      }

      .dji-sku-btn.out-of-stock {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .dji-sku-btn .sku-index {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: rgba(255,255,255,0.6);
      }

      .dji-sku-btn.active .sku-index {
        background: rgba(0, 96, 239, 0.6);
        color: #fff;
      }

      .dji-sku-btn .sku-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .dji-sku-btn .sku-oos-tag {
        font-size: 9px;
        color: #f87171;
        font-weight: 700;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(skuStyle);

    // ── SKU 面板构建 ─────────────────────────────────────
    const skuPanel = document.createElement('div');
    skuPanel.id = 'dji-sku-panel';

    const skuTab = document.createElement('div');
    skuTab.id = 'dji-sku-tab';
    skuTab.title = '收起/展开 SKU 面板';
    skuTab.textContent = '◀';

    let skuCollapsed = false;
    skuTab.addEventListener('click', () => {
      skuCollapsed = !skuCollapsed;
      if (skuCollapsed) {
        skuPanel.style.transform = 'translateX(100%)';
        skuTab.style.right = '0px';
        skuTab.textContent = '▶';
      } else {
        skuPanel.style.transform = '';
        skuTab.style.right = skuPanel.offsetWidth + 'px';
        skuTab.textContent = '◀';
      }
    });

    function updateSkuTabPosition() {
      if (!skuCollapsed) {
        skuTab.style.right = skuPanel.offsetWidth + 'px';
      }
    }

    // ── 提取 SKU 公共前缀（用于缩短显示名称）────────────
    function findCommonPrefix(names) {
      if (names.length <= 1) return '';
      const wordArrays = names.map(n => n.trim().split(/\s+/));
      const minLen = Math.min(...wordArrays.map(w => w.length));
      let commonCount = 0;
      for (let i = 0; i < minLen; i++) {
        const word = wordArrays[0][i];
        if (wordArrays.every(w => w[i] === word)) {
          commonCount = i + 1;
        } else {
          break;
        }
      }
      if (commonCount === 0) return '';
      return wordArrays[0].slice(0, commonCount).join(' ');
    }

    // ── 判断 SKU 是否被选中（通过 border 颜色）──────────
    function isSkuSelected(li) {
      const wrapper = li.querySelector('div[class*="new-combo-wrapper___"]');
      if (!wrapper) return false;
      return getComputedStyle(wrapper).borderColor.includes('0, 96, 239');
    }

    // ── 判断 SKU 是否缺货 ────────────────────────────────
    function isSkuOutOfStock(li) {
      const wrapper = li.querySelector('div[class*="new-combo-wrapper___"]');
      if (!wrapper) return false;
      return wrapper.className.includes('out-of-stock');
    }

    // ── 从 __PRELOADED_STATE__ 获取 vid → slug 映射 ──────
    function getVidSlugMap() {
      const map = {};
      try {
        const state = window.__PRELOADED_STATE__;
        if (!state) return map;
        // 遍历所有顶层 key 找 variants 数组
        Object.keys(state).forEach((key) => {
          const section = state[key];
          if (!section) return;
          // 直接在 variants 数组中查找
          const variants = section.variants || (section.product && section.product.variants);
          if (Array.isArray(variants)) {
            variants.forEach((v) => {
              if (v && v.id && v.slug) {
                map[String(v.id)] = v.slug;
              }
            });
          }
        });
      } catch (e) {
        console.log('[DJI SKU Switcher] 读取 __PRELOADED_STATE__ 失败', e);
      }
      return map;
    }

    // ── 通过 URL 导航切换 SKU（避免 React setState 数据残留）──
    function navigateToSku(vid, slug) {
      const url = new URL(window.location.href);
      const parts = url.pathname.split('/').filter(Boolean);

      // 找到 'product' 段的位置，替换其后面的 slug
      const prodIdx = parts.indexOf('product');
      if (prodIdx >= 0 && prodIdx + 1 < parts.length) {
        parts[prodIdx + 1] = slug;
      }

      url.pathname = '/' + parts.join('/');
      url.searchParams.set('vid', vid);

      // 保存当前模块位置，导航后恢复
      try {
        sessionStorage.setItem('dji-lang-switch-state', JSON.stringify({
          vid: vid,  // 目标 vid（不需要恢复 SKU，因为 URL 已经包含了）
          moduleSelector: _currentModSelector,
          timestamp: Date.now(),
          skipSkuRestore: true,  // 标记：不需要恢复 SKU，URL 已包含正确 vid
        }));
      } catch (e) { /* 静默 */ }

      console.log('[DJI SKU Switcher] URL 导航切换 SKU → ' + url.toString());
      window.location.href = url.toString();
    }

    // ── 渲染 SKU 面板按钮 ────────────────────────────────
    let skuButtons = [];

    function renderSkuPanel(skuItems) {
      skuPanel.innerHTML = '';
      skuButtons = [];

      // 标题
      const title = document.createElement('div');
      title.className = 'sku-title';
      title.textContent = 'SKU 切换';
      skuPanel.appendChild(title);

      // 获取 vid → slug 映射（备用，当前使用 input.click 快速切换）
      const vidSlugMap = getVidSlugMap();

      // 提取名称
      const names = skuItems.map(li => {
        const el = li.querySelector('div[class*="product-title"]');
        return el ? el.textContent.trim() : '未知';
      });

      // 找公共前缀用于缩短显示
      const prefix = findCommonPrefix(names);

      skuItems.forEach((li, i) => {
        const fullName = names[i];
        let shortName = prefix ? fullName.substring(prefix.length).trim() : fullName;
        if (!shortName) shortName = fullName;

        const selected = isSkuSelected(li);
        const oos = isSkuOutOfStock(li);

        const btn = document.createElement('button');
        btn.className = 'dji-sku-btn' + (selected ? ' active' : '') + (oos ? ' out-of-stock' : '');
        btn.title = fullName;

        const index = document.createElement('span');
        index.className = 'sku-index';
        index.textContent = String(i + 1);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'sku-name';
        nameSpan.textContent = shortName;

        btn.appendChild(index);
        btn.appendChild(nameSpan);

        if (oos) {
          const oosTag = document.createElement('span');
          oosTag.className = 'sku-oos-tag';
          oosTag.textContent = '缺货';
          btn.appendChild(oosTag);
        }

        btn.addEventListener('click', () => {
          if (oos) return;
          // 实时检测是否已选中（不能用闭包中的静态值）
          if (isSkuSelected(li)) return;

          const input = li.querySelector('input[type="radio"]');
          if (!input) return;

          // 记录当前滚动位置
          const scrollY = window.pageYOffset;

          // 只劫持 scrollIntoView（React 用它跳到 SKU 区）
          // 不劫持 scrollTo/scroll（劫持它们会干扰 React 数据渲染）
          const origSIV = Element.prototype.scrollIntoView;
          Element.prototype.scrollIntoView = function() {};

          input.click();

          // 持续守住滚动位置 300ms（覆盖 React 异步触发的 scroll）
          let guardCount = 0;
          const guardInterval = setInterval(() => {
            window.scrollTo(0, scrollY);
            guardCount++;
            if (guardCount >= 15) clearInterval(guardInterval); // 15 x 20ms = 300ms
          }, 20);

          // 300ms 后恢复 scrollIntoView 并停止守护
          setTimeout(() => {
            Element.prototype.scrollIntoView = origSIV;
            clearInterval(guardInterval);
            window.scrollTo(0, scrollY);
          }, 350);
        });

        skuPanel.appendChild(btn);
        skuButtons.push({ btn, li });
      });
    }

    // ── 更新选中态 ───────────────────────────────────────
    function updateSkuActiveState() {
      _currentVid = null;
      skuButtons.forEach(({ btn, li }) => {
        const selected = isSkuSelected(li);
        btn.classList.toggle('active', selected);
        if (selected) {
          // 从 li id="accessory-item-212451" 中提取 vid
          const match = li.id && li.id.match(/accessory-item-(\d+)/);
          if (match) _currentVid = match[1];
        }
      });
    }

    // ── 等待 SKU 区域出现并初始化 ─────────────────────────
    let skuInitAttempts = 0;
    const skuMaxAttempts = 20; // 最多等 10 秒（500ms x 20）

    function tryInitSkuPanel() {
      skuInitAttempts++;
      const section = document.querySelector('section[data-test-locator="sectionProductComboPools"]');
      if (!section) {
        if (skuInitAttempts < skuMaxAttempts) {
          setTimeout(tryInitSkuPanel, 500);
        } else {
          console.log('[DJI SKU Switcher] 未找到 SKU 区域，放弃');
        }
        return;
      }

      const skuItems = section.querySelectorAll('li[id^="accessory-item-"]');
      if (skuItems.length === 0) {
        if (skuInitAttempts < skuMaxAttempts) {
          setTimeout(tryInitSkuPanel, 500);
        } else {
          console.log('[DJI SKU Switcher] SKU 区域内无项目，放弃');
        }
        return;
      }

      if (skuItems.length <= 1) {
        console.log('[DJI SKU Switcher] 只有 1 个 SKU，不显示面板');
        return;
      }

      console.log('[DJI SKU Switcher] 找到 ' + skuItems.length + ' 个 SKU，渲染面板');

      renderSkuPanel(Array.from(skuItems));

      // SKU 面板：加拖拽手柄
      makeDraggable(skuPanel, skuTab, () => skuCollapsed);

      document.body.appendChild(skuTab);
      document.body.appendChild(skuPanel);

      requestAnimationFrame(() => updateSkuTabPosition());

      // 监听选中态变化
      const observer = new MutationObserver(() => {
        updateSkuActiveState();
      });
      observer.observe(section, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: true,
      });

      // 定时轮询兜底
      setInterval(updateSkuActiveState, 1000);
    }

    tryInitSkuPanel();

    // ══════════════════════════════════════════════════════════
    // ██ 左侧模块导航面板（仅 DJI Store 产品页）
    // ══════════════════════════════════════════════════════════

    console.log('[DJI 模块导航] 产品页检测到，启动模块导航面板');

    // ── 模块配置（中文标签固定，选择器跨语种稳定）──────────
    const MODULE_MAP = [
      { label: '产品概览', selector: '[data-test-locator="sectionProductOverview"]', fallback: '#product-container' },
      { label: '套装选择', selector: '[data-test-locator="sectionProductComboPools"]', fallback: '#anchorSelectoption' },
      { label: '深入了解', selector: '[data-test-locator="sectionSellingPoint"]', fallback: '#anchorCloserlook' },
      { label: '包装清单', selector: '[data-test-locator="sectionInTheBox"]', fallback: '#anchorBox' },
      { label: '场景展示', selector: '#sectionProductImages', fallback: '[class*="userWorks__user-works"]' },
      { label: '产品对比', selector: '#ProductContrast', fallback: '[class*="product-contrast-module"]' },
      { label: 'FAQ',     selector: '[data-test-locator="sectionProductFAQ"]', fallback: '#faq-module' },
      { label: '脚注',    selector: '[data-test-locator="sectionProductFootNote"]', fallback: null },
    ];

    // ── 模块导航面板样式 ─────────────────────────────────
    const modStyle = document.createElement('style');
    modStyle.textContent = `
      #dji-mod-panel {
        position: fixed;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 6px 8px 8px 8px;
        background: rgba(18, 18, 28, 0.93);
        border-radius: 0 14px 14px 0;
        box-shadow: 4px 0 24px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);
        transition: transform 0.25s cubic-bezier(.4,0,.2,1);
        user-select: none;
        max-height: 80vh;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.2) transparent;
      }

      #dji-mod-panel.collapsed {
        transform: translateY(-50%) translateX(calc(-100%));
      }

      #dji-mod-tab {
        position: fixed;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        z-index: 999998;
        width: 20px;
        height: 56px;
        background: rgba(18, 18, 28, 0.93);
        border-radius: 0 8px 8px 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: rgba(255,255,255,0.8);
        box-shadow: 3px 0 10px rgba(0,0,0,0.4);
        transition: color 0.15s, left 0.25s cubic-bezier(.4,0,.2,1);
      }

      #dji-mod-tab:hover {
        color: #fff;
      }

      #dji-mod-panel .mod-title {
        font-size: 10px;
        font-weight: 700;
        color: rgba(255,255,255,0.5);
        letter-spacing: 1px;
        padding: 0 4px 4px 4px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 2px;
        white-space: nowrap;
      }

      .dji-mod-btn {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        width: 120px;
        min-height: 30px;
        padding: 4px 8px;
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: rgba(255,255,255,0.7);
        background: rgba(255,255,255,0.06);
        transition: all 0.2s;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        text-align: left;
        line-height: 1.3;
      }

      .dji-mod-btn:hover {
        background: rgba(255,255,255,0.15);
        color: #fff;
        transform: scale(1.03);
      }

      .dji-mod-btn.active {
        border-color: rgba(56, 189, 248, 0.8);
        background: rgba(56, 189, 248, 0.15);
        color: #fff;
        box-shadow: 0 2px 10px rgba(56,189,248,0.25);
      }

      .dji-mod-btn .mod-index {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: rgba(255,255,255,0.6);
      }

      .dji-mod-btn.active .mod-index {
        background: rgba(56, 189, 248, 0.5);
        color: #fff;
      }

      .dji-mod-btn .mod-label {
        flex: 1;
      }
    `;
    document.head.appendChild(modStyle);

    // ── 模块导航面板构建 ─────────────────────────────────
    const modPanel = document.createElement('div');
    modPanel.id = 'dji-mod-panel';

    const modTab = document.createElement('div');
    modTab.id = 'dji-mod-tab';
    modTab.title = '收起/展开模块导航';
    modTab.textContent = '▶';

    let modCollapsed = false;
    modTab.addEventListener('click', () => {
      modCollapsed = !modCollapsed;
      if (modCollapsed) {
        modPanel.style.transform = 'translateY(-50%) translateX(-100%)';
        modTab.style.left = '0px';
        modTab.textContent = '▶';
      } else {
        modPanel.style.transform = 'translateY(-50%)';
        modTab.style.left = modPanel.offsetWidth + 'px';
        modTab.textContent = '◀';
      }
    });

    function updateModTabPosition() {
      if (!modCollapsed) {
        modTab.style.left = modPanel.offsetWidth + 'px';
      }
    }

    // ── 左侧拖拽函数（与右侧镜像）─────────────────────
    function makeDraggableLeft(panelEl, tabEl, getCollapsedFn) {
      let isDragging = false;
      let startMouseY = 0;
      let startTop = 0;

      const handle = document.createElement('div');
      handle.className = 'dji-drag-handle';
      handle.textContent = '⋮⋮⋮';
      handle.title = '拖拽移动面板';
      panelEl.insertBefore(handle, panelEl.firstChild);

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        startMouseY = e.clientY;
        const rect = panelEl.getBoundingClientRect();
        startTop = rect.top;
        panelEl.style.transform = getCollapsedFn() ? 'translateX(-100%)' : 'none';
        panelEl.style.top = startTop + 'px';
        tabEl.style.transform = 'none';
        tabEl.style.top = startTop + 'px';
        document.body.style.cursor = 'grabbing';
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startMouseY;
        let newTop = startTop + deltaY;
        newTop = Math.max(10, Math.min(window.innerHeight - 60, newTop));
        panelEl.style.top = newTop + 'px';
        tabEl.style.top = newTop + 'px';
      });

      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = '';
      });

      return handle;
    }

    // ── 模块检测：查找页面上实际存在的模块 ───────────────
    let activeModules = [];     // { label, el, btn }
    let modObserver = null;     // IntersectionObserver 实例
    let modButtons = [];        // 所有按钮引用

    function findModuleEl(modConfig) {
      return document.querySelector(modConfig.selector) ||
             (modConfig.fallback ? document.querySelector(modConfig.fallback) : null);
    }

    function scanModules() {
      const found = [];
      MODULE_MAP.forEach((mod) => {
        const el = findModuleEl(mod);
        if (el) {
          found.push({ label: mod.label, el: el, selector: mod.selector, fallback: mod.fallback });
        }
      });
      return found;
    }

    // ── 渲染模块导航按钮 ─────────────────────────────────
    function renderModPanel(modules) {
      // 保留拖拽手柄
      const existingHandle = modPanel.querySelector('.dji-drag-handle');
      modPanel.innerHTML = '';
      if (existingHandle) modPanel.appendChild(existingHandle);

      modButtons = [];

      // 标题
      const title = document.createElement('div');
      title.className = 'mod-title';
      title.textContent = '模块导航';
      modPanel.appendChild(title);

      modules.forEach((mod, i) => {
        const btn = document.createElement('button');
        btn.className = 'dji-mod-btn';
        btn.title = mod.label;

        const index = document.createElement('span');
        index.className = 'mod-index';
        index.textContent = String(i + 1);

        const label = document.createElement('span');
        label.className = 'mod-label';
        label.textContent = mod.label;

        btn.appendChild(index);
        btn.appendChild(label);

        // 点击跳转（带标记防止被 scroll 劫持）
        btn.addEventListener('click', () => {
          mod.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        modPanel.appendChild(btn);
        modButtons.push({ btn, el: mod.el, selector: mod.selector, fallback: mod.fallback });
      });

      activeModules = modules;
    }

    // ── IntersectionObserver 滚动高亮 ────────────────────
    function setupScrollHighlight() {
      // 清理旧 observer
      if (modObserver) {
        modObserver.disconnect();
        modObserver = null;
      }
      if (modButtons.length === 0) return;

      // 用 Map 记录各模块的可见比例
      const visibleMap = new Map();

      modObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          visibleMap.set(entry.target, entry.intersectionRatio);
        });

        // 找到当前视口中最靠近顶部的可见模块
        let bestBtn = null;
        let bestTop = Infinity;
        let bestSelector = null;

        modButtons.forEach(({ btn, el, selector, fallback }) => {
          const ratio = visibleMap.get(el) || 0;
          if (ratio > 0) {
            const rect = el.getBoundingClientRect();
            // 优先选最靠近视口顶部的
            if (Math.abs(rect.top) < bestTop) {
              bestTop = Math.abs(rect.top);
              bestBtn = btn;
              bestSelector = selector || fallback;
            }
          }
        });

        // 更新高亮
        modButtons.forEach(({ btn }) => btn.classList.remove('active'));
        if (bestBtn) bestBtn.classList.add('active');
        // 同步到顶层变量，供 switchTo 读取
        _currentModSelector = bestSelector;
      }, {
        threshold: [0, 0.1, 0.25, 0.5],
        rootMargin: '0px 0px -30% 0px',
      });

      modButtons.forEach(({ el }) => modObserver.observe(el));
    }

    // ── SKU 切换后刷新模块检测 ───────────────────────────
    function refreshModules() {
      console.log('[DJI 模块导航] 刷新模块检测...');
      const modules = scanModules();
      renderModPanel(modules);
      setupScrollHighlight();
      requestAnimationFrame(() => updateModTabPosition());
      console.log('[DJI 模块导航] 检测到 ' + modules.length + ' 个模块：' +
        modules.map(m => m.label).join(', '));
    }

    // ── 监听 SKU 切换 ────────────────────────────────────
    function watchSkuChanges() {
      const comboSection = document.querySelector('[data-test-locator="sectionProductComboPools"]');
      if (!comboSection) return;

      // 监听 SKU 区域的点击（SKU 切换）
      comboSection.addEventListener('click', (e) => {
        const item = e.target.closest('li[id^="accessory-item-"]');
        if (!item) return;
        // SKU 切换后 React 重新渲染需要时间，延迟刷新
        setTimeout(refreshModules, 2000);
      });

      // 也监听面板上的 SKU 按钮点击
      if (document.getElementById('dji-sku-panel')) {
        document.getElementById('dji-sku-panel').addEventListener('click', (e) => {
          const btn = e.target.closest('.dji-sku-btn');
          if (!btn) return;
          setTimeout(refreshModules, 2000);
        });
      }
    }

    // ── 等待页面模块加载后初始化 ─────────────────────────
    let modInitAttempts = 0;
    const modMaxAttempts = 30; // 最多等 15 秒

    function tryInitModPanel() {
      modInitAttempts++;
      // 至少等到"产品概览"模块出现
      const overview = document.querySelector('[data-test-locator="sectionProductOverview"]') ||
                       document.querySelector('#product-container');
      if (!overview) {
        if (modInitAttempts < modMaxAttempts) {
          setTimeout(tryInitModPanel, 500);
        } else {
          console.log('[DJI 模块导航] 未检测到产品概览模块，放弃');
        }
        return;
      }

      // 再等一会让其他模块加载（hydration-on-demand 延迟加载）
      setTimeout(() => {
        const modules = scanModules();
        if (modules.length === 0) {
          console.log('[DJI 模块导航] 未检测到任何模块，放弃');
          return;
        }

        console.log('[DJI 模块导航] 检测到 ' + modules.length + ' 个模块：' +
          modules.map(m => m.label).join(', '));

        renderModPanel(modules);

        // 拖拽
        makeDraggableLeft(modPanel, modTab, () => modCollapsed);

        document.body.appendChild(modTab);
        document.body.appendChild(modPanel);

        requestAnimationFrame(() => updateModTabPosition());

        // 启动滚动高亮
        setupScrollHighlight();

        // 监听 SKU 切换
        watchSkuChanges();

        // 兜底：每 5 秒检查一次是否有新模块被懒加载进来
        let lastModCount = modules.length;
        setInterval(() => {
          const current = scanModules();
          if (current.length !== lastModCount) {
            lastModCount = current.length;
            refreshModules();
          }
        }, 5000);
      }, 1500);
    }

    tryInitModPanel();

    // ══════════════════════════════════════════════════════════
    // ██ 语种切换后状态恢复（SKU + 模块位置）
    // ══════════════════════════════════════════════════════════

    (function tryRestoreLangSwitchState() {
      let stateJson;
      try {
        stateJson = sessionStorage.getItem('dji-lang-switch-state');
        sessionStorage.removeItem('dji-lang-switch-state');
      } catch (e) { return; }
      if (!stateJson) return;

      let state;
      try { state = JSON.parse(stateJson); } catch (e) { return; }

      // 超过 15 秒的数据视为过期
      if (!state.timestamp || Date.now() - state.timestamp > 15000) {
        console.log('[DJI 状态恢复] 状态已过期，跳过');
        return;
      }

      console.log('[DJI 状态恢复] 检测到切换状态 vid=' + state.vid + ' module=' + state.moduleSelector +
        (state.skipSkuRestore ? ' (SKU已通过URL恢复)' : ''));

      const savedVid = state.vid;
      const savedModSelector = state.moduleSelector;
      const skipSkuRestore = !!state.skipSkuRestore;

      // ── 步骤 1：恢复 SKU 选中 ───────────────────────────
      function restoreSku() {
        return new Promise((resolve) => {
          // 如果是 SKU URL 导航过来的，URL 已包含正确 vid，无需再恢复
          if (skipSkuRestore || !savedVid) { resolve(); return; }

          let attempts = 0;
          const maxAttempts = 20; // 最多等 10 秒

          function tryRestore() {
            attempts++;
            const targetLi = document.querySelector('li#accessory-item-' + savedVid);
            if (!targetLi) {
              if (attempts < maxAttempts) {
                setTimeout(tryRestore, 500);
              } else {
                console.log('[DJI 状态恢复] 目标 SKU vid=' + savedVid + ' 不存在于当前语种，跳过');
                resolve();
              }
              return;
            }

            // 检查是否已经是选中状态
            const wrapper = targetLi.querySelector('div[class*="new-combo-wrapper___"]');
            const alreadySelected = wrapper && getComputedStyle(wrapper).borderColor.includes('0, 96, 239');
            if (alreadySelected) {
              console.log('[DJI 状态恢复] SKU vid=' + savedVid + ' 已是选中状态');
              resolve();
              return;
            }

            // 模拟点击（复用 scroll 劫持逻辑）
            const input = targetLi.querySelector('input[type="radio"]');
            if (!input) {
              console.log('[DJI 状态恢复] 未找到 SKU radio input，跳过');
              resolve();
              return;
            }

            console.log('[DJI 状态恢复] 正在恢复 SKU vid=' + savedVid);
            const origSIV = Element.prototype.scrollIntoView;
            const origSTo = window.scrollTo;
            const origScr = window.scroll;
            Element.prototype.scrollIntoView = function() {};
            window.scrollTo = function() {};
            window.scroll = function() {};
            input.click();
            setTimeout(() => {
              Element.prototype.scrollIntoView = origSIV;
              window.scrollTo = origSTo;
              window.scroll = origScr;
              // SKU 切换后等 React 重渲染
              setTimeout(resolve, 1500);
            }, 50);
          }

          tryRestore();
        });
      }

      // ── 步骤 2：恢复模块滚动位置 ──────────────────────────
      function restoreModule() {
        if (!savedModSelector) {
          console.log('[DJI 状态恢复] 无模块位置需要恢复');
          return;
        }

        // 等待一小段时间让 DOM 完全就绪
        let attempts = 0;
        const maxAttempts = 20;

        function tryScroll() {
          attempts++;
          const target = document.querySelector(savedModSelector);
          if (!target) {
            if (attempts < maxAttempts) {
              setTimeout(tryScroll, 500);
            } else {
              console.log('[DJI 状态恢复] 模块 ' + savedModSelector + ' 未找到，跳过');
            }
            return;
          }

          console.log('[DJI 状态恢复] 正在滚动到模块 ' + savedModSelector);
          // 用 auto（无动画）快速定位，避免用户看到从顶部滚下来的过程
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }

        tryScroll();
      }

      // ── 执行恢复流程：先 SKU，再模块位置 ───────────────────
      restoreSku().then(() => {
        // SKU URL 导航过来时，等页面 hydration 完成后再滚动
        const delay = skipSkuRestore ? 2000 : 0;
        setTimeout(() => restoreModule(), delay);
      });
    })();
  }

  // ── MKT 后台弹窗语种快选功能 ─────────────────────────────
  function initMktLangSelector() {
    // 语种配置：value 对应 checkbox 的 value 属性
    const MKT_LANGS = [
      { label: 'English',   value: 'en',    gradient: 'linear-gradient(135deg, #34d399, #06b6d4)' },
      { label: '中文',      value: 'zh-CN', gradient: 'linear-gradient(135deg, #f6a623, #f97316)' },
      { label: '繁體中文',  value: 'zh-TW', gradient: 'linear-gradient(135deg, #a78bfa, #ec4899)' },
      { label: '日本语',    value: 'ja',    gradient: 'linear-gradient(135deg, #f472b6, #fb7185)' },
      { label: 'Deutsch',   value: 'de',    gradient: 'linear-gradient(135deg, #fb923c, #f97316)' },
      { label: 'Français',  value: 'fr',    gradient: 'linear-gradient(135deg, #38bdf8, #06b6d4)' },
      { label: '한국어',    value: 'ko',    gradient: 'linear-gradient(135deg, #818cf8, #6366f1)' },
      { label: 'español',   value: 'es',    gradient: 'linear-gradient(135deg, #f87171, #fb923c)' },
      { label: 'Italiano',  value: 'it',    gradient: 'linear-gradient(135deg, #4ade80, #34d399)' },
    ];

    // 注入样式
    const style = document.createElement('style');
    style.textContent = `
      #mkt-lang-panel {
        position: fixed;
        left: 6px;
        top: 100px;
        z-index: 999999;
        display: none;
        flex-direction: column;
        gap: 6px;
        padding: 10px 8px;
        background: rgba(18, 18, 28, 0.93);
        border-radius: 12px;
        box-shadow: 4px 0 24px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);
        user-select: none;
      }

      #mkt-lang-panel.visible {
        display: flex;
      }

      .mkt-lang-btn {
        width: 120px;
        height: 40px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        padding: 0 12px;
        gap: 6px;
        transition: transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        white-space: nowrap;
      }

      .mkt-lang-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 5px 18px rgba(0,0,0,0.45);
      }

      .mkt-lang-btn .mkt-star {
        font-size: 14px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);

    // 构建面板
    const panel = document.createElement('div');
    panel.id = 'mkt-lang-panel';

    MKT_LANGS.forEach((lang) => {
      const btn = document.createElement('button');
      btn.className = 'mkt-lang-btn';
      btn.style.background = lang.gradient;
      btn.innerHTML = '<span class="mkt-star">⭐</span>' + lang.label;
      btn.title = '只选 ' + lang.label;

      btn.addEventListener('click', () => {
        selectOnlyLang(lang.value);
      });

      panel.appendChild(btn);
    });

    document.body.appendChild(panel);

    // 只勾选指定语种：先取消所有已勾选的，再勾选目标
    function selectOnlyLang(targetValue) {
      const modal = document.querySelector('.modal.fade.in');
      if (!modal) return;

      const labels = modal.querySelectorAll('label.col-md-3');
      labels.forEach((label) => {
        const cb = label.querySelector('input[type="checkbox"]');
        if (!cb) return;

        if (cb.value === targetValue) {
          // 目标语种：确保勾选
          if (!cb.checked) label.click();
        } else {
          // 非目标语种：确保取消
          if (cb.checked) label.click();
        }
      });
    }

    // 监听弹窗出现/消失，控制面板显隐
    // 用定时轮询代替 MutationObserver，避免 observer 回调触发 DOM 变化导致无限循环
    let mktPanelVisible = false;
    setInterval(() => {
      const modal = document.querySelector('.modal.fade.in');
      const hasLangCheckbox = modal && modal.querySelector('label.col-md-3 input[type="checkbox"]');

      if (hasLangCheckbox && !mktPanelVisible) {
        panel.classList.add('visible');
        mktPanelVisible = true;
      } else if (!hasLangCheckbox && mktPanelVisible) {
        panel.classList.remove('visible');
        mktPanelVisible = false;
      }
    }, 300);
  }
})();
