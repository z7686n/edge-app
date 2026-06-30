// ==UserScript==
// @name         标注助手
// @namespace    http://tampermonkey.net/
// @version      3.2.0
// @description  标注助手 - 智能分组 + 编辑功能
// @author       Z
// @match        *://*/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// @updateURL    https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/config.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/utils.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/template-manager.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/tag-ops.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/tree-select-ops.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/ui-panel.js
// ==/UserScript==

(function () {
    'use strict';

    if (window.self !== window.top) return;
    if (!window.isSecureContext) {
        console.warn('⚠️ 标注助手：页面非安全上下文');
        return;
    }

    var logger = {
        info: function(msg) { console.log('🏷️', msg); },
        error: function(msg) { console.error('❌', msg); },
        warn: function(msg) { console.warn('⚠️', msg); }
    };

    var isLoaded = false;
    var retryCount = 0;
    var MAX_RETRIES = 15;
    var RETRY_INTERVAL = 500;

    function loadModule() {
        try {
            if (!window.__MODULES__) {
                throw new Error('模块容器不存在');
            }
            var uiModule = window.__MODULES__.ui;
            if (!uiModule) {
                throw new Error('UI模块不存在');
            }
            if (typeof uiModule.buildAndWatchPanel !== 'function') {
                throw new Error('UI模块API不兼容');
            }
            if (isLoaded) {
                logger.warn('模块已加载，跳过重复初始化');
                return;
            }
            uiModule.buildAndWatchPanel();
            isLoaded = true;
            logger.info('标注助手 v3.2.0 已加载 [智能分组 + 编辑功能]');
            if (window.__retryTimer) {
                clearInterval(window.__retryTimer);
                delete window.__retryTimer;
            }
        } catch (error) {
            logger.error('加载失败 (' + retryCount + '/' + MAX_RETRIES + '):', error.message);
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                if (!window.__retryTimer) {
                    window.__retryTimer = setTimeout(loadModule, RETRY_INTERVAL);
                }
            } else {
                logger.error('模块加载超时，请刷新页面重试');
            }
        }
    }

    var lastUrl = location.href;
    var urlObserver = new MutationObserver(function() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            if (isLoaded) {
                logger.info('检测到页面变化，重新初始化...');
                isLoaded = false;
                setTimeout(loadModule, 1000);
            }
        }
    });

    if (document.readyState === 'complete') {
        urlObserver.observe(document, { subtree: true, childList: true });
    } else {
        window.addEventListener('load', function() {
            urlObserver.observe(document, { subtree: true, childList: true });
        });
    }

    loadModule();

    window.__cleanupAnnotationHelper = function() {
        if (window.__retryTimer) {
            clearInterval(window.__retryTimer);
            delete window.__retryTimer;
        }
        urlObserver.disconnect();
        logger.info('已清理标注助手');
    };

})();
