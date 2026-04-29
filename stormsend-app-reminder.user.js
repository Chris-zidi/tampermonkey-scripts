// ==UserScript==
// @name         Stormsend APP组件编辑提醒
// @namespace    https://github.com/Chris-zidi/tampermonkey-scripts
// @version      1.0.0
// @description  在 Stormsend 组件编辑页面提醒：APP页面修改后立即生效，操作前请先修改生效时间或下线组件
// @author       o-park.chen
// @match        *://stormsend.djiits.com/component_instances/*/edit*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/stormsend-app-reminder.user.js
// @downloadURL  https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/stormsend-app-reminder.user.js
// ==/UserScript==

(function () {
  'use strict';

  console.log('[APP提醒] Stormsend APP组件编辑提醒 v1.0.0 启动');

  // ══════════════════════════════════════════════════════
  //  判断当前页面是否包含 APP 相关容器
  //  只有编辑 APP 容器时才需要提醒
  // ══════════════════════════════════════════════════════
  function isAppPage() {
    // 检查页面标题/面包屑中是否包含 "APP"
    const header = document.querySelector('.page-header, .container-name, h1, h2, h3');
    if (header && /APP/i.test(header.textContent)) return true;

    // 检查容器名称区域
    const containerTitle = document.querySelector('.J-tree-item-name .J-name, .panel-title');
    if (containerTitle && /APP/i.test(containerTitle.textContent)) return true;

    // 检查 URL hash 中的路径
    if (/APP/i.test(location.hash)) return true;

    // 检查组件树中第一个节点
    const firstItem = document.querySelector('.tree-item .J-name');
    if (firstItem && /APP/i.test(firstItem.textContent)) return true;

    return false;
  }

  // ══════════════════════════════════════════════════════
  //  样式注入
  // ══════════════════════════════════════════════════════
  const STYLE = document.createElement('style');
  STYLE.textContent = `
    /* ── 顶部横幅 ── */
    #app-reminder-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: linear-gradient(135deg, #ff6b35, #e63946);
      color: #fff;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 2px 12px rgba(230, 57, 70, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      animation: bannerSlideDown 0.4s ease-out;
    }

    @keyframes bannerSlideDown {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }

    #app-reminder-banner .banner-icon {
      font-size: 20px;
    }

    #app-reminder-banner .banner-text {
      flex: 1;
      text-align: center;
    }

    #app-reminder-banner .banner-close {
      cursor: pointer;
      font-size: 18px;
      opacity: 0.8;
      transition: opacity 0.2s;
      background: none;
      border: none;
      color: #fff;
      padding: 0 8px;
    }

    #app-reminder-banner .banner-close:hover {
      opacity: 1;
    }

    /* ── 遮罩层 ── */
    #app-reminder-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999998;
      animation: overlayFadeIn 0.2s ease-out;
    }

    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── 确认弹窗 ── */
    #app-reminder-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999999;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 480px;
      max-width: 90vw;
      overflow: hidden;
      animation: dialogPopIn 0.3s ease-out;
    }

    @keyframes dialogPopIn {
      from { transform: translate(-50%, -50%) scale(0.85); opacity: 0; }
      to   { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
    }

    #app-reminder-dialog .dialog-header {
      background: linear-gradient(135deg, #ff6b35, #e63946);
      color: #fff;
      padding: 16px 20px;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #app-reminder-dialog .dialog-body {
      padding: 20px;
      color: #333;
      font-size: 14px;
      line-height: 1.8;
    }

    #app-reminder-dialog .dialog-body .warning-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 8px 0;
      padding: 8px 12px;
      background: #fff3cd;
      border-left: 3px solid #ffc107;
      border-radius: 4px;
    }

    #app-reminder-dialog .dialog-body .warning-item .item-icon {
      flex-shrink: 0;
      font-size: 16px;
    }

    #app-reminder-dialog .dialog-footer {
      padding: 12px 20px 16px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    #app-reminder-dialog .btn-cancel {
      padding: 8px 24px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #f5f5f5;
      color: #666;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    #app-reminder-dialog .btn-cancel:hover {
      background: #e8e8e8;
    }

    #app-reminder-dialog .btn-confirm {
      padding: 8px 24px;
      border: none;
      border-radius: 6px;
      background: #e63946;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.2s;
    }

    #app-reminder-dialog .btn-confirm:hover {
      background: #c1121f;
    }
  `;
  document.head.appendChild(STYLE);

  // ══════════════════════════════════════════════════════
  //  功能 1：顶部横幅提醒
  // ══════════════════════════════════════════════════════
  function showBanner() {
    // 避免重复创建
    if (document.getElementById('app-reminder-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'app-reminder-banner';
    banner.innerHTML = `
      <span class="banner-icon">⚠️</span>
      <span class="banner-text">
        【APP 组件提醒】后台修改 APP 组件后会<strong>立即生效</strong>！
        操作前请先<strong>修改生效时间</strong>或<strong>下线组件</strong>！
      </span>
      <button class="banner-close" title="关闭提醒">✕</button>
    `;

    document.body.prepend(banner);

    // 关闭按钮
    banner.querySelector('.banner-close').addEventListener('click', () => {
      banner.style.animation = 'none';
      banner.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
      banner.style.transform = 'translateY(-100%)';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 300);
    });
  }

  // ══════════════════════════════════════════════════════
  //  功能 2：复制按钮拦截确认弹窗
  // ══════════════════════════════════════════════════════

  /**
   * 显示确认弹窗
   * @param {string} componentName - 被复制的组件名称
   * @param {Function} onConfirm - 用户确认后的回调
   */
  function showConfirmDialog(componentName, onConfirm) {
    // 移除已有弹窗
    const existingOverlay = document.getElementById('app-reminder-overlay');
    const existingDialog = document.getElementById('app-reminder-dialog');
    if (existingOverlay) existingOverlay.remove();
    if (existingDialog) existingDialog.remove();

    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.id = 'app-reminder-overlay';
    document.body.appendChild(overlay);

    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.id = 'app-reminder-dialog';
    dialog.innerHTML = `
      <div class="dialog-header">
        ⚠️ APP 组件复制操作确认
      </div>
      <div class="dialog-body">
        <p>你正在复制组件：<strong>${componentName || '未知组件'}</strong></p>
        <p style="margin-top:12px;">APP 页面的组件修改后<strong style="color:#e63946;">立即生效</strong>，请在操作前确认：</p>
        <div class="warning-item">
          <span class="item-icon">1️⃣</span>
          <span>是否已经<strong>修改了生效时间</strong>（避免用户立即看到变更）？</span>
        </div>
        <div class="warning-item">
          <span class="item-icon">2️⃣</span>
          <span>或者是否已经<strong>下线了该组件</strong>？</span>
        </div>
        <p style="margin-top:12px;color:#888;font-size:12px;">
          如果还没有做以上操作，请先取消，处理好后再进行复制。
        </p>
      </div>
      <div class="dialog-footer">
        <button class="btn-cancel">取消复制</button>
        <button class="btn-confirm">已确认，继续复制</button>
      </div>
    `;
    document.body.appendChild(dialog);

    // 取消按钮
    function closeDialog() {
      overlay.remove();
      dialog.remove();
    }

    dialog.querySelector('.btn-cancel').addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);

    // ESC 键关闭
    function handleEsc(e) {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEsc);
      }
    }
    document.addEventListener('keydown', handleEsc);

    // 确认按钮
    dialog.querySelector('.btn-confirm').addEventListener('click', () => {
      closeDialog();
      document.removeEventListener('keydown', handleEsc);
      if (typeof onConfirm === 'function') onConfirm();
    });
  }

  /**
   * 从复制按钮向上查找对应的组件名称
   */
  function getComponentName(copyBtn) {
    // 向上找到 tree-item 容器
    const treeItem = copyBtn.closest('.tree-item.J-tree-item');
    if (treeItem) {
      const nameEl = treeItem.querySelector('.J-name');
      if (nameEl) return nameEl.textContent.trim();
      // 也检查 data-component-name 属性
      return treeItem.getAttribute('data-component-name') || '';
    }
    return '';
  }

  // ══════════════════════════════════════════════════════
  //  事件委托：拦截复制按钮点击
  // ══════════════════════════════════════════════════════
  function setupCopyInterceptor() {
    // 使用捕获阶段在 document 级别拦截，优先于页面自身（jQuery 等）的事件处理
    document.addEventListener('click', function (e) {
      // 检查点击的是否是复制按钮（a.J-copy）或其子元素
      const copyBtn = e.target.closest('a.J-copy');
      if (!copyBtn) return;

      // 如果已经确认过，放行原始逻辑
      if (copyBtn.dataset.appReminderConfirmed === 'true') {
        delete copyBtn.dataset.appReminderConfirmed;
        return; // 不拦截，让事件继续冒泡到页面原始 handler
      }

      // 首次点击 → 拦截
      e.preventDefault();
      e.stopImmediatePropagation();

      const componentName = getComponentName(copyBtn);

      showConfirmDialog(componentName, () => {
        // 用户确认后，打上标记并重新触发点击
        // dispatchEvent 会重新走 DOM 事件流（包括捕获阶段），标记确保放行
        copyBtn.dataset.appReminderConfirmed = 'true';
        copyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
    }, true); // 捕获阶段
  }

  // ══════════════════════════════════════════════════════
  //  保存按钮拦截：点保存时也提醒
  // ══════════════════════════════════════════════════════
  // 暂不实现，复制操作的风险更大

  // ══════════════════════════════════════════════════════
  //  初始化
  // ══════════════════════════════════════════════════════
  function init() {
    // 等待页面加载完成
    // 延迟检查，确保 DOM 已渲染（Stormsend 可能是 SPA 动态加载）
    setTimeout(() => {
      // 检查是否是 APP 相关页面
      const isApp = isAppPage();
      console.log('[APP提醒] 页面检测 - 是否APP页面:', isApp);

      if (isApp) {
        showBanner();
        console.log('[APP提醒] 已显示顶部横幅提醒');
      }

      // 复制按钮拦截 - 无论是否 APP 页面都设置（APP 容器可能嵌套在其他容器中）
      // 但只有 APP 相关的才会弹窗
      setupCopyInterceptor();
      console.log('[APP提醒] 已设置复制按钮拦截');
    }, 1500);
  }

  // 支持 SPA 路由变化时重新检测
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('[APP提醒] URL 变化，重新检测');
      // 移除旧横幅
      const oldBanner = document.getElementById('app-reminder-banner');
      if (oldBanner) oldBanner.remove();
      // 重新检测
      setTimeout(() => {
        if (isAppPage()) {
          showBanner();
        }
      }, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
