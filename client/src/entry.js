// dsh-chess-xq —— client 半 · 插件入口（bundle 导出：inject / apply）
// 职责：apply 期建 1s 轮询（跨组件重挂载存活）+ 开局/首拉 + 三个槽位注册：
//   conversation.input.left（♟ 小开关）/ shell.overlay（对局浮窗，棋盘+右侧落子记录一体）/
//   settings.section（难度设置）。
// 纯编排：逻辑全在 core.js，组件全在 panel.js / ui.js。
var react = require('react');
var core = require('./core');
var Panel = require('./panel');
var UI = require('./ui');

exports.inject = ['slots'];
exports.apply = function (ctx) {
  // 轮询一次建好（跨面板/设置页重挂载存活）；ctx.effect 卸载自动清理
  ctx.effect(function () {
    var id = setInterval(core.pollTick, core.POLL_MS);
    return function () { clearInterval(id); };
  }, 'dsh-chess-xq: poll');

  // 初始局 + 首拉（拉回配置的 AI 深度/消息）
  core.boot();

  // 注入对局浮窗用到的极简 CSS（思考转圈动画），卸载时移除
  ctx.effect(function () {
    var style = document.createElement('style');
    style.id = 'dsh-chess-xq-style';
    style.textContent = '@keyframes dsh-chess-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    return function () {
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, 'dsh-chess-xq: style');

  var slots = ctx.get('slots');
  if (slots === undefined) return;
  // 入口只留一个：输入框工具行左端的小开关（发送框内、附件/计划旁边）
  slots.inject('conversation.input.left', function () {
    return slots.register(
      {
        name: 'conversation.input.left',
        id: 'dsh-chess-xq-toggle',
        order: 95,
        label: function () { return '天界象棋'; },
      },
      UI.InputToggle
    );
  });
  slots.inject('shell.overlay', function () {
    return slots.register(
      {
        name: 'shell.overlay',
        id: 'dsh-chess-xq-panel',
        order: 35,
        label: function () { return '天界象棋'; },
      },
      Panel.ChessPanel
    );
  });
  slots.inject('settings.section', function () {
    return slots.register(
      {
        name: 'settings.section',
        id: 'dsh-chess-xq',
        order: 140,
        label: function () { return '天界象棋'; },
      },
      function (props) { return react.createElement(UI.ChessSettings, { ctx: ctx }); }
    );
  });

  console.log('[dsh-chess-xq-plugin] client loaded');
};
