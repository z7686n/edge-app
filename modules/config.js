// 配置模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.CONFIG = {
    clickDelay: 50,
    debug: false,
    storageKey: 'tag-panel-pos',
    selectionStorageKey: 'tag-selections-v3',
    templateStorageKey: 'tag-templates-v3',
    defaultPosition: { top: 100, right: 20 },
    dropdownTimeout: 500,
    operationTimeout: 30000,

    // 分组配置：添加 type 字段（radio=单选，checkbox=多选）
    groups: [
        { id: 'correctness', label: '属性值正确性判断', icon: '📋', type: 'radio' },
        { id: 'evidence', label: '证据来源', icon: '📷', type: 'checkbox' },
        { id: 'errorTypes', label: '错误问题类型', icon: '❌', type: 'radio' }
    ],

    keywords: {
        correctness: ['准确', '错误', '无法判断', '暂定准确', '正确', '不正确'],
        evidence: ['image', 'subject', 'desc', 'seller', '图片', '标题', '描述'],
        errorTypes: ['答非所问', '模型幻觉', '类目错放', '回答不全', '回答多了', '多余', '其他原因']
    },

    dropdownTargetText: '无法判断'
};
