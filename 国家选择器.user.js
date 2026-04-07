// ==UserScript==
// @name          国家Selector
// @namespace     https://github.com/Chris-zidi/tampermonkey-scripts
// @version       2.3.0
// @description   电源规格国家选择器（支持 mkt + stormsend 双站）
// @author        Chris-zidi
// @match         *://*.djiits.com/*
// @grant         none
// @updateURL     https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// @downloadURL   https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// ==/UserScript==

(function () {
    console.log('Chris：国家Selector v2.3.0 启动');

    /**************** 按钮配置 ****************
     * values   : 国家代码（小写）
     * lang     : 语言代码，支持字符串或数组（表单型页面用）
     * formOnly : true  = 只在 FORM 页面显示（Stormsend）
     *            false = 只在 MODAL 页面显示（mkt）
     *            不设置 = 两个页面都显示
     ******************************************/
    const BUTTON_CONFIGS = [
        // ── EN 英语 - 蓝色系 ───────────────────────────────────────
        // EN美规：仅 mkt
        { name: 'EN美规',  flag: '⭐', formOnly: false, values: ['ph','ca'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #4fc3f7 0%, #1976d2 50%, #0d47a1 100%)',
          shadow: '0 4px 15px rgba(25,118,210,0.55)', group: 'EN' },
        // EN英规：两个页面都显示
        { name: 'EN英规',  flag: '⭐', values: ['gb'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #81d4fa 0%, #0288d1 50%, #01579b 100%)',
          shadow: '0 4px 15px rgba(2,136,209,0.55)', group: 'EN' },
        // EN澳规：两个页面都显示
        { name: 'EN澳规',  flag: '⭐', values: ['au'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #b3e5fc 0%, #039be5 50%, #0277bd 100%)',
          shadow: '0 4px 15px rgba(3,155,229,0.55)', group: 'EN' },
        // EN欧规：仅 mkt
        { name: 'EN欧规',  flag: '⭐', formOnly: false, values: ['be','bg','hr','cz','dk','ee','fi','gr','hu','ie','lv','lt','mt','nl','no','pl','pt','ro','sk','si','se','ch'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #64b5f6 0%, #1565c0 50%, #0a2e6e 100%)',
          shadow: '0 4px 15px rgba(21,101,192,0.55)', group: 'EN' },
        // ── 中规 - 红色系 ──────────────────────────────────────────
        { name: '中规',    flag: '⭐', values: ['cn'],
          lang: 'zh-CN',
          gradient: 'linear-gradient(160deg, #ef9a9a 0%, #e53935 50%, #8b0000 100%)',
          shadow: '0 4px 15px rgba(229,57,53,0.55)', group: 'CN' },
        // ── 日规 - 朱红橙系 ────────────────────────────────────────
        { name: '日规',    flag: '⭐', values: ['jp'],
          lang: 'ja',
          gradient: 'linear-gradient(160deg, #ffab91 0%, #f4511e 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(244,81,30,0.55)', group: 'JP' },
        // ── FR 法语 - 橙金系（仅 mkt）─────────────────────────────
        { name: 'FR美规',  flag: '⭐', formOnly: false, values: ['ca'],
          lang: 'fr',
          gradient: 'linear-gradient(160deg, #ffe082 0%, #ffa000 50%, #e65100 100%)',
          shadow: '0 4px 15px rgba(255,160,0,0.55)', group: 'FR' },
        { name: 'FR欧规',  flag: '⭐', formOnly: false, values: ['mc','fr','lu'],
          lang: 'fr',
          gradient: 'linear-gradient(160deg, #ffcc80 0%, #fb8c00 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(251,140,0,0.55)', group: 'FR' },
        // ── TCN 繁中 - 青绿系 ──────────────────────────────────────
        { name: 'TCN英规', flag: '⭐', values: ['hk','mo'],
          lang: 'zh-TW',
          gradient: 'linear-gradient(160deg, #80deea 0%, #00acc1 50%, #006064 100%)',
          shadow: '0 4px 15px rgba(0,172,193,0.55)', group: 'TCN' },
        // ── DE 德语 - 深蓝紫系（仅 mkt）──────────────────────────
        { name: 'DE欧规',  flag: '⭐', formOnly: false, values: ['at','de','li'],
          lang: 'de',
          gradient: 'linear-gradient(160deg, #9fa8da 0%, #3949ab 50%, #1a237e 100%)',
          shadow: '0 4px 15px rgba(57,73,171,0.55)', group: 'DE' },
        // ── ES 西语 - 玫红紫系（仅 mkt）──────────────────────────
        { name: 'ES欧规',  flag: '⭐', formOnly: false, values: ['es'],
          lang: 'es',
          gradient: 'linear-gradient(160deg, #f48fb1 0%, #d81b60 50%, #880e4f 100%)',
          shadow: '0 4px 15px rgba(216,27,96,0.55)', group: 'ES' },
        // ── IT 意语 - 翠绿系（仅 mkt）────────────────────────────
        { name: 'IT欧规',  flag: '⭐', formOnly: false, values: ['it'],
          lang: 'it',
          gradient: 'linear-gradient(160deg, #a5d6a7 0%, #43a047 50%, #1b5e20 100%)',
          shadow: '0 4px 15px rgba(67,160,71,0.55)', group: 'IT' },

        // ── FORM 专用（Stormsend）──────────────────────────────────
        // 通用美规 = EN美规(ph,ca) + FR美规(ca) → ph,ca + 语言 en,fr
        { name: '通用美规', flag: '⭐', formOnly: true,
          values: ['ph','ca'],
          lang: ['en','fr'],
          gradient: 'linear-gradient(160deg, #4fc3f7 0%, #1976d2 50%, #0d47a1 100%)',
          shadow: '0 4px 15px rgba(25,118,210,0.55)', group: 'FORM' },
        // 通用欧规 = EN欧规+FR欧规+DE欧规+ES欧规+IT欧规 → 全部国家 + 语言 en,fr,de,es,it
        { name: '通用欧规', flag: '⭐', formOnly: true,
          values: ['be','bg','hr','cz','dk','ee','fi','gr','hu','ie','lv','lt','mt','nl','no','pl','pt','ro','sk','si','se','ch','mc','fr','lu','at','de','li','es','it'],
          lang: ['en','fr','de','es','it'],
          gradient: 'linear-gradient(160deg, #ce93d8 0%, #7b1fa2 50%, #4a0072 100%)',
          shadow: '0 4px 15px rgba(123,31,162,0.55)', group: 'FORM' },
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
        // 国家 checkbox
        const countryCbs = document.querySelectorAll('input[name="component_instance[countries][]"]');
        countryCbs.forEach(cb => setChecked(cb, false));
        cfg.values.forEach(val => {
            const byId = document.getElementById(`user_horizontal_countries_${val.toLowerCase()}`);
            if (byId) setChecked(byId, true);
            else console.warn(`Chris：form 找不到国家 value="${val}"`);
        });

        // 语言 checkbox（支持字符串或数组）
        const langCbs = document.querySelectorAll('input[name="component_instance[languages][]"]');
        langCbs.forEach(cb => setChecked(cb, false));
        const langs = Array.isArray(cfg.lang) ? cfg.lang : (cfg.lang ? [cfg.lang] : []);
        langs.forEach(lang => {
            const langCb = document.getElementById(`user_horizontal_languages_${lang}`);
            if (langCb) setChecked(langCb, true);
            else console.warn(`Chris：找不到语言 id="user_horizontal_languages_${lang}"`);
        });

        console.log(`Chris [FORM]：已应用 ${cfg.name}，语言=${langs.join(',')}`);
    }

    /***********************************************
     * 注入全局样式
     ***********************************************/
    function injectStyles() {
        if (document.getElementById('chris-country-style')) return;
        const style = document.createElement('style');
        style.id = 'chris-country-style';
        style.textContent = `
            #chris-country-panel { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
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
            /* 收起/展开箭头按钮 */
            #chris-toggle-btn {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: none;
                background: rgba(255,255,255,0.92);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                transition: transform 0.2s ease, background 0.2s ease;
                pointer-events: auto;
                align-self: flex-end;
                margin-bottom: 4px;
            }
            #chris-toggle-btn:hover { background: #fff; transform: scale(1.1); }
            #chris-btn-list {
                display: flex;
                flex-direction: column;
                gap: ${BTN_GAP}px;
                overflow: hidden;
                transition: opacity 0.2s ease;
            }
            #chris-btn-list.collapsed {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    /***********************************************
     * 注入按钮面板（防止重复注入）
     ***********************************************/
    let panel = null;

    function injectPanel(pageType) {
        // 防止页面嵌套导致重复注入
        if (document.getElementById('chris-country-panel')) {
            panel = document.getElementById('chris-country-panel');
            return;
        }
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
            align-items: flex-end;
            gap: 0;
            pointer-events: none;
        `;

        // 收起/展开箭头按钮（默认收起：箭头朝左 ‹，展开后朝右 ›）
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'chris-toggle-btn';
        toggleBtn.textContent = '›';
        toggleBtn.title = '展开/收起';

        // 按钮列表容器，默认收起
        const btnList = document.createElement('div');
        btnList.id = 'chris-btn-list';
        btnList.classList.add('collapsed');

        let expanded = false;
        toggleBtn.onclick = e => {
            e.stopPropagation();
            e.preventDefault();
            expanded = !expanded;
            if (expanded) {
                btnList.classList.remove('collapsed');
                toggleBtn.textContent = '›'; // 展开时箭头朝右（点击收起）
                toggleBtn.style.transform = 'rotate(180deg)';
            } else {
                btnList.classList.add('collapsed');
                toggleBtn.textContent = '›';
                toggleBtn.style.transform = 'rotate(0deg)';
            }
        };

        // 过滤逻辑
        const visibleConfigs = BUTTON_CONFIGS.filter(cfg => {
            if (cfg.formOnly === true)  return pageType === 'FORM';
            if (cfg.formOnly === false) return pageType === 'MODAL';
            return true;
        });

        visibleConfigs.forEach(cfg => {
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
                margin-bottom: ${BTN_GAP}px;
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
                if (pageType === 'FORM') applyForm(cfg);
                else applyModal(cfg);
                btn.style.transform = 'scale(0.92)';
                btn.style.filter = 'brightness(0.9)';
                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                    btn.style.filter = 'brightness(1)';
                }, 150);
            };
            btnList.appendChild(btn);
        });

        panel.appendChild(toggleBtn);
        panel.appendChild(btnList);
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
