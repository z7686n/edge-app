// TreeSelect 下拉框操作模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.treeSelectOps = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var sleep = utils.sleep;
    var isProcessing = false;
    var operationTimeout = null;

    function matchTargetText(text) {
        if (!text) return false;
        var trimmed = text.trim();
        var target = CONFIG.dropdownTargetText || '无法判断';
        return trimmed === target || trimmed.includes(target);
    }

    return {
        isProcessing: function() {
            return isProcessing;
        },

        selectTreeSelectUnable: async function() {
            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }

            isProcessing = true;
            var startTime = performance.now();

            operationTimeout = setTimeout(function() {
                if (isProcessing) {
                    isProcessing = false;
                    showToast('⏰ 操作超时，请重试', true);
                }
            }, CONFIG.operationTimeout || 30000);

            try {
                var treeSelects = document.querySelectorAll('.ant-tree-select, .ant-select-tree-select');
                if (!treeSelects.length) {
                    showToast('⚠️ 未找到 Tree Select 组件', true);
                    isProcessing = false;
                    clearTimeout(operationTimeout);
                    return;
                }

                var needProcess = [];
                for (var i = 0; i < treeSelects.length; i++) {
                    var select = treeSelects[i];
                    var selectionItem = select.querySelector('.ant-select-selection-item, .ant-select-selection-text');
                    if (selectionItem && matchTargetText(selectionItem.textContent)) {
                        // 已经是目标值，跳过
                    } else {
                        needProcess.push({ index: i, element: select });
                    }
                }

                if (!needProcess.length) {
                    showToast('✅ 所有下拉框已选择目标值');
                    isProcessing = false;
                    clearTimeout(operationTimeout);
                    return;
                }

                for (var j = 0; j < needProcess.length; j++) {
                    var item = needProcess[j];
                    var selector = item.element.querySelector('.ant-select-selector, .ant-select-selection');
                    if (selector) {
                        selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                        selector.click();
                        await sleep(CONFIG.clickDelay || 50);
                    }
                }

                await sleep(CONFIG.dropdownTimeout || 500);

                var allDropdowns = document.querySelectorAll('.ant-select-dropdown, .ant-select-tree-dropdown');
                var visibleDropdowns = [];
                for (var k = 0; k < allDropdowns.length; k++) {
                    var dropdown = allDropdowns[k];
                    var style = window.getComputedStyle(dropdown);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && dropdown.offsetParent !== null) {
                        visibleDropdowns.push(dropdown);
                    }
                }

                var dropdownMap = new Map();
                for (var m = 0; m < Math.min(needProcess.length, visibleDropdowns.length); m++) {
                    dropdownMap.set(needProcess[m].element, visibleDropdowns[m]);
                }

                var successCount = 0;
                var failCount = 0;

                for (var n = 0; n < needProcess.length; n++) {
                    var curItem = needProcess[n];
                    var curDropdown = dropdownMap.get(curItem.element);
                    if (!curDropdown) {
                        failCount++;
                        continue;
                    }

                    var targetNode = null;

                    var treeNodes = curDropdown.querySelectorAll(
                        '.ant-tree-treenode, .ant-select-tree-treenode, .ant-tree-node'
                    );
                    for (var p = 0; p < treeNodes.length; p++) {
                        var node = treeNodes[p];
                        var titleEl = node.querySelector(
                            '.ant-tree-node-content-wrapper, .ant-select-tree-node-content-wrapper, ' +
                            '.ant-tree-title, .ant-select-tree-title, .ant-tree-node-content'
                        );
                        if (titleEl && matchTargetText(titleEl.textContent)) {
                            targetNode = titleEl;
                            break;
                        }
                    }

                    if (!targetNode) {
                        var options = curDropdown.querySelectorAll(
                            '.ant-select-item-option, .ant-select-tree-option, .ant-select-dropdown-menu-item'
                        );
                        for (var q = 0; q < options.length; q++) {
                            var opt = options[q];
                            var content = opt.querySelector(
                                '.ant-select-item-option-content, .ant-select-tree-option-content, .ant-select-dropdown-menu-item-content'
                            ) || opt;
                            if (matchTargetText(content.textContent)) {
                                targetNode = opt;
                                break;
                            }
                        }
                    }

                    if (targetNode) {
                        try {
                            var clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            targetNode.dispatchEvent(clickEvent);
                            successCount++;
                            await sleep(CONFIG.clickDelay || 50);
                        } catch (e) {
                            failCount++;
                        }
                    } else {
                        failCount++;
                    }
                }

                await sleep(200);

                try {
                    var escEvent = new KeyboardEvent('keydown', {
                        key: 'Escape',
                        code: 'Escape',
                        keyCode: 27,
                        which: 27,
                        bubbles: true,
                        cancelable: true,
                        composed: true
                    });
                    document.dispatchEvent(escEvent);
                } catch (e) {
                    try { document.body.click(); } catch (e2) {}
                }

                var elapsed = (performance.now() - startTime).toFixed(0);
                var msg = '🎉 下拉框完成！成功 ' + successCount + ' 个' +
                    (failCount ? '，失败 ' + failCount + ' 个' : '') + ' (' + elapsed + 'ms)';
                showToast(msg);
                return msg;

            } catch (error) {
                showToast('❌ 下拉框执行出错: ' + error.message, true);
                console.error('selectTreeSelectUnable error:', error);
                throw error;
            } finally {
                isProcessing = false;
                clearTimeout(operationTimeout);
            }
        }
    };
})();
