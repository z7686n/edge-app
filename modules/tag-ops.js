// 标签操作模块 - 支持分组单选/多选
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.tagOps = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var sleep = utils.sleep;
    var templateManager = window.__MODULES__.templateManager;

    var selections = {
        correctness: new Set(),
        evidence: new Set(),
        errorTypes: new Set()
    };
    var isProcessing = false;
    var timeoutId = null;

    function saveSelections() {
        try {
            var data = {};
            for (var key in selections) data[key] = Array.from(selections[key]);
            localStorage.setItem(CONFIG.selectionStorageKey, JSON.stringify(data));
        } catch (e) {}
    }

    function loadSelections() {
        try {
            var data = utils.safeJSONParse(localStorage.getItem(CONFIG.selectionStorageKey));
            if (data) {
                for (var key in data) {
                    if (selections[key]) selections[key] = new Set(data[key]);
                }
                return true;
            }
        } catch (e) {}
        return false;
    }
    loadSelections();

    function getGroupTags(groupId) {
        var tpl = templateManager.getCurrentTemplate();
        if (tpl && tpl.groups) {
            var g = tpl.groups.find(function(gr) { return gr.groupId === groupId; });
            if (g && g.tags) return g.tags;
        }
        return [];
    }

    return {
        getGroupTags: getGroupTags,

        getGroupSelections: function(gid) {
            return selections[gid] || new Set();
        },

        getAllSelectedTags: function() {
            var all = [];
            for (var k in selections) {
                selections[k].forEach(function(t) { all.push(t); });
            }
            return all;
        },

        // 根据分组配置决定单选还是多选
        toggleTag: function(gid, tag) {
            if (!selections[gid]) selections[gid] = new Set();
            var set = selections[gid];
            var group = CONFIG.groups.find(function(g) { return g.id === gid; });
            var isRadio = group && group.type === 'radio';

            if (isRadio) {
                // 单选：清空该组，只选中当前标签
                set.clear();
                set.add(tag);
            } else {
                // 多选：切换当前标签
                if (set.has(tag)) {
                    set.delete(tag);
                } else {
                    set.add(tag);
                }
            }
            saveSelections();
            return set;
        },

        clearAll: function() {
            for (var k in selections) selections[k].clear();
            saveSelections();
        },

        getSelectedCount: function(gid) {
            if (gid) return selections[gid] ? selections[gid].size : 0;
            var total = 0;
            for (var k in selections) total += selections[k].size;
            return total;
        },

        isTagSelected: function(gid, tag) {
            return selections[gid] ? selections[gid].has(tag) : false;
        },

        selectTags: async function(targets) {
            if (isProcessing) { showToast('⏳ 正在执行中...'); return; }
            if (!targets || !targets.length) { showToast('⚠️ 请选择标签', true); return; }
            isProcessing = true;
            var startTime = performance.now();
            timeoutId = setTimeout(function() {
                if (isProcessing) {
                    isProcessing = false;
                    showToast('⏰ 操作超时', true);
                }
            }, CONFIG.operationTimeout);
            try {
                var els = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
                var selected = 0,
                    already = 0,
                    errors = 0;
                var targetSet = new Set(targets);
                for (var i = 0; i < els.length; i++) {
                    var el = els[i];
                    var text = el.textContent.trim();
                    if (!targetSet.has(text)) continue;
                    var checked = el.classList.contains('ant-tag-checkable-checked') ||
                        el.classList.contains('ant-tag-checked') ||
                        el.getAttribute('aria-checked') === 'true';
                    if (checked) { already++; continue; }
                    try {
                        if (document.contains(el)) {
                            el.click();
                            selected++;
                            await sleep(CONFIG.clickDelay);
                        }
                    } catch (e) { errors++; }
                }
                var elapsed = (performance.now() - startTime).toFixed(0);
                showToast('🎉 新选 ' + selected + ' 个，已选 ' + already + ' 个' +
                    (errors ? ' (失败 ' + errors + ')' : '') + ' (' + elapsed + 'ms)');
            } catch (e) {
                showToast('❌ 执行出错: ' + e.message, true);
            } finally {
                isProcessing = false;
                clearTimeout(timeoutId);
            }
        },

        clearAllSelections: function() {
            if (isProcessing) { showToast('⏳ 正在执行中...'); return; }
            var els = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
            var cleared = 0;
            els.forEach(function(el) {
                var checked = el.classList.contains('ant-tag-checkable-checked') ||
                    el.classList.contains('ant-tag-checked') ||
                    el.getAttribute('aria-checked') === 'true';
                if (checked && document.contains(el)) {
                    try { el.click();
                        cleared++; } catch (e) {}
                }
            });
            for (var k in selections) selections[k].clear();
            saveSelections();
            showToast('🔄 已取消 ' + cleared + ' 个选中');
        },

        refreshSelections: function() {
            var groups = CONFIG.groups;
            groups.forEach(function(group) {
                var tags = getGroupTags(group.id);
                var tagSet = new Set(tags);
                if (selections[group.id]) {
                    var toRemove = [];
                    selections[group.id].forEach(function(tag) {
                        if (!tagSet.has(tag)) toRemove.push(tag);
                    });
                    toRemove.forEach(function(tag) { selections[group.id].delete(tag); });
                }
            });
            saveSelections();
        },

        isProcessing: function() { return isProcessing; }
    };
})();
