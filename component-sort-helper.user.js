// ==UserScript==
// @name         组件排序助手 (Component Sort Helper)
// @namespace    https://dji.com/tools
// @version      3.0.0
// @description  在 Terminator 后台可视化拖动组件排序，直接操控 Vue 数据层实时更新页面
// @author       DJI Tools
// @match        https://terminator.djiits.com/projects/*/pages/update/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      stag-www-reactor.dbeta.me
// @connect      www-reactor.dji.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // 1. 常量与配置
  // ============================================================
  const PANEL_WIDTH = 480;
  const PANEL_ID = 'csh-panel';
  const STORAGE_PREFIX = 'csh_';

  const TYPE_LABEL = {
    infoCardVertical: '垂直卡片',
    infoCardHorizontal: '水平卡片',
    infoCardGallery: 'Gallery',
    cardGallery: 'Gallery',
    hg703SetStyle: '全局样式',
  };

  function normalizeType(t) {
    if (t === 'cardGallery') return 'infoCardGallery';
    return t;
  }

  // ============================================================
  // 2. 数据采集 — 从 Vue dragable-container 直接读取（PC 端）
  // ============================================================
  function getVueList() {
    const container = document.querySelector('.dragable-container');
    if (!container) return null;
    const vue = container.__vue__;
    if (!vue) return null;
    return vue.$props.list || vue.list || null;
  }

  function collectTerminatorComponents() {
    const list = getVueList();
    if (!list || list.length === 0) return [];

    return list.map((item, i) => ({
      seq: i,
      vueId: item.id,
      rankRow: item.rank_row,
      slug: item.slug,
      coverUrl: item.cover_url || '',
      isDiscard: item.is_discard,
      typeName: item.slug,
      terminatorId: String(item.id),
      tagLabel: `${i} ${item.slug} - ${item.id}`,
    }));
  }

  // ============================================================
  // 3. 数据采集 — 编辑后台（跨域 GM_xmlhttpRequest）
  // ============================================================
  function fetchEditorComponents(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        withCredentials: true,
        onload: function (response) {
          if (response.status !== 200) {
            reject(new Error('编辑后台返回状态码: ' + response.status));
            return;
          }
          const parser = new DOMParser();
          const doc = parser.parseFromString(response.responseText, 'text/html');
          const comps = doc.querySelectorAll('[class*="edit-component"]');
          const result = [];

          comps.forEach((el, i) => {
            const prev = el.previousElementSibling;
            const barText = prev ? prev.textContent.trim() : '';
            const fullText = el.textContent || '';

            let seq = i, chineseName = '', typeName = '', editorId = '';

            const nameMatch = barText.match(
              /(\d+)\s*(.*?)\s*-\s*(infoCard\w+|cardGallery|hg\d+\w+)-(\d+)/
            );
            if (nameMatch) {
              seq = parseInt(nameMatch[1], 10);
              chineseName = nameMatch[2].trim();
              typeName = nameMatch[3];
              editorId = nameMatch[4];
            } else {
              const simpleMatch = barText.match(
                /(\d+)\s*(infoCard\w+|cardGallery|hg\d+\w+)-(\d+)/
              );
              if (simpleMatch) {
                seq = parseInt(simpleMatch[1], 10);
                typeName = simpleMatch[2];
                editorId = simpleMatch[3];
                chineseName = TYPE_LABEL[typeName] || typeName;
              }
            }

            let preview = fullText
              .replace(/div\[id=["']?\d+["']?\][^}]*\{[^}]*\}/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 60);

            result.push({ seq, chineseName: chineseName || TYPE_LABEL[typeName] || typeName, typeName, editorId, preview });
          });

          resolve(result);
        },
        onerror: function (err) {
          reject(new Error('请求编辑后台失败: ' + (err.error || '未知错误')));
        },
      });
    });
  }

  // ============================================================
  // 4. 数据映射 — 按序号对齐
  // ============================================================
  function buildMapping(terminatorComps, editorComps) {
    const mapped = [];
    const maxLen = Math.max(terminatorComps.length, editorComps.length);
    for (let i = 0; i < maxLen; i++) {
      const t = terminatorComps[i] || null;
      const e = editorComps[i] || null;

      let productName = '';
      if (e) productName = e.preview || e.chineseName || '';

      const typeName = t ? t.typeName : e ? normalizeType(e.typeName) : '?';
      const typeLabel = TYPE_LABEL[typeName] || TYPE_LABEL[normalizeType(typeName)] || typeName;

      mapped.push({
        seq: i,
        terminator: t,
        editor: e,
        productName,
        typeName,
        typeLabel,
        terminatorId: t ? t.terminatorId : null,
        vueId: t ? t.vueId : null,
        coverUrl: t ? t.coverUrl : '',
        tagLabel: t ? t.tagLabel : `${i} ${typeName} - ?`,
      });
    }
    return mapped;
  }

  // ============================================================
  // 5. 分区检测
  // ============================================================
  function detectSections(mappedItems) {
    const sections = [];
    let currentSection = { title: '页面顶部', items: [] };

    mappedItems.forEach((item) => {
      const isVertical = item.typeName === 'infoCardVertical';
      if (isVertical && currentSection.items.length > 0) {
        sections.push(currentSection);
        currentSection = { title: item.productName || item.typeLabel, items: [item] };
      } else {
        currentSection.items.push(item);
      }
    });
    if (currentSection.items.length > 0) sections.push(currentSection);
    return sections;
  }

  // ============================================================
  // 6. 直接操控 Vue 数据层 — 核心功能
  // ============================================================
  function applyToVue(state) {
    const list = getVueList();
    if (!list) {
      alert('无法找到 Vue 组件列表，请确认在「页面结构配置」tab');
      return false;
    }

    // 根据 currentOrder 构建新的数组顺序
    // currentOrder 存的是 seq（原始序号），需要找到对应的 vueId
    const newItems = state.currentOrder.map((seq) => {
      const mapped = state.mappedItems.find((m) => m.seq === seq);
      if (!mapped || !mapped.vueId) return null;
      // 在当前 Vue list 中找到对应的数据对象
      return list.find((item) => item.id === mapped.vueId);
    }).filter(Boolean);

    if (newItems.length !== list.length) {
      alert(`数据不一致：期望 ${list.length} 个组件，实际匹配 ${newItems.length} 个。操作取消。`);
      return false;
    }

    // 用 splice 清空并重新填充（保持 Vue 响应式追踪）
    list.splice(0, list.length, ...newItems);

    // 更新每个元素的 rank_row
    list.forEach((item, i) => {
      item.rank_row = i;
    });

    return true;
  }

  // ============================================================
  // 7. 差异计算
  // ============================================================
  function computeDiff(originalOrder, newOrder) {
    const targetTable = newOrder.map((newSeq, newPos) => {
      const origPos = originalOrder.indexOf(newSeq);
      return { newPos, origPos, seq: newSeq, moved: newPos !== origPos };
    });

    const steps = [];
    const working = [...originalOrder];

    for (let targetPos = 0; targetPos < newOrder.length; targetPos++) {
      const desiredSeq = newOrder[targetPos];
      const currentPos = working.indexOf(desiredSeq);
      if (currentPos === targetPos) continue;

      const item = working.splice(currentPos, 1)[0];
      working.splice(targetPos, 0, item);

      let dropTargetSeq, dropRelation;
      if (targetPos < working.length - 1) {
        dropTargetSeq = working[targetPos + 1];
        dropRelation = '上方';
      } else {
        dropTargetSeq = working[targetPos - 1];
        dropRelation = '下方';
      }

      steps.push({ fromPos: currentPos, toPos: targetPos, seq: desiredSeq, dropTargetSeq, dropRelation });
    }

    return { targetTable, steps };
  }

  // ============================================================
  // 8. 生成操作指令
  // ============================================================
  function generateInstructions(state) {
    const diff = computeDiff(state.originalOrder, state.currentOrder);
    const items = state.mappedItems;

    function getItem(seq) { return items.find((m) => m.seq === seq); }

    function describeForTerminator(item) {
      if (!item) return '(未知)';
      const tag = item.tagLabel || '? - ?';
      const name = item.productName ? ` -> ${truncate(item.productName, 30)}` : '';
      return `「${tag}」${name}`;
    }

    let output = '';

    output += '=== 最终目标顺序 ===\n\n';
    diff.targetTable.forEach((row) => {
      const item = getItem(row.seq);
      const tag = item ? item.tagLabel : '?';
      const name = item && item.productName ? truncate(item.productName, 30) : '';
      const arrow = row.moved ? (row.newPos < row.origPos ? ' ↑' : ' ↓') : '';
      const marker = row.moved ? ' ← 移动了' : '';
      output += `位置${padNum(row.newPos)}: 「${tag}」`;
      if (name) output += ` ${name}`;
      if (arrow) output += `${arrow}${marker}`;
      output += '\n';
    });

    if (diff.steps.length > 0) {
      output += '\n=== Terminator 逐步操作指令 ===\n\n';
      diff.steps.forEach((step, i) => {
        const dragItem = getItem(step.seq);
        const dropItem = getItem(step.dropTargetSeq);
        output += `Step ${i + 1}:\n`;
        output += `  找到: ${describeForTerminator(dragItem)}\n`;
        output += `  拖到: ${describeForTerminator(dropItem)} 的${step.dropRelation}\n\n`;
      });
    } else {
      output += '\n没有需要移动的组件\n';
    }

    return output;
  }

  // ============================================================
  // 9. UI — 注入样式
  // ============================================================
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 60px;
        right: 20px;
        width: ${PANEL_WIDTH}px;
        max-height: calc(100vh - 80px);
        background: #fff;
        border: 1px solid #d0d5dd;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #${PANEL_ID}.csh-collapsed {
        width: 220px;
        max-height: 44px;
      }
      #${PANEL_ID}.csh-collapsed .csh-body,
      #${PANEL_ID}.csh-collapsed .csh-toolbar,
      #${PANEL_ID}.csh-collapsed .csh-output,
      #${PANEL_ID}.csh-collapsed .csh-search-box,
      #${PANEL_ID}.csh-collapsed .csh-change-count,
      #${PANEL_ID}.csh-collapsed .csh-alert {
        display: none !important;
      }
      .csh-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #1a73e8;
        color: #fff;
        cursor: move;
        user-select: none;
        border-radius: 12px 12px 0 0;
        flex-shrink: 0;
      }
      #${PANEL_ID}.csh-collapsed .csh-header {
        border-radius: 12px;
      }
      .csh-header-title { font-weight: 600; font-size: 14px; }
      .csh-header-btns button {
        background: none; border: none; color: #fff; font-size: 16px;
        cursor: pointer; margin-left: 6px; padding: 2px 6px; border-radius: 4px;
      }
      .csh-header-btns button:hover { background: rgba(255,255,255,0.2); }
      .csh-alert {
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 500;
        flex-shrink: 0;
        display: none;
      }
      .csh-alert-warning {
        background: #fef3c7;
        color: #92400e;
        border-bottom: 1px solid #fbbf24;
      }
      .csh-alert-success {
        background: #d1fae5;
        color: #065f46;
        border-bottom: 1px solid #6ee7b7;
      }
      .csh-toolbar {
        padding: 10px 14px;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
      }
      .csh-toolbar-row {
        display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
      }
      .csh-toolbar-row:last-child { margin-bottom: 0; }
      .csh-toolbar input[type="text"] {
        flex: 1; padding: 6px 10px; border: 1px solid #d0d5dd;
        border-radius: 6px; font-size: 12px; outline: none;
      }
      .csh-toolbar input[type="text"]:focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26,115,232,0.15);
      }
      .csh-toolbar input.csh-input-hint {
        border-color: #f59e0b;
        box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
      }
      .csh-btn {
        padding: 6px 14px; border: none; border-radius: 6px;
        cursor: pointer; font-size: 12px; font-weight: 500; white-space: nowrap;
      }
      .csh-btn-primary { background: #1a73e8; color: #fff; }
      .csh-btn-primary:hover { background: #1557b0; }
      .csh-btn-secondary { background: #f0f0f0; color: #333; }
      .csh-btn-secondary:hover { background: #e0e0e0; }
      .csh-btn-success { background: #16a34a; color: #fff; }
      .csh-btn-success:hover { background: #15803d; }
      .csh-btn-danger {
        background: #dc2626; color: #fff;
      }
      .csh-btn-danger:hover { background: #b91c1c; }
      .csh-btn-apply {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff; font-weight: 600;
      }
      .csh-btn-apply:hover {
        background: linear-gradient(135deg, #d97706, #b45309);
      }
      .csh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .csh-status { font-size: 12px; color: #666; padding: 4px 0; }
      .csh-status.success { color: #16a34a; }
      .csh-status.error { color: #dc2626; }
      .csh-view-toggle { display: flex; gap: 4px; }
      .csh-view-btn {
        padding: 4px 10px; border: 1px solid #d0d5dd; background: #fff;
        border-radius: 4px; cursor: pointer; font-size: 11px; color: #555;
      }
      .csh-view-btn.active { background: #1a73e8; color: #fff; border-color: #1a73e8; }
      .csh-body {
        flex: 1; overflow-y: auto; padding: 6px 0;
        min-height: 100px; max-height: calc(100vh - 420px);
      }
      .csh-section-title {
        padding: 6px 14px 4px; font-size: 11px; font-weight: 600;
        color: #1a73e8; letter-spacing: 0.5px;
        border-top: 1px solid #e5e7eb; margin-top: 4px; background: #f8faff;
      }
      .csh-section-title:first-child { border-top: none; margin-top: 0; }
      .csh-item {
        display: flex; align-items: center; padding: 4px 10px; gap: 6px;
        cursor: grab; border-bottom: 1px solid #f3f4f6;
        transition: background 0.15s; user-select: none;
      }
      .csh-item:hover { background: #f0f7ff; }
      .csh-item.dragging { opacity: 0.4; background: #e0e7ef; }
      .csh-item.drag-over { border-top: 3px solid #1a73e8; padding-top: 1px; }
      .csh-item.drag-over-below { border-bottom: 3px solid #1a73e8; padding-bottom: 1px; }
      .csh-item.moved-up { background: #ecfdf5; }
      .csh-item.moved-down { background: #fef3c7; }
      .csh-drag-handle { color: #bbb; cursor: grab; font-size: 12px; flex-shrink: 0; width: 14px; }
      .csh-item-thumb {
        width: 32px; height: 32px; border-radius: 4px; object-fit: cover;
        flex-shrink: 0; background: #f3f4f6;
      }
      .csh-item-seq {
        background: #e5e7eb; color: #555; border-radius: 4px;
        padding: 1px 5px; font-size: 10px; font-weight: 600;
        min-width: 20px; text-align: center; flex-shrink: 0;
      }
      .csh-item-seq.changed { background: #fbbf24; color: #78350f; }
      .csh-item-type {
        font-size: 9px; padding: 1px 5px; border-radius: 3px;
        flex-shrink: 0; font-weight: 500;
      }
      .csh-type-vertical { background: #dbeafe; color: #1e40af; }
      .csh-type-horizontal { background: #d1fae5; color: #065f46; }
      .csh-type-gallery { background: #fce7f3; color: #9d174d; }
      .csh-type-style { background: #e5e7eb; color: #374151; }
      .csh-item-name {
        flex: 1; overflow: hidden; text-overflow: ellipsis;
        white-space: nowrap; font-size: 12px; color: #333;
      }
      .csh-item-name.csh-no-product {
        color: #aaa; font-style: italic;
      }
      .csh-item-tid { font-size: 9px; color: #999; flex-shrink: 0; font-family: monospace; }
      .csh-change-count {
        padding: 8px 14px; font-size: 12px; color: #666;
        border-top: 1px solid #e5e7eb;
        display: flex; align-items: center; justify-content: space-between;
        gap: 6px; flex-shrink: 0; flex-wrap: wrap;
      }
      .csh-change-badge {
        background: #fbbf24; color: #78350f; padding: 2px 8px;
        border-radius: 10px; font-weight: 600; font-size: 11px;
      }
      .csh-change-actions {
        display: flex; gap: 6px; align-items: center;
      }
      .csh-output {
        border-top: 1px solid #e5e7eb; max-height: 250px;
        overflow-y: auto; flex-shrink: 0;
      }
      .csh-output-content {
        padding: 10px 14px; font-size: 11px; line-height: 1.5;
        white-space: pre-wrap; font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
        color: #333; background: #fafafa;
      }
      .csh-output-header {
        padding: 8px 14px; display: flex; align-items: center;
        justify-content: space-between; background: #f9fafb; border-top: 1px solid #e5e7eb;
      }
      .csh-output-title { font-weight: 600; font-size: 13px; color: #333; }
      .csh-search-box {
        padding: 6px 14px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
      }
      .csh-search-box input {
        width: 100%; padding: 5px 8px; border: 1px solid #d0d5dd;
        border-radius: 4px; font-size: 12px; outline: none; box-sizing: border-box;
      }
      .csh-search-box input:focus { border-color: #1a73e8; }
      .csh-empty {
        padding: 30px 14px; text-align: center; color: #999;
        font-size: 13px; line-height: 1.8;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // 10. UI — 创建浮动面板
  // ============================================================
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const pageId = getPageId();
    const savedUrl = GM_getValue(STORAGE_PREFIX + 'editor_' + pageId, '');

    panel.innerHTML = `
      <div class="csh-header">
        <span class="csh-header-title">组件排序助手 v3</span>
        <span class="csh-header-btns">
          <button id="csh-btn-undo" title="撤销 (Ctrl+Z)">↩</button>
          <button id="csh-btn-reset" title="重置排序">⟲</button>
          <button id="csh-btn-collapse" title="折叠/展开">−</button>
        </span>
      </div>
      <div class="csh-alert csh-alert-warning" id="csh-alert">
        已应用排序到页面！请点击下方「保存草稿」按钮保存更改。
      </div>
      <div class="csh-toolbar">
        <div class="csh-toolbar-row">
          <input type="text" id="csh-editor-url"
            class="${savedUrl ? '' : 'csh-input-hint'}"
            placeholder="粘贴编辑后台 URL 获取产品名（可选）"
            value="${savedUrl}" />
          <button class="csh-btn csh-btn-primary" id="csh-btn-link">关联</button>
        </div>
        <div class="csh-toolbar-row">
          <button class="csh-btn csh-btn-secondary" id="csh-btn-refresh">刷新组件</button>
          <div class="csh-view-toggle">
            <button class="csh-view-btn active" data-view="all">整体</button>
            <button class="csh-view-btn" data-view="section">分区</button>
          </div>
        </div>
        <div class="csh-status" id="csh-status">点击「刷新组件」从 Vue 数据层读取组件</div>
      </div>
      <div class="csh-search-box">
        <input type="text" id="csh-search" placeholder="搜索组件名 / ID..." />
      </div>
      <div class="csh-body" id="csh-body">
        <div class="csh-empty">
          使用步骤：<br/>
          1. 确认在「页面结构配置」tab<br/>
          2. 点击「刷新组件」读取组件<br/>
          3. 粘贴编辑后台 URL 并「关联」获取产品名（可选）<br/>
          4. 拖动组件调整顺序<br/>
          5. 点击「应用排序」直接更新页面<br/>
          6. 点击页面下方「保存草稿」按钮保存
        </div>
      </div>
      <div class="csh-change-count" id="csh-change-bar" style="display:none">
        <span>变更: <span class="csh-change-badge" id="csh-change-num">0</span> 处</span>
        <div class="csh-change-actions">
          <button class="csh-btn csh-btn-secondary" id="csh-btn-generate">生成指令</button>
          <button class="csh-btn csh-btn-apply" id="csh-btn-apply">⚡ 应用排序</button>
        </div>
      </div>
      <div class="csh-output" id="csh-output" style="display:none">
        <div class="csh-output-header">
          <span class="csh-output-title">操作指令</span>
          <button class="csh-btn csh-btn-secondary" id="csh-btn-copy">复制</button>
        </div>
        <div class="csh-output-content" id="csh-output-content"></div>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  // ============================================================
  // 11. UI — 面板拖动定位
  // ============================================================
  function enablePanelDrag(panel) {
    const header = panel.querySelector('.csh-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      panel.style.left = startLeft + (e.clientX - startX) + 'px';
      panel.style.top = startTop + (e.clientY - startY) + 'px';
      panel.style.right = 'auto';
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }

  // ============================================================
  // 12. 渲染组件列表
  // ============================================================
  function renderComponentList(state) {
    const body = document.getElementById('csh-body');
    if (!state.mappedItems || state.mappedItems.length === 0) {
      body.innerHTML = '<div class="csh-empty">暂无组件数据</div>';
      return;
    }

    const searchText = (document.getElementById('csh-search')?.value || '').toLowerCase();

    let items = state.currentOrder.map((seq) =>
      state.mappedItems.find((m) => m.seq === seq)
    );

    if (searchText) {
      items = items.filter((item) =>
        (item.productName && item.productName.toLowerCase().includes(searchText)) ||
        (item.typeLabel && item.typeLabel.toLowerCase().includes(searchText)) ||
        (item.terminatorId && item.terminatorId.includes(searchText)) ||
        (item.tagLabel && item.tagLabel.toLowerCase().includes(searchText))
      );
    }

    let html = '';

    if (state.viewMode === 'section' && !searchText) {
      const sections = detectSections(items);
      sections.forEach((section) => {
        html += `<div class="csh-section-title">${escapeHtml(section.title)}</div>`;
        section.items.forEach((item) => { html += renderItem(item, state); });
      });
    } else {
      items.forEach((item) => { html += renderItem(item, state); });
    }

    body.innerHTML = html;
    bindDragEvents(body, state);
  }

  function renderItem(item, state) {
    if (!item) return '';
    const origPos = state.originalOrder.indexOf(item.seq);
    const currPos = state.currentOrder.indexOf(item.seq);
    const moved = origPos !== currPos;
    const direction = currPos < origPos ? 'moved-up' : currPos > origPos ? 'moved-down' : '';

    const typeClass = item.typeName.includes('Vertical') ? 'csh-type-vertical'
      : item.typeName.includes('Horizontal') ? 'csh-type-horizontal'
      : (item.typeName.includes('Gallery') || item.typeName === 'cardGallery') ? 'csh-type-gallery'
      : 'csh-type-style';

    const seqClass = moved ? 'csh-item-seq changed' : 'csh-item-seq';
    const tid = item.terminatorId || '?';

    // 显示名称
    let displayName = item.productName || '';
    let nameClass = 'csh-item-name';
    if (!displayName || displayName.length < 2) {
      displayName = item.typeLabel;
      if (!state.hasEditorData) {
        nameClass += ' csh-no-product';
        displayName = '关联编辑后台可显示产品名';
      }
    }

    // 缩略图
    const thumbHtml = item.coverUrl
      ? `<img class="csh-item-thumb" src="${escapeHtml(item.coverUrl)}" loading="lazy" />`
      : `<div class="csh-item-thumb" style="background:#e5e7eb"></div>`;

    return `
      <div class="csh-item ${direction}" data-seq="${item.seq}" draggable="true">
        <span class="csh-drag-handle">☰</span>
        <span class="${seqClass}">${currPos}</span>
        ${thumbHtml}
        <span class="csh-item-type ${typeClass}">${escapeHtml(item.typeLabel)}</span>
        <span class="${nameClass}" title="${escapeHtml(item.tagLabel + ' | ' + (item.productName || ''))}">${escapeHtml(displayName)}</span>
        <span class="csh-item-tid">${tid}</span>
      </div>
    `;
  }

  // ============================================================
  // 13. HTML5 拖动排序
  // ============================================================
  function bindDragEvents(container, state) {
    let draggedSeq = null;

    container.querySelectorAll('.csh-item').forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        draggedSeq = parseInt(el.dataset.seq, 10);
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '' + draggedSeq);
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        container.querySelectorAll('.drag-over, .drag-over-below')
          .forEach((el2) => el2.classList.remove('drag-over', 'drag-over-below'));
      });

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        container.querySelectorAll('.drag-over, .drag-over-below')
          .forEach((el2) => el2.classList.remove('drag-over', 'drag-over-below'));
        el.classList.add(e.clientY < midY ? 'drag-over' : 'drag-over-below');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over', 'drag-over-below');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over', 'drag-over-below');
        const targetSeq = parseInt(el.dataset.seq, 10);
        if (draggedSeq === null || draggedSeq === targetSeq) return;

        const rect = el.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;

        state.undoStack.push([...state.currentOrder]);

        const fromIdx = state.currentOrder.indexOf(draggedSeq);
        state.currentOrder.splice(fromIdx, 1);
        let toIdx = state.currentOrder.indexOf(targetSeq);
        state.currentOrder.splice(insertBefore ? toIdx : toIdx + 1, 0, draggedSeq);

        renderComponentList(state);
        updateChangeCount(state);
        draggedSeq = null;
      });
    });
  }

  // ============================================================
  // 14. 变更计数
  // ============================================================
  function updateChangeCount(state) {
    let changeCount = 0;
    for (let i = 0; i < state.currentOrder.length; i++) {
      if (state.currentOrder[i] !== state.originalOrder[i]) changeCount++;
    }

    const changeBar = document.getElementById('csh-change-bar');
    const changeNum = document.getElementById('csh-change-num');
    if (changeCount > 0) {
      changeBar.style.display = 'flex';
      changeNum.textContent = changeCount;
    } else {
      changeBar.style.display = 'none';
    }
    document.getElementById('csh-output').style.display = 'none';
    // 隐藏提醒条（有新的变更了）
    document.getElementById('csh-alert').style.display = 'none';
  }

  // ============================================================
  // 15. 辅助函数
  // ============================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  function padNum(n) {
    return String(n).padStart(2, ' ');
  }

  function getPageId() {
    const match = location.pathname.match(/\/pages\/update\/(\d+)/);
    return match ? match[1] : location.pathname;
  }

  function setStatus(msg, type) {
    const el = document.getElementById('csh-status');
    if (el) {
      el.textContent = msg;
      el.className = 'csh-status' + (type ? ' ' + type : '');
    }
  }

  // ============================================================
  // 16. 主逻辑 — 初始化与事件绑定
  // ============================================================
  function init() {
    injectStyles();
    const panel = createPanel();
    enablePanelDrag(panel);

    const state = {
      terminatorComps: [],
      editorComps: [],
      mappedItems: [],
      originalOrder: [],
      currentOrder: [],
      undoStack: [],
      viewMode: 'all',
      hasEditorData: false,
    };

    // —— 折叠 ——
    document.getElementById('csh-btn-collapse').addEventListener('click', () => {
      panel.classList.toggle('csh-collapsed');
      document.getElementById('csh-btn-collapse').textContent =
        panel.classList.contains('csh-collapsed') ? '+' : '−';
    });

    // —— 刷新组件（从 Vue 数据层读取）——
    document.getElementById('csh-btn-refresh').addEventListener('click', () => {
      state.terminatorComps = collectTerminatorComponents();
      if (state.terminatorComps.length === 0) {
        setStatus('未找到 Vue 组件列表，请确认在「页面结构配置」tab 且已加载完成', 'error');
        return;
      }
      setStatus(`已从 Vue 读取 ${state.terminatorComps.length} 个组件 (PC端)`, 'success');

      if (state.editorComps.length > 0) {
        rebuildMapping(state);
      } else {
        state.mappedItems = state.terminatorComps.map((t, i) => ({
          seq: i, terminator: t, editor: null,
          productName: '', typeName: t.typeName,
          typeLabel: TYPE_LABEL[t.typeName] || t.typeName,
          terminatorId: t.terminatorId, vueId: t.vueId,
          coverUrl: t.coverUrl, tagLabel: t.tagLabel,
        }));
        state.originalOrder = state.mappedItems.map((m) => m.seq);
        state.currentOrder = [...state.originalOrder];
        state.undoStack = [];
        state.hasEditorData = false;
        renderComponentList(state);
        updateChangeCount(state);
      }
    });

    // —— 关联编辑后台 ——
    document.getElementById('csh-btn-link').addEventListener('click', async () => {
      const urlInput = document.getElementById('csh-editor-url');
      const url = urlInput.value.trim();
      if (!url) { setStatus('请输入编辑后台 URL', 'error'); return; }
      if (!url.includes('reactor')) { setStatus('URL 需要包含 reactor 域名', 'error'); return; }

      setStatus('正在获取编辑后台数据...', '');
      urlInput.classList.remove('csh-input-hint');

      try {
        state.editorComps = await fetchEditorComponents(url);
        setStatus(`已获取 ${state.editorComps.length} 个编辑后台组件`, 'success');
        GM_setValue(STORAGE_PREFIX + 'editor_' + getPageId(), url);

        if (state.terminatorComps.length === 0) {
          state.terminatorComps = collectTerminatorComponents();
        }
        state.hasEditorData = true;
        rebuildMapping(state);
      } catch (err) {
        setStatus('获取失败: ' + err.message, 'error');
        console.error('[组件排序助手]', err);
      }
    });

    // —— 应用排序（直接操控 Vue）——
    document.getElementById('csh-btn-apply').addEventListener('click', () => {
      // 计算变更数
      let changeCount = 0;
      for (let i = 0; i < state.currentOrder.length; i++) {
        if (state.currentOrder[i] !== state.originalOrder[i]) changeCount++;
      }

      if (changeCount === 0) {
        alert('没有需要应用的变更');
        return;
      }

      const confirmed = confirm(
        `确认要应用 ${changeCount} 处排序变更到 Terminator 页面吗？\n\n` +
        '应用后 Terminator 页面上的组件顺序会立即改变。\n' +
        '你需要点击页面下方的「保存草稿」按钮来保存更改。\n' +
        '如果不保存，刷新页面即可恢复原样。'
      );
      if (!confirmed) return;

      const success = applyToVue(state);
      if (success) {
        // 更新状态：当前顺序变成新的原始顺序
        state.originalOrder = [...state.currentOrder];
        state.undoStack = [];

        // 重新从 Vue 读取数据以确认同步
        state.terminatorComps = collectTerminatorComponents();
        if (state.hasEditorData) {
          rebuildMapping(state);
        } else {
          state.mappedItems = state.terminatorComps.map((t, i) => ({
            seq: i, terminator: t, editor: null,
            productName: '', typeName: t.typeName,
            typeLabel: TYPE_LABEL[t.typeName] || t.typeName,
            terminatorId: t.terminatorId, vueId: t.vueId,
            coverUrl: t.coverUrl, tagLabel: t.tagLabel,
          }));
          state.originalOrder = state.mappedItems.map((m) => m.seq);
          state.currentOrder = [...state.originalOrder];
          renderComponentList(state);
        }
        updateChangeCount(state);

        // 显示提醒条
        const alert = document.getElementById('csh-alert');
        alert.style.display = 'block';
        alert.className = 'csh-alert csh-alert-success';
        alert.textContent = '排序已应用！请点击页面下方的「保存草稿」按钮保存更改。';

        setStatus('排序已应用到页面', 'success');
      }
    });

    // —— 视图切换 ——
    panel.querySelectorAll('.csh-view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.csh-view-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.viewMode = btn.dataset.view;
        renderComponentList(state);
      });
    });

    // —— 搜索 ——
    document.getElementById('csh-search').addEventListener('input', () => {
      renderComponentList(state);
    });

    // —— 撤销 ——
    document.getElementById('csh-btn-undo').addEventListener('click', () => {
      if (state.undoStack.length > 0) {
        state.currentOrder = state.undoStack.pop();
        renderComponentList(state);
        updateChangeCount(state);
      }
    });

    // —— 重置 ——
    document.getElementById('csh-btn-reset').addEventListener('click', () => {
      state.undoStack.push([...state.currentOrder]);
      state.currentOrder = [...state.originalOrder];
      renderComponentList(state);
      updateChangeCount(state);
      document.getElementById('csh-output').style.display = 'none';
    });

    // —— 生成指令 ——
    document.getElementById('csh-btn-generate').addEventListener('click', () => {
      const output = generateInstructions(state);
      document.getElementById('csh-output-content').textContent = output;
      document.getElementById('csh-output').style.display = 'block';
    });

    // —— 复制 ——
    document.getElementById('csh-btn-copy').addEventListener('click', () => {
      const content = document.getElementById('csh-output-content').textContent;
      navigator.clipboard.writeText(content).then(() => {
        const btn = document.getElementById('csh-btn-copy');
        btn.textContent = '已复制!';
        setTimeout(() => { btn.textContent = '复制'; }, 1500);
      });
    });

    // —— Ctrl+Z ——
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z' && state.undoStack.length > 0) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        state.currentOrder = state.undoStack.pop();
        renderComponentList(state);
        updateChangeCount(state);
      }
    });

    // —— 自动加载 ——
    const savedUrl = GM_getValue(STORAGE_PREFIX + 'editor_' + getPageId(), '');
    if (savedUrl) {
      setTimeout(() => {
        state.terminatorComps = collectTerminatorComponents();
        if (state.terminatorComps.length > 0) {
          setStatus(`已读取 ${state.terminatorComps.length} 个组件，正在关联编辑后台...`, '');
          document.getElementById('csh-btn-link').click();
        }
      }, 2000);
    }
  }

  function rebuildMapping(state) {
    state.mappedItems = buildMapping(state.terminatorComps, state.editorComps);
    state.originalOrder = state.mappedItems.map((m) => m.seq);
    state.currentOrder = [...state.originalOrder];
    state.undoStack = [];
    renderComponentList(state);
    updateChangeCount(state);

    const tLen = state.terminatorComps.length;
    const eLen = state.editorComps.length;
    if (tLen !== eLen) {
      setStatus(`已映射 (Terminator: ${tLen}, 编辑后台: ${eLen}, 数量不一致!)`, 'error');
    } else {
      setStatus(`已映射 ${tLen} 个组件`, 'success');
    }
  }

  // ============================================================
  // 17. 启动
  // ============================================================
  if (document.readyState === 'complete') {
    setTimeout(init, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1500));
  }
})();
