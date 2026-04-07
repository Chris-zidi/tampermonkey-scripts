// ==UserScript==
// @name          国家选择器
// @namespace     https://github.com/Chris-zidi/tampermonkey-scripts
// @version       1.2.1
// @description   电源规格国家选择器
// @author        Chris-zidi
// @match         *://*/*
// @grant         none
// @updateURL     https://cdn.jsdelivr.net/gh/Chris-zidi/tampermonkey-scripts@main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// @downloadURL   https://cdn.jsdelivr.net/gh/Chris-zidi/tampermonkey-scripts@main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// ==/UserScript==

(function () {
    console.log("Chris：国家选择器 v1.2.1 启动");

    /**************** 按钮配置 ****************/
    // gradient: CSS 渐变色背景
    const BUTTON_CONFIGS = [
        { name: 'EN美规',  values: ['PH', 'CA'],
          gradient: 'linear-gradient(135deg, #f7971e, #ffd200)' },
        { name: 'EN英规',  values: ['GB'],
          gradient: 'linear-gradient(135deg, #1a6fc4, #2196f3)' },
        { name: '日规',    values: ['JP'],
          gradient: 'linear-gradient(135deg, #c0392b, #e74c3c)' },
        { name: 'EN澳规',  values: ['AU'],
          gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' },
        { name: 'EN欧规',  values: ['BE','BG','HR','CZ','DK','EE','FI','GR','HU','IE','LV','LT','MT','NL','NO','PL','PT','RO','SK','SI','SE','CH'],
          gradient: 'linear-gradient(135deg, #6a11cb, #a855f7)' },
        { name: '中规',    values: ['CN'],
          gradient: 'linear-gradient(135deg, #e52d27, #b31217)' },
        { name: 'FR美规',  values: ['CA'],
          gradient: 'linear-gradient(135deg, #f46b45, #eea849)' },
        { name: 'FR欧规',  values: ['MC', 'FR', 'LU'],
          gradient: 'linear-gradient(135deg, #1f3c6e, #2c5282)' },
        { name: 'TCN英规', values: ['HK', 'MO'],
          gradient: 'linear-gradient(135deg, #00b09b, #00d2ff)' },
        { name: 'DE欧规',  values: ['AT', 'DE', 'LI'],
          gradient: 'linear-gradient(135deg, #4b6cb7, #182848)' },
        { name: 'ES欧规',  values: ['ES'],
          gradient: 'linear-gradient(135deg, #c94b4b, #4b134f)' },
        { name: 'IT欧规',  values: ['IT'],
          gradient: 'linear-gradient(135deg, #f7971e, #21d4fd)' },
    ];
    /******************************************/

    const BTN_WIDTH  = 108;  // 所有按钮统一宽度 px（加宽确保TCN英规完整显示）
    const BTN_HEIGHT = 44;   // 按钮高度 px
    const BTN_GAP    = 6;    // 按钮间距 px
    const BTN_RIGHT  = 14;   // 距页面右边距 px
    const BTN_TOP    = 80;   // 第一个按钮距页面顶部 px

    /************** checkbox 操作（只改属性，不触发事件，避免自动提交） **************/

    function getAllCheckboxes(modal) {
        return Array.from(modal.querySelectorAll('input[type="checkbox"]'));
    }

    function findCheckboxByValue(modal, value) {
        return modal.querySelector(`input[type="checkbox"][value="${value}"]`);
    }

    // 直接修改 checked 属性，不调用 .click()，不派发任何事件
    // 这样页面 UI 会正确更新 checkbox 状态，但不会触发页面绑定的自动提交逻辑
    function setChecked(checkbox, state) {
        if (!checkbox) return;
        checkbox.checked = !!state;
    }

    /************** 核心逻辑：先全部取消，再勾选目标 **************/
    function applySelection(modal, targetValues) {
        // 第一步：取消所有 checkbox
        getAllCheckboxes(modal).forEach(cb => setChecked(cb, false));

        // 第二步：勾选目标国家
        targetValues.forEach(val => {
            const cb = findCheckboxByValue(modal, val);
            if (cb) {
                setChecked(cb, true);
            } else {
                console.warn(`Chris：找不到 value="${val}" 的 checkbox`);
            }
        });
    }

    /************** 注入固定悬浮按钮面板 **************/
    let panel = null;

    function injectPanel() {
        if (panel) return;

        // 外层容器，fixed 固定在页面右侧，默认隐藏
        panel = document.createElement('div');
        panel.id = 'chris-country-panel';
        panel.style.cssText = `
            position: fixed;
            right: ${BTN_RIGHT}px;
            top: ${BTN_TOP}px;
            z-index: 2147483647;
            display: none;
            flex-direction: column;
            gap: ${BTN_GAP}px;
            pointer-events: none;
        `;

        BUTTON_CONFIGS.forEach(cfg => {
            const btn = document.createElement('button');
            btn.textContent = '⭐ ' + cfg.name;
            btn.style.cssText = `
                width: ${BTN_WIDTH}px;
                height: ${BTN_HEIGHT}px;
                border-radius: 10px;
                border: none;
                background: ${cfg.gradient};
                color: #fff;
                font-size: 14px;
                font-weight: 700;
                font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
                letter-spacing: 0.5px;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(0,0,0,0.25);
                transition: transform 0.12s ease, box-shadow 0.12s ease;
                pointer-events: auto;
                text-shadow: 0 1px 3px rgba(0,0,0,0.3);
                white-space: nowrap;
                overflow: visible;
                padding: 0 10px;
            `;
            btn.onmouseover = () => {
                btn.style.transform = 'scale(1.08) translateX(-2px)';
                btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
            };
            btn.onmouseout = () => {
                btn.style.transform = 'scale(1) translateX(0)';
                btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
            };
            btn.onclick = e => {
                e.stopPropagation();
                e.preventDefault();
                const modal = document.querySelector('.modal.show,[role="dialog"]');
                if (!modal) {
                    console.warn('Chris：没有找到打开的 modal');
                    return;
                }
                applySelection(modal, cfg.values);
                console.log(`Chris：已应用 ${cfg.name}（${cfg.values.join(',')}）`);
                btn.style.transform = 'scale(0.93)';
                setTimeout(() => { btn.style.transform = 'scale(1)'; }, 140);
            };
            panel.appendChild(btn);
        });

        document.body.appendChild(panel);
    }

    /************** 显示/隐藏面板 **************/
    function showPanel() {
        if (!panel) injectPanel();
        panel.style.display = 'flex';
    }

    function hidePanel() {
        if (panel) panel.style.display = 'none';
    }

    /************** 监听 modal 出现和消失 **************/
    function hasModal() {
        return !!document.querySelector('.modal.show,[role="dialog"]');
    }

    const observer = new MutationObserver(() => {
        if (hasModal()) {
            showPanel();
        } else {
            hidePanel();
        }
    });

    // 等 body 就绪后启动监听
    function init() {
        injectPanel();
        // 如果页面加载时 modal 已经存在，立即显示
        if (hasModal()) showPanel();

        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();
