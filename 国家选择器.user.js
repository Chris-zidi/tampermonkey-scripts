// ==UserScript==
// @name          国家选择器
// @namespace     https://github.com/Chris-zidi/tampermonkey-scripts
// @version       1.5.0
// @description   电源规格国家选择器
// @author        Chris-zidi
// @match         *://*/*
// @grant         none
// @updateURL     https://cdn.jsdelivr.net/gh/Chris-zidi/tampermonkey-scripts@main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// @downloadURL   https://cdn.jsdelivr.net/gh/Chris-zidi/tampermonkey-scripts@main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// ==/UserScript==

(function () {
    console.log("Chris：国家选择器 v1.5.0 启动");

    /**************** 按钮配置（按语种分组，同色系） ****************/
    // shadowColor: 彩色光晕阴影，与渐变同色系
    const BUTTON_CONFIGS = [
        // EN 英语 - 蓝色系
        { name: 'EN美规',  flag: '⭐', values: ['PH', 'CA'],
          gradient: 'linear-gradient(160deg, #4fc3f7 0%, #1976d2 50%, #0d47a1 100%)',
          shadow: '0 4px 15px rgba(25,118,210,0.55)', group: 'EN' },
        { name: 'EN英规',  flag: '⭐', values: ['GB'],
          gradient: 'linear-gradient(160deg, #81d4fa 0%, #0288d1 50%, #01579b 100%)',
          shadow: '0 4px 15px rgba(2,136,209,0.55)', group: 'EN' },
        { name: 'EN澳规',  flag: '⭐', values: ['AU'],
          gradient: 'linear-gradient(160deg, #b3e5fc 0%, #039be5 50%, #0277bd 100%)',
          shadow: '0 4px 15px rgba(3,155,229,0.55)', group: 'EN' },
        { name: 'EN欧规',  flag: '⭐', values: ['BE','BG','HR','CZ','DK','EE','FI','GR','HU','IE','LV','LT','MT','NL','NO','PL','PT','RO','SK','SI','SE','CH'],
          gradient: 'linear-gradient(160deg, #64b5f6 0%, #1565c0 50%, #0a2e6e 100%)',
          shadow: '0 4px 15px rgba(21,101,192,0.55)', group: 'EN' },
        // 中规 - 红色系
        { name: '中规',    flag: '⭐', values: ['CN'],
          gradient: 'linear-gradient(160deg, #ef9a9a 0%, #e53935 50%, #8b0000 100%)',
          shadow: '0 4px 15px rgba(229,57,53,0.55)', group: 'CN' },
        // 日规 - 朱红橙系
        { name: '日规',    flag: '⭐', values: ['JP'],
          gradient: 'linear-gradient(160deg, #ffab91 0%, #f4511e 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(244,81,30,0.55)', group: 'JP' },
        // FR 法语 - 橙金系
        { name: 'FR美规',  flag: '⭐', values: ['CA'],
          gradient: 'linear-gradient(160deg, #ffe082 0%, #ffa000 50%, #e65100 100%)',
          shadow: '0 4px 15px rgba(255,160,0,0.55)', group: 'FR' },
        { name: 'FR欧规',  flag: '⭐', values: ['MC', 'FR', 'LU'],
          gradient: 'linear-gradient(160deg, #ffcc80 0%, #fb8c00 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(251,140,0,0.55)', group: 'FR' },
        // TCN 繁中 - 青绿系
        { name: 'TCN英规', flag: '⭐', values: ['HK', 'MO'],
          gradient: 'linear-gradient(160deg, #80deea 0%, #00acc1 50%, #006064 100%)',
          shadow: '0 4px 15px rgba(0,172,193,0.55)', group: 'TCN' },
        // DE 德语 - 深蓝紫系
        { name: 'DE欧规',  flag: '⭐', values: ['AT', 'DE', 'LI'],
          gradient: 'linear-gradient(160deg, #9fa8da 0%, #3949ab 50%, #1a237e 100%)',
          shadow: '0 4px 15px rgba(57,73,171,0.55)', group: 'DE' },
        // ES 西语 - 玫红紫系
        { name: 'ES欧规',  flag: '⭐', values: ['ES'],
          gradient: 'linear-gradient(160deg, #f48fb1 0%, #d81b60 50%, #880e4f 100%)',
          shadow: '0 4px 15px rgba(216,27,96,0.55)', group: 'ES' },
        // IT 意语 - 翠绿系
        { name: 'IT欧规',  flag: '⭐', values: ['IT'],
          gradient: 'linear-gradient(160deg, #a5d6a7 0%, #43a047 50%, #1b5e20 100%)',
          shadow: '0 4px 15px rgba(67,160,71,0.55)', group: 'IT' },
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

    /************** 注入全局样式（伪元素高光、动画） **************/
    function injectStyles() {
        if (document.getElementById('chris-country-style')) return;
        const style = document.createElement('style');
        style.id = 'chris-country-style';
        style.textContent = `
            .chris-btn {
                position: relative;
                overflow: hidden;
                cursor: pointer;
                border: none;
                outline: none;
            }
            /* 顶部玻璃高光 */
            .chris-btn::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 50%;
                background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%);
                border-radius: 8px 8px 0 0;
                pointer-events: none;
            }
            /* 底部内阴影深度 */
            .chris-btn::after {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 8px;
                box-shadow: inset 0 -2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3);
                pointer-events: none;
            }
            /* 点击涟漪 */
            .chris-btn.clicked::before {
                background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%);
            }
        `;
        document.head.appendChild(style);
    }

    /************** 注入固定悬浮按钮面板 **************/
    let panel = null;

    function injectPanel() {
        if (panel) return;
        injectStyles();

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
            btn.className = 'chris-btn';
            btn.textContent = cfg.flag + ' ' + cfg.name;
            btn.style.cssText = `
                width: ${BTN_WIDTH}px;
                height: ${BTN_HEIGHT}px;
                border-radius: 8px;
                border: none;
                background: ${cfg.gradient};
                color: #fff;
                font-size: 13px;
                font-weight: 800;
                font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
                letter-spacing: 0.5px;
                cursor: pointer;
                box-shadow: ${cfg.shadow}, inset 0 1px 0 rgba(255,255,255,0.25);
                transition: transform 0.15s cubic-bezier(.34,1.56,.64,1), box-shadow 0.15s ease, filter 0.15s ease;
                pointer-events: auto;
                text-shadow: 0 1px 4px rgba(0,0,0,0.35);
                white-space: nowrap;
                padding: 0 12px;
                text-align: center;
                filter: brightness(1);
            `;
            btn.onmouseover = () => {
                btn.style.transform = 'scale(1.08) translateX(-3px)';
                btn.style.boxShadow = cfg.shadow.replace('0.55', '0.8') + ', inset 0 1px 0 rgba(255,255,255,0.3)';
                btn.style.filter = 'brightness(1.12)';
            };
            btn.onmouseout = () => {
                btn.style.transform = 'scale(1) translateX(0)';
                btn.style.boxShadow = cfg.shadow + ', inset 0 1px 0 rgba(255,255,255,0.25)';
                btn.style.filter = 'brightness(1)';
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
                // 点击弹跳动画
                btn.style.transform = 'scale(0.92)';
                btn.style.filter = 'brightness(0.9)';
                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                    btn.style.filter = 'brightness(1)';
                }, 150);
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
