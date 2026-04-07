// ==UserScript==
// @name          国家选择器
// @namespace     https://github.com/Chris-zidi/tampermonkey-scripts
// @version       1.0.0
// @description   电源规格国家选择器
// @author        Chris-zidi
// @match         *://*/*
// @grant         none
// @updateURL     https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// @downloadURL   https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// ==/UserScript==

(function () {
    console.log("Chris：国家选择器启动");

    /**************** 配置 ****************/
    const INJECT_CHECK_INTERVAL = 80;
    const INJECT_TIMEOUT = 6000;
    /*************************************/

    // 按钮定义：name=显示文字, values=要勾选的国家代码数组, bg=背景色
    const BUTTON_CONFIGS = [
        { name: 'EN美规',  values: ['PH', 'CA'],                                                                                              bg: '#e67e22' },
        { name: 'EN英规',  values: ['GB'],                                                                                                    bg: '#2980b9' },
        { name: '日规',    values: ['JP'],                                                                                                    bg: '#c0392b' },
        { name: 'EN澳规',  values: ['AU'],                                                                                                    bg: '#27ae60' },
        { name: 'EN欧规',  values: ['BE','BG','HR','CZ','DK','EE','FI','GR','HU','IE','LV','LT','MT','NL','NO','PL','PT','RO','SK','SI','SE','CH'], bg: '#8e44ad' },
        { name: '中规',    values: ['CN'],                                                                                                    bg: '#e74c3c' },
        { name: 'FR美规',  values: ['CA'],                                                                                                    bg: '#d35400' },
        { name: 'FR欧规',  values: ['MC', 'FR', 'LU'],                                                                                       bg: '#2c3e50' },
        { name: 'TCN英规', values: ['HK', 'MO'],                                                                                             bg: '#16a085' },
        { name: 'DE欧规',  values: ['AT', 'DE', 'LI'],                                                                                       bg: '#7f8c8d' },
        { name: 'ES欧规',  values: ['ES'],                                                                                                    bg: '#c0392b' },
        { name: 'IT欧规',  values: ['IT'],                                                                                                    bg: '#f39c12' },
    ];

    const BTN_HEIGHT = 32;   // 每个按钮的高度
    const BTN_GAP    = 6;    // 按钮之间的间距
    const BTN_TOP    = 12;   // 第一个按钮距顶部

    /************** checkbox 工具 **************/

    // 找到 checkbox 对应的 label 元素
    function findLabelForInput(input) {
        if (!input) return null;
        if (input.id) {
            const l = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
            if (l) return l;
        }
        return input.closest('label');
    }

    // 模拟真人点击：通过 label 或 checkbox 本身点击，并派发 change/input 事件
    function clickCheckbox(checkbox) {
        if (!checkbox) return;
        const label = findLabelForInput(checkbox);
        if (label) {
            label.click();
        } else {
            checkbox.click();
        }
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        checkbox.dispatchEvent(new Event('input',  { bubbles: true }));
    }

    // 获取 modal 内所有 checkbox
    function getAllCheckboxes(modal) {
        return Array.from(modal.querySelectorAll('input[type="checkbox"]'));
    }

    // 根据 value 属性找到 checkbox
    function findCheckboxByValue(modal, value) {
        return modal.querySelector(`input[type="checkbox"][value="${value}"]`);
    }

    /************** 核心逻辑：先全部取消，再勾选目标 **************/
    function applySelection(modal, targetValues) {
        const all = getAllCheckboxes(modal);

        // 第一步：取消所有已勾选的 checkbox
        all.forEach(cb => {
            if (cb.checked) clickCheckbox(cb);
        });

        // 第二步：勾选目标国家
        targetValues.forEach(val => {
            const cb = findCheckboxByValue(modal, val);
            if (cb && !cb.checked) {
                clickCheckbox(cb);
            } else if (!cb) {
                console.warn(`Chris：找不到 value="${val}" 的 checkbox`);
            }
        });
    }

    /************** 注入按钮 **************/
    function injectButtonsIntoModal(modal) {
        if (modal.dataset.chrisInjected) return;
        if (getComputedStyle(modal).position === 'static') modal.style.position = 'relative';

        BUTTON_CONFIGS.forEach((cfg, i) => {
            const top = BTN_TOP + i * (BTN_HEIGHT + BTN_GAP);
            const btn = document.createElement('button');
            btn.textContent = cfg.name;
            btn.style.cssText = `
                position: absolute;
                right: 12px;
                top: ${top}px;
                z-index: 2147483647;
                padding: 4px 10px;
                height: ${BTN_HEIGHT}px;
                border-radius: 6px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 3px 10px rgba(0,0,0,.18);
                transition: transform .14s ease, opacity .14s ease;
                font-size: 12px;
                background: ${cfg.bg};
                color: #fff;
                white-space: nowrap;
            `;
            btn.onmouseover = () => { btn.style.transform = 'scale(1.06)'; btn.style.opacity = '0.92'; };
            btn.onmouseout  = () => { btn.style.transform = 'scale(1)';    btn.style.opacity = '1';    };
            btn.onclick = e => {
                e.stopPropagation();
                applySelection(modal, cfg.values);
                console.log(`Chris：已应用 ${cfg.name}（${cfg.values.join(',')}）`);
            };
            modal.appendChild(btn);
        });

        modal.dataset.chrisInjected = '1';
    }

    /************** 监听 modal 出现 **************/
    function ensureInjection(modal) {
        if (modal.dataset.chrisInjecting) return;
        modal.dataset.chrisInjecting = '1';

        const poll = setInterval(() => {
            if (modal.querySelector('input[type="checkbox"]')) {
                clearInterval(poll);
                injectButtonsIntoModal(modal);
            }
        }, INJECT_CHECK_INTERVAL);

        setTimeout(() => clearInterval(poll), INJECT_TIMEOUT);
    }

    const observer = new MutationObserver(() => {
        document.querySelectorAll('.modal.show,[role="dialog"]').forEach(ensureInjection);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
