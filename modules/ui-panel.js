// UI 面板模块 - 渲染、交互、编辑模式
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.ui = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var tagOps = window.__MODULES__.tagOps;
    var templateManager = window.__MODULES__.templateManager;
    var treeSelectOps = window.__MODULES__.treeSelectOps;
    var $ = utils.$,
        $$ = utils.$$,
        showToast = utils.showToast;

    var panel = null;
    var isMinimized = false;
    var editMode = false;

    function savePosition(top, right) {
        try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ top: top, right: right })); } catch (e) {}
    }

    function loadPosition() {
        try {
            var saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
            if (saved && typeof saved.top === 'number' && typeof saved.right === 'number') return saved;
        } catch (e) {}
        return { top: CONFIG.defaultPosition.top, right: CONFIG.defaultPosition.right };
    }

    function getGroupTags(gid) {
        var tpl = templateManager.getCurrentTemplate();
        if (tpl && tpl.groups) {
            var g = tpl.groups.find(function(gr) { return gr.groupId === gid; });
            if (g && g.tags) return g.tags;
        }
        return [];
    }

    function updateButtons() {
        var groups = CONFIG.groups;
        groups.forEach(function(group) {
            var container = document.getElementById('group-' + group.id + '-tags');
            if (!container) return;
            var btns = container.querySelectorAll('.tag-btn');
            var selected = tagOps.getGroupSelections(group.id);
            btns.forEach(function(btn) {
                var tag = btn.dataset.tag;
                if (selected.has(tag)) {
                    btn.classList.add('active');
                    btn.style.background = '#4fc3f7';
                    btn.style.color = '#1a1a2e';
                    btn.style.borderColor = '#4fc3f7';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.color = '#ccc';
                    btn.style.borderColor = '#444';
                }
            });
            var countEl = document.getElementById('group-' + group.id + '-count');
            if (countEl) {
                var tags = getGroupTags(group.id);
                countEl.textContent = selected.size + '/' + tags.length;
            }
        });
        updateStatus();
    }

    function toggleTag(gid, tag) {
        tagOps.toggleTag(gid, tag);
        updateButtons();
    }

    function updateStatus(msg) {
        var bar = document.getElementById('tag-status-bar');
        if (bar) {
            var total = tagOps.getSelectedCount();
            var parts = [];
            CONFIG.groups.forEach(function(g) { parts.push(g.label + ': ' + tagOps.getSelectedCount(g.id)); });
            var tpl = templateManager.getCurrentTemplate();
            var name = tpl ? tpl.name : '无模板';
            bar.textContent = msg || '📂 ' + name + ' | ' + parts.join(' | ') + ' | 总计: ' + total;
            if (msg) {
                bar.style.color = '#4fc3f7';
                setTimeout(function() { if (bar) bar.style.color = '#888'; }, 3000);
            }
        }
    }

    function addTagToGroup(gid) {
        var newTag = prompt('请输入要添加的标签文本:');
        if (!newTag || !newTag.trim()) return;
        newTag = newTag.trim();
        var tpl = templateManager.getCurrentTemplate();
        if (!tpl) { showToast('⚠️ 请先创建模板', true); return; }
        var group = tpl.groups.find(function(g) { return g.groupId === gid; });
        if (!group) return;
        if (group.tags.indexOf(newTag) !== -1) { showToast('⚠️ 标签已存在', true); return; }
        group.tags.push(newTag);
        templateManager.editTemplate(tpl.id, tpl.groups);
        renderUI();
        showToast('✅ 已添加: ' + newTag);
    }

    function removeTagFromGroup(gid, tag) {
        if (!confirm('删除标签 "' + tag + '" ？')) return;
        var tpl = templateManager.getCurrentTemplate();
        if (!tpl) return;
        var group = tpl.groups.find(function(g) { return g.groupId === gid; });
        if (!group) return;
        var idx = group.tags.indexOf(tag);
        if (idx !== -1) {
            group.tags.splice(idx, 1);
            templateManager.editTemplate(tpl.id, tpl.groups);
            var sel = tagOps.getGroupSelections(gid);
            if (sel.has(tag)) sel.delete(tag);
            renderUI();
            showToast('🗑️ 已删除: ' + tag);
        }
    }

    function moveTagToGroup(tag, fromGid, toGid) {
        if (fromGid === toGid) return;
        var tpl = templateManager.getCurrentTemplate();
        if (!tpl) return;
        var fromG = tpl.groups.find(function(g) { return g.groupId === fromGid; });
        var toG = tpl.groups.find(function(g) { return g.groupId === toGid; });
        if (!fromG || !toG) return;
        var idx = fromG.tags.indexOf(tag);
        if (idx === -1) return;
        fromG.tags.splice(idx, 1);
        if (toG.tags.indexOf(tag) === -1) toG.tags.push(tag);
        templateManager.editTemplate(tpl.id, tpl.groups);
        renderUI();
        showToast('↔️ 已移动: ' + tag);
    }

    function renderUI() {
        var container = document.getElementById('groups-container');
        if (!container) return;
        container.innerHTML = '';
        var groups = CONFIG.groups;

        groups.forEach(function(group) {
            var tags = getGroupTags(group.id);
            var selected = tagOps.getGroupSelections(group.id);
            var typeLabel = group.type === 'radio' ? '（单选）' : '（多选）';

            var gDiv = document.createElement('div');
            gDiv.className = 'group-container';
            gDiv.style.cssText = 'margin-bottom:8px;border:1px solid #2a2a4a;border-radius:8px;padding:8px 10px;background:rgba(255,255,255,0.02);transition:all 0.2s;';

            var header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;cursor:pointer;';
            header.addEventListener('click', function() {
                var content = document.getElementById('group-' + group.id + '-tags');
                if (content) {
                    var hidden = content.style.display === 'none';
                    content.style.display = hidden ? 'flex' : 'none';
                    var icon = this.querySelector('.collapse-icon');
                    if (icon) icon.textContent = hidden ? '▼' : '▶';
                }
            });

            var left = document.createElement('span');
            left.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
            left.innerHTML =
                '<span style="font-size:16px;">' + group.icon + '</span>' +
                '<span style="font-size:13px;font-weight:bold;color:#eee;">' + group.label + '</span>' +
                '<span style="font-size:10px;color:#888;background:rgba(255,255,255,0.06);padding:0 6px;border-radius:3px;">' + typeLabel + '</span>' +
                '<span class="collapse-icon" style="font-size:11px;color:#666;">▼</span>';

            var right = document.createElement('span');
            right.style.cssText = 'display:flex;align-items:center;gap:6px;';
            var count = document.createElement('span');
            count.id = 'group-' + group.id + '-count';
            count.style.cssText = 'font-size:11px;color:#4fc3f7;';
            count.textContent = selected.size + '/' + tags.length;
            right.append(count);

            if (editMode) {
                var addBtn = document.createElement('button');
                addBtn.textContent = '+';
                addBtn.style.cssText = 'background:#4fc3f7;color:#1a1a2e;border:none;border-radius:50%;width:20px;height:20px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
                addBtn.title = '添加标签';
                addBtn.addEventListener('click', function(e) { e.stopPropagation();
                    addTagToGroup(group.id); });
                right.append(addBtn);
            }

            header.append(left);
            header.append(right);
            gDiv.append(header);

            var tagContainer = document.createElement('div');
            tagContainer.id = 'group-' + group.id + '-tags';
            tagContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:2px 0;max-height:150px;overflow-y:auto;';

            if (tags.length === 0) {
                var empty = document.createElement('span');
                empty.style.cssText = 'color:#666;font-size:12px;padding:4px 0;';
                empty.textContent = editMode ? '点击 + 添加标签' : '暂无标签';
                tagContainer.append(empty);
            } else {
                tags.forEach(function(tag) {
                    if (!tag) return;
                    var btn = document.createElement('button');
                    btn.className = 'tag-btn';
                    btn.dataset.tag = tag;
                    btn.textContent = tag;
                    btn.style.cssText = 'padding:3px 10px;border-radius:4px;border:1px solid #444;background:transparent;color:#ccc;cursor:pointer;font-size:12px;transition:all 0.15s;font-family:inherit;white-space:nowrap;';
                    if (selected.has(tag)) {
                        btn.classList.add('active');
                        btn.style.background = '#4fc3f7';
                        btn.style.color = '#1a1a2e';
                        btn.style.borderColor = '#4fc3f7';
                    }
                    btn.addEventListener('click', function(e) {
                        if (editMode) {
                            e.stopPropagation();
                            if (confirm('删除标签 "' + tag + '" ？')) {
                                removeTagFromGroup(group.id, tag);
                                renderUI();
                                updateButtons();
                            }
                        } else {
                            toggleTag(group.id, tag);
                            updateButtons();
                        }
                    });
                    btn.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        if (!editMode) return;
                        var target = prompt('移动到哪个组？(correctness/evidence/errorTypes)');
                        if (target && CONFIG.groups.some(function(g) { return g.id === target; })) {
                            moveTagToGroup(tag, group.id, target);
                        }
                    });
                    if (editMode) { btn.title = '点击删除 | 右键移动';
                        btn.style.opacity = '0.8'; }
                    tagContainer.append(btn);
                });
            }

            gDiv.append(tagContainer);
            container.append(gDiv);
        });

        updateButtons();
    }

    function updateSelector() {
        var sel = document.getElementById('template-selector');
        if (!sel) return;
        var currentId = templateManager.getCurrentId();
        var list = templateManager.getTemplateList();
        sel.innerHTML = '';
        var def = document.createElement('option');
        def.value = '';
        def.textContent = '-- 选择模板 --';
        sel.append(def);
        list.forEach(function(t) {
            var opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name + ' (' + t.count + '个)';
            if (t.id === currentId) opt.selected = true;
            sel.append(opt);
        });
        var create = document.createElement('option');
        create.value = '__create__';
        create.textContent = '+ 新建模板';
        sel.append(create);
        var auto = document.createElement('option');
        auto.value = '__auto__';
        auto.textContent = '🔍 智能检测';
        sel.append(auto);
    }

    function buildPanel() {
        var old = document.getElementById('tag-selector-panel');
        if (old) old.remove();

        if (!document.getElementById('tag-style')) {
            var style = document.createElement('style');
            style.id = 'tag-style';
            style.textContent = `
                    #tag-selector-panel{position:fixed;z-index:999999;background:linear-gradient(145deg,#1a1a2e,#16213e);color:#eee;border-radius:16px;border:1px solid rgba(79,195,247,0.15);box-shadow:0 12px 48px rgba(0,0,0,0.7);font-family:"Segoe UI",-apple-system,Arial,sans-serif;font-size:13px;user-select:none;width:380px;padding:14px 16px;max-height:90vh;overflow-y:auto;box-sizing:border-box;backdrop-filter:blur(12px);}
                    #tag-selector-panel::-webkit-scrollbar{width:4px;}
                    #tag-selector-panel::-webkit-scrollbar-track{background:transparent;}
                    #tag-selector-panel::-webkit-scrollbar-thumb{background:#4fc3f7;border-radius:4px;}
                    #tag-selector-panel.minimized{width:auto!important;height:auto!important;padding:6px 16px!important;border-radius:24px!important;min-width:120px!important;}
                    #tag-selector-panel.minimized > div:not(.title-bar){display:none!important;}
                    #tag-selector-panel.minimized .title-text{display:inline!important;font-size:14px!important;}
                    #tag-selector-panel.minimized .toggle-btn{font-size:16px!important;margin-left:8px!important;}
                    #tag-selector-panel.minimized .title-bar{margin-bottom:0!important;}
                    .tag-btn{padding:3px 10px;border-radius:6px;border:1px solid #444;background:transparent;color:#ccc;cursor:pointer;font-size:12px;transition:all 0.15s;font-family:inherit;white-space:nowrap;}
                    .tag-btn:hover{transform:translateY(-1px);}
                    .tag-btn.active{background:#4fc3f7!important;color:#1a1a2e!important;border-color:#4fc3f7!important;box-shadow:0 2px 12px rgba(79,195,247,0.3);}
                    .action-btn{padding:5px 14px;border-radius:6px;border:1px solid #444;background:rgba(255,255,255,0.03);color:#aaa;cursor:pointer;font-size:12px;transition:all 0.15s;font-family:inherit;font-weight:500;}
                    .action-btn:hover{background:rgba(255,255,255,0.08);color:#fff;border-color:#666;}
                    .action-btn.primary{background:linear-gradient(135deg,#4fc3f7,#0288d1);border-color:#4fc3f7;color:#1a1a2e;}
                    .action-btn.primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(79,195,247,0.3);}
                    .action-btn.danger{border-color:#e57373;color:#e57373;}
                    .action-btn.danger:hover{background:rgba(229,115,115,0.15);}
                    .action-btn.success{border-color:#81c784;color:#81c784;}
                    .action-btn.success:hover{background:rgba(129,199,132,0.15);}
                    .action-btn.warning{border-color:#ffb74d;color:#ffb74d;}
                    .action-btn.warning:hover{background:rgba(255,183,77,0.15);}
                    #template-selector{background:rgba(255,255,255,0.05);color:#ddd;border:1px solid #444;border-radius:6px;padding:3px 8px;font-size:12px;font-family:inherit;cursor:pointer;max-width:140px;outline:none;}
                    #template-selector:focus{border-color:#4fc3f7;}
                    .group-container{margin-bottom:8px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;background:rgba(255,255,255,0.02);transition:all 0.2s;}
                `;
            document.head.append(style);
        }

        var pos = loadPosition();
        panel = document.createElement('div');
        panel.id = 'tag-selector-panel';
        panel.style.cssText = 'position:fixed;z-index:999999;background:linear-gradient(145deg,#1a1a2e,#16213e);color:#eee;border-radius:16px;border:1px solid rgba(79,195,247,0.15);box-shadow:0 12px 48px rgba(0,0,0,0.7);font-family:"Segoe UI",-apple-system,Arial,sans-serif;font-size:13px;user-select:none;width:380px;padding:14px 16px;max-height:90vh;overflow-y:auto;box-sizing:border-box;top:' + pos.top + 'px;right:' + pos.right + 'px;';

        // Title
        var titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
        var titleLeft = document.createElement('span');
        titleLeft.style.cssText = 'display:flex;align-items:center;gap:6px;';
        titleLeft.innerHTML =
            '<span style="font-size:18px;margin-right:2px;">🏷️</span>' +
            '<span class="title-text" style="font-weight:700;font-size:16px;background:linear-gradient(135deg,#4fc3f7,#81d4fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">标注助手</span>';
        var selector = document.createElement('select');
        selector.id = 'template-selector';
        selector.style.cssText = 'background:rgba(255,255,255,0.05);color:#ddd;border:1px solid #444;border-radius:6px;padding:3px 8px;font-size:12px;font-family:inherit;cursor:pointer;max-width:140px;outline:none;';
        selector.addEventListener('change', function() {
            var val = this.value;
            if (val === '__create__') {
                var name = prompt('请输入模板名称:');
                if (name) {
                    var tpl = templateManager.createTemplate(name);
                    if (tpl) { updateSelector();
                        renderUI();
                        tagOps.refreshSelections();
                        updateButtons(); }
                }
                var cid = templateManager.getCurrentId();
                if (cid) this.value = cid;
            } else if (val === '__auto__') {
                var result = templateManager.autoDetectAndApply();
                if (result) { updateSelector();
                    renderUI();
                    tagOps.refreshSelections();
                    updateButtons();
                    showToast('✅ 智能匹配完成'); }
            } else if (val) {
                templateManager.switchTemplate(val);
                renderUI();
                tagOps.refreshSelections();
                updateButtons();
            }
        });
        titleLeft.append(selector);
        var toggleBtn = document.createElement('span');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#666;padding:0 4px;transition:color 0.2s;';
        toggleBtn.textContent = '−';
        toggleBtn.title = '最小化';
        toggleBtn.addEventListener('mouseenter', function() { this.style.color = '#4fc3f7'; });
        toggleBtn.addEventListener('mouseleave', function() { this.style.color = '#666'; });
        titleBar.append(titleLeft);
        titleBar.append(toggleBtn);
        panel.append(titleBar);

        // ---- 操作栏 ----
        var actionBar = document.createElement('div');
        actionBar.style.cssText = 'display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;';

        var editBtn = document.createElement('button');
        editBtn.className = 'action-btn warning';
        editBtn.textContent = '✏️ 编辑';
        editBtn.addEventListener('click', function() {
            editMode = !editMode;
            this.textContent = editMode ? '✅ 完成编辑' : '✏️ 编辑';
            this.style.borderColor = editMode ? '#ffb74d' : '#444';
            renderUI();
            if (editMode) showToast('📝 编辑模式：点击删除，右键移动');
        });
        actionBar.append(editBtn);

        var exportBtn = document.createElement('button');
        exportBtn.className = 'action-btn';
        exportBtn.textContent = '📤 导出';
        exportBtn.addEventListener('click', function() {
            var json = templateManager.exportTemplates();
            var blob = new Blob([json], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = '标注助手模板_' + new Date().toISOString().slice(0,10) + '.json';
            document.body.append(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showToast('✅ 模板已导出');
        });
        actionBar.append(exportBtn);

        var importBtn = document.createElement('button');
        importBtn.className = 'action-btn';
        importBtn.textContent = '📥 导入';
        importBtn.addEventListener('click', function() {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var json = ev.target.result;
                    var overwrite = confirm('是否覆盖已存在的同名模板？\n点击"确定"覆盖，点击"取消"跳过重复');
                    var result = templateManager.importTemplates(json, overwrite);
                    if (result) {
                        showToast('✅ 导入完成：新增 ' + result.imported + ' 个，跳过 ' + result.skipped + ' 个');
                        updateSelector();
                        renderUI();
                        tagOps.refreshSelections();
                        updateButtons();
                    } else {
                        showToast('❌ 导入失败，请检查文件格式', true);
                    }
                };
                reader.readAsText(file);
                input.remove();
            });
            input.click();
        });
        actionBar.append(importBtn);

        var saveBtn = document.createElement('button');
        saveBtn.className = 'action-btn success';
        saveBtn.textContent = '💾 保存模板';
        saveBtn.addEventListener('click', function() {
            var name = prompt('请输入模板名称:', '模板-' + new Date().toLocaleDateString());
            if (name) {
                var tpl = templateManager.createTemplate(name);
                if (tpl) { updateSelector();
                    renderUI(); }
            }
        });
        actionBar.append(saveBtn);

        var delBtn = document.createElement('button');
        delBtn.className = 'action-btn danger';
        delBtn.textContent = '🗑️ 删除';
        delBtn.addEventListener('click', function() {
            var cid = templateManager.getCurrentId();
            if (cid && confirm('删除当前模板？')) {
                templateManager.deleteTemplate(cid);
                updateSelector();
                renderUI();
                tagOps.refreshSelections();
                updateButtons();
            }
        });
        actionBar.append(delBtn);

        var refreshBtn = document.createElement('button');
        refreshBtn.className = 'action-btn';
        refreshBtn.textContent = '🔄 刷新';
        refreshBtn.addEventListener('click', function() { renderUI();
            updateSelector();
            showToast('🔄 已刷新'); });
        actionBar.append(refreshBtn);

        panel.append(actionBar);

        // Groups
        var groupsContainer = document.createElement('div');
        groupsContainer.id = 'groups-container';
        groupsContainer.style.cssText = 'margin-bottom:8px;';
        panel.append(groupsContainer);

        // Execute buttons
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
        var execBtn = document.createElement('button');
        execBtn.className = 'action-btn primary';
        execBtn.textContent = '✅ 执行选中';
        execBtn.style.cssText = 'flex:2;padding:6px 8px;border:none;border-radius:6px;background:linear-gradient(135deg,#4fc3f7,#0288d1);color:#1a1a2e;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s;';
        execBtn.addEventListener('click', function() {
            var tags = tagOps.getAllSelectedTags();
            if (tags.length === 0) { showToast('⚠️ 请先选择标签', true); return; }
            tagOps.selectTags(tags);
        });
        btnRow.append(execBtn);
        var clearBtn = document.createElement('button');
        clearBtn.className = 'action-btn danger';
        clearBtn.textContent = '🔄 清除';
        clearBtn.style.cssText = 'flex:1;padding:6px 8px;border:none;border-radius:6px;background:rgba(229,115,115,0.15);color:#e57373;font-weight:700;font-size:13px;cursor:pointer;border:1px solid rgba(229,115,115,0.3);';
        clearBtn.addEventListener('click', function() { tagOps.clearAllSelections();
            updateButtons(); });
        btnRow.append(clearBtn);
        panel.append(btnRow);

        // Dropdown
        var dropRow = document.createElement('div');
        dropRow.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
        var dropBtn = document.createElement('button');
        dropBtn.className = 'action-btn';
        dropBtn.textContent = '📋 下拉框选"无法判断"';
        dropBtn.style.cssText = 'flex:1;padding:4px 8px;border:none;border-radius:6px;background:rgba(124,77,255,0.15);color:#b388ff;font-weight:600;font-size:12px;cursor:pointer;border:1px solid rgba(124,77,255,0.2);';
        dropBtn.addEventListener('click', function() {
            treeSelectOps.selectTreeSelectUnable();
        });
        dropRow.append(dropBtn);
        panel.append(dropRow);

        // Status
        var statusBar = document.createElement('div');
        statusBar.id = 'tag-status-bar';
        statusBar.style.cssText = 'padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#666;text-align:center;font-family:"SF Mono",monospace;';
        statusBar.textContent = '就绪';
        panel.append(statusBar);

        document.body.append(panel);

        updateSelector();
        renderUI();
        initDraggable(panel);
    }

    function initDraggable(el) {
        var toggleBtn = el.querySelector('.toggle-btn');
        var startX, startY, origX, origY, moved = false,
            dragging = false;
        el.addEventListener('pointerdown', function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') ||
                e.target.tagName === 'SELECT' || e.target.closest('select')) return;
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            origX = el.offsetLeft;
            origY = el.offsetTop;
            moved = false;
            dragging = true;
            el.style.cursor = 'grabbing';

            function onMove(e) {
                if (!dragging) return;
                var dx = e.clientX - startX,
                    dy = e.clientY - startY;
                if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) { moved = true;
                    el.style.transition = 'none'; }
                if (moved) {
                    el.style.left = (origX + dx) + 'px';
                    el.style.top = (origY + dy) + 'px';
                    el.style.right = 'auto';
                }
            }

            function onUp(e) {
                dragging = false;
                el.style.cursor = '';
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                el.style.transition = '';
                if (!moved) {
                    if (e.target === toggleBtn) {
                        if (isMinimized) {
                            isMinimized = false;
                            el.classList.remove('minimized');
                            toggleBtn.textContent = '−';
                            toggleBtn.title = '最小化';
                        } else {
                            isMinimized = true;
                            el.classList.add('minimized');
                            toggleBtn.textContent = '➕';
                            toggleBtn.title = '展开面板';
                        }
                    } else if (isMinimized && el.contains(e.target)) {
                        isMinimized = false;
                        el.classList.remove('minimized');
                        toggleBtn.textContent = '−';
                        toggleBtn.title = '最小化';
                    }
                } else {
                    var rect = el.getBoundingClientRect();
                    savePosition(rect.top, window.innerWidth - rect.right);
                }
            }
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });
    }

    function watchPanel() {
        var observer = new MutationObserver(function() {
            if (!document.getElementById('tag-selector-panel')) {
                if (CONFIG.debug) console.warn('面板被移除，正在重建...');
                buildPanel();
            }
        });
        observer.observe(document.body, { childList: true });
        return observer;
    }

    return {
        buildAndWatchPanel: function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    buildPanel();
                    watchPanel();
                    setTimeout(function() {
                        if (!templateManager.getCurrentTemplate()) {
                            templateManager.autoDetectAndApply();
                            updateSelector();
                            renderUI();
                            tagOps.refreshSelections();
                            updateButtons();
                        }
                    }, 1500);
                });
            } else {
                buildPanel();
                watchPanel();
                setTimeout(function() {
                    if (!templateManager.getCurrentTemplate()) {
                        templateManager.autoDetectAndApply();
                        updateSelector();
                        renderUI();
                        tagOps.refreshSelections();
                        updateButtons();
                    }
                }, 1500);
            }
        }
    };
})();
