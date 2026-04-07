// ==UserScript==
// @name          国家选择器
// @namespace     https://github.com/Chris-zidi/tampermonkey-scripts
// @version       1.4.0
// @description   电源规格国家选择器
// @author        Chris-zidi
// @match         *://*/*
// @grant         none
// @updateURL     https://cdn.jsdelivr.net/gh/Chris-zidi/tampermonkey-scripts@main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// @downloadURL   https://cdn.jsdelivr.net/gh/Chris-zidi/tampermonkey-scripts@main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// ==/UserScript==

(function () {
    console.log("Chris：国家选择器 v1.4.0 启动");

    /**************** 按钮配置（按语种分组，同色系） ****************/
    const BUTTON_CONFIGS = [
        // EN 英语 - 蓝色系
        { name: 'EN美规',  flag: '🇺🇸', values: ['PH', 'CA'],        gradient: 'linear-gradient(135deg, #1565c0, #42a5f5)', group: 'EN' },
        { name: 'EN英规',  flag: '🇬🇧', values: ['GB'],               gradient: 'linear-gradient(135deg, #1976d2, #64b5f6)', group: 'EN' },
        { name: 'EN澳规',  flag: '🇦🇺', values: ['AU'],               gradient: 'linear-gradient(135deg, #0288d1, #4fc3f7)', group: 'EN' },
        { name: 'EN欧规',  flag: '🇪🇺', values: ['BE','BG','HR','CZ','DK','EE','FI','GR','HU','IE','LV','LT','MT','NL','NO','PL','PT','RO','SK','SI','SE','CH'],
                                                                        gradient: 'linear-gradient(135deg, #01579b, #29b6f6)', group: 'EN' },
        // 中规 - 红色系
        { name: '中规',    flag: '🇨🇳', values: ['CN'],               gradient: 'linear-gradient(135deg, #c62828, #ef5350)', group: 'CN' },
        // 日规 - 朱红系
        { name: '日规',    flag: '🇯🇵', values: ['JP'],               gradient: 'linear-gradient(135deg, #b71c1c, #ff7043)', group: 'JP' },
        // FR 法语 - 橙色系
        { name: 'FR美规',  flag: '🇫🇷', values: ['CA'],               gradient: 'linear-gradient(135deg, #e65100, #ffa726)', group: 'FR' },
        { name: 'FR欧规',  flag: '🇫🇷', values: ['MC', 'FR', 'LU'],  gradient: 'linear-gradient(135deg, #bf360c, #ff8a65)', group: 'FR' },
        // TCN 繁中 - 青绿系
        { name: 'TCN英规', flag: '🇭🇰', values: ['HK', 'MO'],         gradient: 'linear-gradient(135deg, #00695c, #26c6da)', group: 'TCN' },
        // DE 德语 - 深蓝紫系
        { name: 'DE欧规',  flag: '🇩🇪', values: ['AT', 'DE', 'LI'],  gradient: 'linear-gradient(135deg, #1a237e, #5c6bc0)', group: 'DE' },
        // ES 西语 - 玫红系
        { name: 'ES欧规',  flag: '🇪🇸', values: ['ES'],               gradient: 'linear-gradient(135deg, #880e4f, #e91e8c)', group: 'ES' },
        // IT 意语 - 黄绿系
        { name: 'IT欧规',  flag: '🇮🇹', values: ['IT'],               gradient: 'linear-gradient(135deg, #558b2f, #cddc39)', group: 'IT' },
    ];
    /********************************************************/

    const BTN_WIDTH  = 118;  // 所有按钮统一宽度 px（留空间给国旗）
    const BTN_HEIGHT = 40;   // 按钮高度 px
    const BTN_GAP    = 3;    // 按钮间距 px（全部统一，无组间大间距）
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
            // 国旗 + 规格名
            btn.textContent = cfg.flag + ' ' + cfg.name;
            btn.style.cssText = `
                width: ${BTN_WIDTH}px;
                height: ${BTN_HEIGHT}px;
                border-radius: 8px;
                border: none;
                background: ${cfg.gradient};
                color: #fff;
                font-size: 13px;
                font-weight: 700;
                font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
                letter-spacing: 0.3px;
                cursor: pointer;
                box-shadow: 0 3px 10px rgba(0,0,0,0.22);
                transition: transform 0.12s ease, box-shadow 0.12s ease;
                pointer-events: auto;
                text-shadow: 0 1px 3px rgba(0,0,0,0.25);
                white-space: nowrap;
                overflow: visible;
                padding: 0 10px;
                text-align: center;
            `;
            btn.onmouseover = () => {
                btn.style.transform = 'scale(1.07) translateX(-2px)';
                btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.32)';
            };
            btn.onmouseout = () => {
                btn.style.transform = 'scale(1) translateX(0)';
                btn.style.boxShadow = '0 3px 10px rgba(0,0,0,0.22)';
            };
            btn.onclick = e => {
                e.stopPropagation();
                e.preventDefault();
                const modal = getVisibleModal();
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
    // 判断条件：[role="dialog"] 存在 + display 不为 none + 内部有 checkbox
    // 不能用 .modal.show，因为该页面用的是 .modal.fade.in + style="display:block"
    function getVisibleModal() {
        const candidates = document.querySelectorAll('[role="dialog"]');
        for (const el of candidates) {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
                if (el.querySelector('input[type="checkbox"]')) {
                    return el;
                }
            }
        }
        return null;
    }

    function hasModal() {
        return !!getVisibleModal();
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
        // 如果页面加载时 modal 已经可见，立即显示
        if (hasModal()) showPanel();

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']  // 同时监听 style 变化（display:none/block）
        });
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();
