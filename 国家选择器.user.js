// ==UserScript==
// @name          国家选择器
// @namespace     https://github.com/Chris-zidi/tampermonkey-scripts
// @version       2.1.0
// @description   电源规格国家选择器（支持 mkt + stormsend 双站）
// @author        Chris-zidi
// @match         *://*.djiits.com/*
// @grant         none
// @updateURL     https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// @downloadURL   https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// ==/UserScript==

(function () {
    console.log('Chris：国家选择器 v2.1.0 启动');

    /**************** 按钮配置 ****************
     * values : modal型页面用大写，表单型用小写 —— 统一存小写，查找时忽略大小写
     * lang   : 表单型页面同时勾选的语言 value
     ******************************************/
    const BUTTON_CONFIGS = [
        // EN 英语 - 蓝色系
        { name: 'EN美规',  flag: '⭐', values: ['ph','ca'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #4fc3f7 0%, #1976d2 50%, #0d47a1 100%)',
          shadow: '0 4px 15px rgba(25,118,210,0.55)', group: 'EN' },
        { name: 'EN英规',  flag: '⭐', values: ['gb'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #81d4fa 0%, #0288d1 50%, #01579b 100%)',
          shadow: '0 4px 15px rgba(2,136,209,0.55)', group: 'EN' },
        { name: 'EN澳规',  flag: '⭐', values: ['au'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #b3e5fc 0%, #039be5 50%, #0277bd 100%)',
          shadow: '0 4px 15px rgba(3,155,229,0.55)', group: 'EN' },
        { name: 'EN欧规',  flag: '⭐', values: ['be','bg','hr','cz','dk','ee','fi','gr','hu','ie','lv','lt','mt','nl','no','pl','pt','ro','sk','si','se','ch'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #64b5f6 0%, #1565c0 50%, #0a2e6e 100%)',
          shadow: '0 4px 15px rgba(21,101,192,0.55)', group: 'EN' },
        // 中规 - 红色系
        { name: '中规',    flag: '⭐', values: ['cn'],
          lang: 'zh-CN',
          gradient: 'linear-gradient(160deg, #ef9a9a 0%, #e53935 50%, #8b0000 100%)',
          shadow: '0 4px 15px rgba(229,57,53,0.55)', group: 'CN' },
        // 日规 - 朱红橙系
        { name: '日规',    flag: '⭐', values: ['jp'],
          lang: 'ja',
          gradient: 'linear-gradient(160deg, #ffab91 0%, #f4511e 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(244,81,30,0.55)', group: 'JP' },
        // FR 法语 - 橙金系
        { name: 'FR美规',  flag: '⭐', values: ['ca'],
          lang: 'fr',
          gradient: 'linear-gradient(160deg, #ffe082 0%, #ffa000 50%, #e65100 100%)',
          shadow: '0 4px 15px rgba(255,160,0,0.55)', group: 'FR' },
        { name: 'FR欧规',  flag: '⭐', values: ['mc','fr','lu'],
          lang: 'fr',
          gradient: 'linear-gradient(160deg, #ffcc80 0%, #fb8c00 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(251,140,0,0.55)', group: 'FR' },
        // TCN 繁中 - 青绿系
        { name: 'TCN英规', flag: '⭐', values: ['hk','mo'],
          lang: 'zh-TW',
          gradient: 'linear-gradient(160deg, #80deea 0%, #00acc1 50%, #006064 100%)',
          shadow: '0 4px 15px rgba(0,172,193,0.55)', group: 'TCN' },
        // DE 德语 - 深蓝紫系
        { name: 'DE欧规',  flag: '⭐', values: ['at','de','li'],
          lang: 'de',
          gradient: 'linear-gradient(160deg, #9fa8da 0%, #3949ab 50%, #1a237e 100%)',
          shadow: '0 4px 15px rgba(57,73,171,0.55)', group: 'DE' },
        // ES 西语 - 玫红紫系
        { name: 'ES欧规',  flag: '⭐', values: ['es'],
          lang: 'es',
          gradient: 'linear-gradient(160deg, #f48fb1 0%, #d81b60 50%, #880e4f 100%)',
          shadow: '0 4px 15px rgba(216,27,96,0.55)', group: 'ES' },
        // IT 意语 - 翠绿系
        { name: 'IT欧规',  flag: '⭐', values: ['it'],
          lang: 'it',
          gradient: 'linear-gradient(160deg, #a5d6a7 0%, #43a047 50%, #1b5e20 100%)',
          shadow: '0 4px 15px rgba(67,160,71,0.55)', group: 'IT' },
    ];

    const BTN_WIDTH  = 118;
    const BTN_HEIGHT = 40;
    const BTN_GAP    = 3;
    const BTN_RIGHT  = 14;
    const BTN_TOP    = 80;

    /***********************************************
     * 页面类型检测
     * - MODAL  : mkt.djiits.com，checkbox 在弹窗里，value 大写
     * - FORM   : stormsend.djiits.com，checkbox 直接在页面，有 id 前缀 user_horizontal_countries_
     ***********************************************/
    function detectPageType() {
        // 表单型特征：有 name="component_instance[countries][]" 的 checkbox
        if (document.querySelector('input[name="component_instance[countries][]"]')) {
            return 'FORM';
        }
        return 'MODAL';
    }

    /***********************************************
     * 通用 checkbox 工具
     ***********************************************/
    function setChecked(cb, state) {
        if (!cb) return;
        cb.checked = !!state;
    }

    // 在指定容器内按 value 查找 checkbox（大小写不敏感）
    function findCbByValue(container, value) {
        const lower = value.toLowerCase();
        // 先精确匹配
        let cb = container.querySelector(`input[type="checkbox"][value="${lower}"]`);
        if (cb) return cb;
        // 再尝试大写（modal 型页面）
        cb = container.querySelector(`input[type="checkbox"][value="${lower.toUpperCase()}"]`);
        return cb || null;
    }

    /***********************************************
     * MODAL 型逻辑
     ***********************************************/
    function getVisibleModal() {
        for (const el of document.querySelectorAll('[role="dialog"]')) {
            const s = window.getComputedStyle(el);
            if (s.display !== 'none' && s.visibility !== 'hidden') {
                if (el.querySelector('input[type="checkbox"]')) return el;
            }
        }
        return null;
    }

    function applyModal(cfg) {
        const modal = getVisibleModal();
        if (!modal) { console.warn('Chris：没有找到打开的 modal'); return; }
        // 取消所有 checkbox（排除"是否上线"等非国家checkbox，但 modal 里应该只有国家）
        Array.from(modal.querySelectorAll('input[type="checkbox"]'))
            .forEach(cb => setChecked(cb, false));
        // 勾选目标国家
        cfg.values.forEach(val => {
            const cb = findCbByValue(modal, val);
            if (cb) setChecked(cb, true);
            else console.warn(`Chris：modal 找不到 value="${val}"`);
        });
        console.log(`Chris [MODAL]：已应用 ${cfg.name}`);
    }

    /***********************************************
     * FORM 型逻辑
     ***********************************************/
    function applyForm(cfg) {
        // 国家 checkbox：name="component_instance[countries][]"
        const countryCbs = document.querySelectorAll('input[name="component_instance[countries][]"]');
        countryCbs.forEach(cb => setChecked(cb, false));
        cfg.values.forEach(val => {
            const cb = findCbByValue(document, val);
            if (cb && cb.name === 'component_instance[countries][]') {
                setChecked(cb, true);
            } else {
                // 兜底：用 id 查找（id 格式为 user_horizontal_countries_xx）
                const byId = document.getElementById(`user_horizontal_countries_${val.toLowerCase()}`);
                if (byId) setChecked(byId, true);
                else console.warn(`Chris：form 找不到国家 value="${val}"`);
            }
        });

        // 语言 checkbox：name="component_instance[languages][]"
        const langCbs = document.querySelectorAll('input[name="component_instance[languages][]"]');
        langCbs.forEach(cb => setChecked(cb, false));
        if (cfg.lang) {
            // id 格式：user_horizontal_languages_xx
            const langId = `user_horizontal_languages_${cfg.lang}`;
            const langCb = document.getElementById(langId);
            if (langCb) setChecked(langCb, true);
            else console.warn(`Chris：找不到语言 id="${langId}"`);
        }

        console.log(`Chris [FORM]：已应用 ${cfg.name}，语言=${cfg.lang}`);
    }

    /***********************************************
     * 注入全局样式
     ***********************************************/
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
            .chris-btn::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 50%;
                background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%);
                border-radius: 8px 8px 0 0;
                pointer-events: none;
            }
            .chris-btn::after {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 8px;
                box-shadow: inset 0 -2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3);
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    /***********************************************
     * 注入按钮面板
     ***********************************************/
    let panel = null;

    function injectPanel(pageType) {
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
                if (pageType === 'FORM') {
                    applyForm(cfg);
                } else {
                    applyModal(cfg);
                }
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

    function showPanel() {
        if (!panel) return;
        panel.style.display = 'flex';
    }

    function hidePanel() {
        if (panel) panel.style.display = 'none';
    }

    /***********************************************
     * 初始化
     ***********************************************/
    function init() {
        const pageType = detectPageType();
        console.log(`Chris：页面类型 = ${pageType}`);

        injectPanel(pageType);

        if (pageType === 'FORM') {
            // 表单型：直接常驻显示
            showPanel();

        } else {
            // MODAL 型：监听 modal 出现/消失
            showPanel(); // 先隐藏（injectPanel 里 display:none，这里实际不会显示）
            hidePanel();

            const observer = new MutationObserver(() => {
                if (getVisibleModal()) showPanel();
                else hidePanel();
            });
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });

            // 如果 modal 已经打开
            if (getVisibleModal()) showPanel();
        }
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();
