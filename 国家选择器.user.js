// ==UserScript==
// @name          国家Selector
// @namespace     https://github.com/Chris-zidi/tampermonkey-scripts
// @version       2.9.5
// @description   电源规格国家选择器（支持 mkt弹窗 + mkt表单 + stormsend 三种页面）
// @author        Chris-zidi
// @match         *://*.djiits.com/*
// @grant         none
// @updateURL     https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// @downloadURL   https://raw.githubusercontent.com/Chris-zidi/tampermonkey-scripts/main/%E5%9B%BD%E5%AE%B6%E9%80%89%E6%8B%A9%E5%99%A8.user.js
// ==/UserScript==

(function () {
    console.log('Chris：国家Selector v2.9.4 启动');

    /**************** 累加模式（默认关闭）****************/
    let accumulateMode = false;

    /**************** 按钮配置 ****************
     * values    : 国家代码（小写）
     * lang      : 语言代码，支持字符串或数组（Stormsend 用）
     * showIn    : 数组，指定在哪些页面类型显示。不设置 = 所有页面都显示
     *             可选值：'MODAL'、'FORM'、'FORM_MKT'
     ******************************************/
    const BUTTON_CONFIGS = [
        // ── 通用系（排最前）─────────────────────────────────────────
        { name: '通用美规', flag: '⭐', values: ['ph','ca'],
          lang: ['en','fr'],
          gradient: 'linear-gradient(160deg, #4fc3f7 0%, #1976d2 50%, #0d47a1 100%)',
          shadow: '0 4px 15px rgba(25,118,210,0.55)' },
        { name: '通用英规', flag: '⭐', values: ['gb','hk','mo','ie','mt'],
          lang: ['en','zh-TW'],
          gradient: 'linear-gradient(160deg, #80cbc4 0%, #00897b 50%, #004d40 100%)',
          shadow: '0 4px 15px rgba(0,137,123,0.55)' },
        { name: '通用欧规', flag: '⭐',
          values: ['be','bg','hr','cz','dk','ee','fi','gr','hu','lv','lt','nl','pl','pt','ro','sk','si','se','fr','lu','at','de','es','it'],
          lang: ['en','fr','de','es','it'],
          gradient: 'linear-gradient(160deg, #ce93d8 0%, #7b1fa2 50%, #4a0072 100%)',
          shadow: '0 4px 15px rgba(123,31,162,0.55)' },
        { name: '通用澳规', flag: '⭐', values: ['au'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #ffcc80 0%, #ef6c00 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(239,108,0,0.55)' },

        // ── EN 英语系 ───────────────────────────────────────────────
        { name: 'EN美规',  flag: '⭐', values: ['ph','ca'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #4fc3f7 0%, #1976d2 50%, #0d47a1 100%)',
          shadow: '0 4px 15px rgba(25,118,210,0.55)' },
        { name: 'EN英规',  flag: '⭐', values: ['gb','ie','mt'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #81d4fa 0%, #0288d1 50%, #01579b 100%)',
          shadow: '0 4px 15px rgba(2,136,209,0.55)' },
        { name: 'EN欧规',  flag: '⭐', values: ['be','bg','hr','cz','dk','ee','fi','gr','hu','lv','lt','nl','pl','pt','ro','sk','si','se'],
          lang: 'en',
          gradient: 'linear-gradient(160deg, #64b5f6 0%, #1565c0 50%, #0a2e6e 100%)',
          shadow: '0 4px 15px rgba(21,101,192,0.55)' },

        // ── FR 法语系 ───────────────────────────────────────────────
        { name: 'FR美规',  flag: '⭐', values: ['ca'],
          lang: 'fr',
          gradient: 'linear-gradient(160deg, #ffe082 0%, #ffa000 50%, #e65100 100%)',
          shadow: '0 4px 15px rgba(255,160,0,0.55)' },
        { name: 'FR欧规',  flag: '⭐', values: ['fr','lu'],
          lang: 'fr',
          gradient: 'linear-gradient(160deg, #ffcc80 0%, #fb8c00 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(251,140,0,0.55)' },

        // ── TCN 繁中 ────────────────────────────────────────────────
        { name: 'TCN英规', flag: '⭐', values: ['hk','mo'],
          lang: 'zh-TW',
          gradient: 'linear-gradient(160deg, #80deea 0%, #00acc1 50%, #006064 100%)',
          shadow: '0 4px 15px rgba(0,172,193,0.55)' },

        // ── DE 德语 ─────────────────────────────────────────────────
        { name: 'DE欧规',  flag: '⭐', values: ['at','de'],
          lang: 'de',
          gradient: 'linear-gradient(160deg, #9fa8da 0%, #3949ab 50%, #1a237e 100%)',
          shadow: '0 4px 15px rgba(57,73,171,0.55)' },

        // ── ES 西语 ─────────────────────────────────────────────────
        { name: 'ES欧规',  flag: '⭐', values: ['es'],
          lang: 'es',
          gradient: 'linear-gradient(160deg, #f48fb1 0%, #d81b60 50%, #880e4f 100%)',
          shadow: '0 4px 15px rgba(216,27,96,0.55)' },

        // ── IT 意语 ─────────────────────────────────────────────────
        { name: 'IT欧规',  flag: '⭐', values: ['it'],
          lang: 'it',
          gradient: 'linear-gradient(160deg, #a5d6a7 0%, #43a047 50%, #1b5e20 100%)',
          shadow: '0 4px 15px rgba(67,160,71,0.55)' },

        // ── 中规 ────────────────────────────────────────────────────
        { name: '中规',    flag: '⭐', values: ['cn'],
          lang: 'zh-CN',
          gradient: 'linear-gradient(160deg, #ef9a9a 0%, #e53935 50%, #8b0000 100%)',
          shadow: '0 4px 15px rgba(229,57,53,0.55)' },

        // ── 日规 ────────────────────────────────────────────────────
        { name: '日规',    flag: '⭐', values: ['jp'],
          lang: 'ja',
          gradient: 'linear-gradient(160deg, #ffab91 0%, #f4511e 50%, #bf360c 100%)',
          shadow: '0 4px 15px rgba(244,81,30,0.55)' },
    ];

    const BTN_WIDTH  = 118;
    const BTN_HEIGHT = 40;
    const BTN_GAP    = 3;
    const BTN_RIGHT  = 14;
    const BTN_TOP    = 80;

    /***********************************************
     * 页面类型检测
     * - MODAL    : mkt.djiits.com core_selling_points，checkbox 在弹窗里
     * - FORM     : stormsend.djiits.com，checkbox 直接在页面，有语言选择
     * - FORM_MKT : mkt.djiits.com EAN 等页面，checkbox 直接在页面，无语言选择，React 组件
     ***********************************************/
    function detectPageType() {
        // Stormsend 表单型
        if (document.querySelector('input[name="component_instance[countries][]"]')) {
            return 'FORM';
        }
        // mkt EAN 等表单型（checkbox 直接在页面，不在 modal 里）
        if (document.querySelector('input[name="ean[country_codes][]"]')) {
            return 'FORM_MKT';
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
     * MODAL 型逻辑（mkt 页面）
     * 通过 React 组件实例的 updateCountries 方法直接更新数据
     * 路径：modal 父级 → textarea[readonly] → React _owner._instance
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

    function getReactInstance(modal) {
        // 方法1：从 textarea 的 _owner 链找（core_selling_points 页面）
        const parent = modal.parentElement;
        if (parent) {
            const textarea = parent.querySelector('textarea[readonly]');
            if (textarea) {
                const rk = Object.keys(textarea).find(k => k.startsWith('__reactInternalInstance'));
                if (rk) {
                    const owner = textarea[rk]._currentElement?._owner;
                    if (owner?._instance?.state?.selectedCountries) {
                        return owner._instance;
                    }
                }
            }
        }

        // 方法2：从 modal 内任意 checkbox 的 _owner 链找（in_the_boxes 等页面）
        const cb = modal.querySelector('input[type="checkbox"]');
        if (cb) {
            const crk = Object.keys(cb).find(k => k.startsWith('__reactInternalInstance'));
            if (crk) {
                let current = cb[crk]._currentElement?._owner;
                let d = 0;
                while (current && d < 10) {
                    if (current._instance?.state?.selectedCountries) {
                        return current._instance;
                    }
                    current = current._currentElement?._owner;
                    d++;
                }
            }
        }

        return null;
    }

    function applyModal(cfg) {
        const modal = getVisibleModal();
        if (!modal) { console.warn('Chris：没有找到打开的 modal'); return; }

        const instance = getReactInstance(modal);
        if (instance && instance.state && instance.state.selectedCountries) {
            const upperValues = cfg.values.map(v => v.toUpperCase());
            let newValues;
            if (accumulateMode) {
                newValues = [...new Set([...instance.state.selectedCountries, ...upperValues])];
            } else {
                newValues = upperValues;
            }
            // 优先用 updateCountries（in_the_boxes 等页面需要），没有再降级用 setState
            if (typeof instance.updateCountries === 'function') {
                instance.updateCountries(newValues);
                console.log(`Chris [MODAL/updateCountries${accumulateMode ? '/累加' : ''}]：已应用 ${cfg.name}（${newValues.join(',')}）`);
            } else {
                instance.setState({ selectedCountries: newValues }, function() {
                    instance.forceUpdate();
                });
                console.log(`Chris [MODAL/setState${accumulateMode ? '/累加' : ''}]：已应用 ${cfg.name}（${newValues.join(',')}）`);
            }
        } else {
            console.warn('Chris [MODAL]：未找到 React 实例，降级为 checked 方式');
            if (!accumulateMode) {
                Array.from(modal.querySelectorAll('input[type="checkbox"]'))
                    .forEach(cb => { cb.checked = false; });
            }
            cfg.values.forEach(val => {
                const cb = findCbByValue(modal, val);
                if (cb) cb.checked = true;
            });
        }
    }

    /***********************************************
     * FORM 型逻辑
     ***********************************************/
    function applyForm(cfg) {
        // 国家 checkbox
        const countryCbs = document.querySelectorAll('input[name="component_instance[countries][]"]');
        if (!accumulateMode) countryCbs.forEach(cb => setChecked(cb, false));
        cfg.values.forEach(val => {
            const byId = document.getElementById(`user_horizontal_countries_${val.toLowerCase()}`);
            if (byId) setChecked(byId, true);
            else console.warn(`Chris：form 找不到国家 value="${val}"`);
        });

        // 语言 checkbox（支持字符串或数组）
        const langCbs = document.querySelectorAll('input[name="component_instance[languages][]"]');
        if (!accumulateMode) langCbs.forEach(cb => setChecked(cb, false));
        const langs = Array.isArray(cfg.lang) ? cfg.lang : (cfg.lang ? [cfg.lang] : []);
        langs.forEach(lang => {
            const langCb = document.getElementById(`user_horizontal_languages_${lang}`);
            if (langCb) setChecked(langCb, true);
            else console.warn(`Chris：找不到语言 id="user_horizontal_languages_${lang}"`);
        });

        console.log(`Chris [FORM${accumulateMode ? '/累加' : ''}]：已应用 ${cfg.name}，语言=${langs.join(',')}`);
    }

    /***********************************************
     * FORM_MKT 型逻辑（mkt EAN 等页面，React 组件）
     * 从 checkbox 的 _owner 链获取 React 实例，用 setState 更新
     ***********************************************/
    function getReactInstanceFromCheckbox(checkboxName) {
        const cb = document.querySelector(`input[name="${checkboxName}"]`);
        if (!cb) return null;
        const rk = Object.keys(cb).find(k => k.startsWith('__reactInternalInstance'));
        if (!rk) return null;
        let current = cb[rk]._currentElement?._owner;
        let d = 0;
        while (current && d < 10) {
            if (current._instance && current._instance.state && current._instance.state.selectedCountries) {
                return current._instance;
            }
            current = current._currentElement?._owner;
            d++;
        }
        return null;
    }

    function applyFormMkt(cfg) {
        const instance = getReactInstanceFromCheckbox('ean[country_codes][]');
        if (instance) {
            const upperValues = cfg.values.map(v => v.toUpperCase());
            let newValues;
            if (accumulateMode) {
                newValues = [...new Set([...instance.state.selectedCountries, ...upperValues])];
            } else {
                newValues = upperValues;
            }
            instance.setState({ selectedCountries: newValues }, function() {
                instance.forceUpdate();
            });
            console.log(`Chris [FORM_MKT${accumulateMode ? '/累加' : ''}]：已应用 ${cfg.name}（${newValues.join(',')}）`);
        } else {
            console.warn('Chris [FORM_MKT]：未找到 React 实例');
        }
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
            /* 累加模式开关 */
            #chris-accumulate-btn {
                width: ${BTN_WIDTH}px;
                height: 30px;
                border-radius: 6px;
                border: 2px solid rgba(255,255,255,0.5);
                cursor: pointer;
                font-size: 12px;
                font-weight: 700;
                font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
                pointer-events: auto;
                transition: all 0.2s ease;
                margin-bottom: 6px;
                text-align: center;
                letter-spacing: 0.5px;
            }
            #chris-accumulate-btn.off {
                background: rgba(120,120,120,0.7);
                color: rgba(255,255,255,0.8);
            }
            #chris-accumulate-btn.on {
                background: linear-gradient(135deg, #43a047, #66bb6a);
                color: #fff;
                border-color: rgba(255,255,255,0.7);
                box-shadow: 0 0 12px rgba(67,160,71,0.5);
            }
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

        // 收起/展开箭头按钮（默认展开，箭头旋转180度）
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'chris-toggle-btn';
        toggleBtn.textContent = '›';
        toggleBtn.title = '展开/收起';
        toggleBtn.style.transform = 'rotate(180deg)';

        // 按钮列表容器，默认展开
        const btnList = document.createElement('div');
        btnList.id = 'chris-btn-list';

        let expanded = true;
        toggleBtn.onclick = e => {
            e.stopPropagation();
            e.preventDefault();
            expanded = !expanded;
            if (expanded) {
                btnList.classList.remove('collapsed');
                toggleBtn.style.transform = 'rotate(180deg)';
            } else {
                btnList.classList.add('collapsed');
                toggleBtn.style.transform = 'rotate(0deg)';
            }
        };

        // 累加模式开关按钮（默认关闭）
        const accBtn = document.createElement('button');
        accBtn.id = 'chris-accumulate-btn';
        accBtn.className = 'off';
        accBtn.textContent = '累加：关';
        accBtn.onclick = e => {
            e.stopPropagation();
            e.preventDefault();
            accumulateMode = !accumulateMode;
            if (accumulateMode) {
                accBtn.className = 'on';
                accBtn.textContent = '累加：开';
            } else {
                accBtn.className = 'off';
                accBtn.textContent = '累加：关';
            }
            console.log(`Chris：累加模式 ${accumulateMode ? '开启' : '关闭'}`);
        };

        // 过滤逻辑
        // showIn 数组：指定在哪些页面显示，不设置则所有页面都显示
        const visibleConfigs = BUTTON_CONFIGS.filter(cfg => {
            if (cfg.showIn) return cfg.showIn.includes(pageType);
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
                else if (pageType === 'FORM_MKT') applyFormMkt(cfg);
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
        btnList.insertBefore(accBtn, btnList.firstChild);
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

        if (pageType === 'FORM' || pageType === 'FORM_MKT') {
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
