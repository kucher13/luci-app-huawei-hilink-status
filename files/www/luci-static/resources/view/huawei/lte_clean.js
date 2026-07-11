'use strict';
'require view';
'require fs';
'require poll';

var hxRangeMinutes = 10;

/*
 * The interface follows the language selected in LuCI.
 * Russian is used for a Russian LuCI locale; every other locale falls back to English.
 * The built-in dictionary keeps the page bilingual even before a separate LuCI i18n
 * package is built and installed.
 */
function detectHxLanguage() {
  var luciLanguage = '';

  if (typeof L !== 'undefined' && L.env)
    luciLanguage = String(L.env.lang || L.env.language || '').toLowerCase();

  if (luciLanguage && luciLanguage !== 'auto')
    return luciLanguage.indexOf('ru') === 0 ? 'ru' : 'en';

  var documentLanguage = '';

  if (typeof document !== 'undefined' && document.documentElement)
    documentLanguage = String(document.documentElement.lang || '').toLowerCase();

  if (documentLanguage)
    return documentLanguage.indexOf('ru') === 0 ? 'ru' : 'en';

  var browserLanguage = '';

  if (typeof navigator !== 'undefined')
    browserLanguage = String(navigator.language || '').toLowerCase();

  return browserLanguage.indexOf('ru') === 0 ? 'ru' : 'en';
}

var hxLanguage = detectHxLanguage();
var hxRussian = hxLanguage === 'ru';

function tr(russian, english) {
  return hxRussian ? russian : english;
}

function localizedConnectionText(code, fallback) {
  if (hxRussian)
    return val(fallback, tr('Неизвестно', 'Unknown'));

  switch (String(code || '')) {
  case '900':
    return 'Connecting';
  case '901':
    return 'Connected';
  case '902':
    return 'Disconnected';
  case '903':
    return 'Disconnecting';
  default:
    return 'Unknown';
  }
}

function localizedServiceText(code, fallback) {
  if (hxRussian)
    return val(fallback, tr('Неизвестно', 'Unknown'));

  return String(code || '') === '2' ? 'Available' : 'Unavailable';
}

function runJson() {
  return L.resolveDefault(fs.exec('/usr/bin/huawei', ['json']), {
    stdout: '',
    stderr: tr('Команда /usr/bin/huawei json не выполнилась', 'The /usr/bin/huawei json command failed')
  }).then(function(res) {
    var out = (res.stdout || '').trim();

    if (!out)
      return { ok: false, error: res.stderr || tr('Нет данных от /usr/bin/huawei', 'No data received from /usr/bin/huawei') };

    try {
      return JSON.parse(out);
    }
    catch (e) {
      return { ok: false, error: tr('Ошибка JSON от /usr/bin/huawei', 'Invalid JSON received from /usr/bin/huawei'), raw: out };
    }
  });
}

function runCmd(cmd) {
  return L.resolveDefault(fs.exec('/usr/bin/huawei', [cmd]), {
    stdout: '',
    stderr: tr('Ошибка выполнения команды', 'Command execution failed')
  });
}

function val(v, fallback) {
  if (v === undefined || v === null || v === '')
    return fallback || '—';
  return v;
}

function toNumber(v) {
  var m = String(v || '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function quality(type, value) {
  var x = toNumber(value);

  if (x === null)
    return { cls: 'neutral', text: tr('Нет данных', 'No data') };

  if (type === 'rsrp') {
    if (x >= -85) return { cls: 'good', text: tr('Отлично', 'Excellent') };
    if (x >= -95) return { cls: 'good', text: tr('Хорошо', 'Good') };
    if (x >= -105) return { cls: 'warn', text: tr('Средне', 'Fair') };
    return { cls: 'bad', text: tr('Слабо', 'Weak') };
  }

  if (type === 'rsrq') {
    if (x >= -10) return { cls: 'good', text: tr('Хорошо', 'Good') };
    if (x >= -15) return { cls: 'warn', text: tr('Слабовато', 'Poor') };
    return { cls: 'bad', text: tr('Слабо', 'Weak') };
  }

  if (type === 'sinr') {
    if (x >= 20) return { cls: 'good', text: tr('Отлично', 'Excellent') };
    if (x >= 13) return { cls: 'good', text: tr('Хорошо', 'Good') };
    if (x >= 5) return { cls: 'warn', text: tr('Средне', 'Fair') };
    return { cls: 'bad', text: tr('Слабо', 'Weak') };
  }

  if (type === 'rssi') {
    if (x >= -65) return { cls: 'good', text: tr('Нормально', 'Normal') };
    if (x >= -80) return { cls: 'warn', text: tr('Средне', 'Fair') };
    return { cls: 'bad', text: tr('Слабо', 'Weak') };
  }

  return { cls: 'neutral', text: '—' };
}

function filterHistory(history, minutes) {
  history = history || [];

  if (!history.length)
    return [];

  var now = Math.floor(Date.now() / 1000);
  var limit = minutes * 60;

  var out = history.filter(function(row) {
    var ts = Number(row.ts || 0);
    return ts && (now - ts) <= limit;
  });

  if (out.length >= 2)
    return out;

  if (minutes === 10) return history.slice(-60);
  if (minutes === 30) return history.slice(-180);
  if (minutes === 60) return history.slice(-360);

  return history.slice(-2160);
}

function makeSvgLine(history, key, color, height) {
  var values = (history || [])
    .map(function(row) { return toNumber(row[key]); })
    .filter(function(x) { return x !== null; });

  var wrap = E('div', { 'class': 'hx-chart' });

  if (values.length < 2) {
    wrap.appendChild(E('div', { 'class': 'hx-chart-empty' }, tr('История появится через 20–30 секунд', 'History will appear in 20–30 seconds')));
    return wrap;
  }

  var min = Math.min.apply(null, values);
  var max = Math.max.apply(null, values);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  var w = 320;
  var h = height || 62;
  var pad = 6;
  var points = [];

  values.forEach(function(v, i) {
    var x = pad + i * ((w - pad * 2) / Math.max(values.length - 1, 1));
    var y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    points.push(x.toFixed(1) + ',' + y.toFixed(1));
  });

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'hx-svg');

  var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', points.join(' '));
  poly.setAttribute('class', 'hx-poly hx-line-' + color);

  svg.appendChild(poly);
  wrap.appendChild(svg);

  return wrap;
}

function makeSpeedSvg(history, height) {
  var down = (history || [])
    .map(function(row) { return toNumber(row.download_rate); })
    .filter(function(x) { return x !== null; });

  var up = (history || [])
    .map(function(row) { return toNumber(row.upload_rate); })
    .filter(function(x) { return x !== null; });

  var wrap = E('div', { 'class': 'hx-speed-chart' });

  if (down.length < 2 && up.length < 2) {
    wrap.appendChild(E('div', { 'class': 'hx-chart-empty' }, tr('История скорости появится через 20–30 секунд', 'Speed history will appear in 20–30 seconds')));
    return wrap;
  }

  var all = down.concat(up);
  var max = Math.max.apply(null, all);

  if (!max || max < 1)
    max = 1;

  function points(values) {
    var w = 320;
    var h = height || 70;
    var pad = 6;
    var out = [];

    values.forEach(function(v, i) {
      var x = pad + i * ((w - pad * 2) / Math.max(values.length - 1, 1));
      var y = h - pad - (v / max) * (h - pad * 2);
      out.push(x.toFixed(1) + ',' + y.toFixed(1));
    });

    return out.join(' ');
  }

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 320 ' + (height || 70));
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'hx-svg');

  if (down.length > 1) {
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    d.setAttribute('points', points(down));
    d.setAttribute('class', 'hx-poly hx-line-blue');
    svg.appendChild(d);
  }

  if (up.length > 1) {
    var u = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    u.setAttribute('points', points(up));
    u.setAttribute('class', 'hx-poly hx-line-purple');
    svg.appendChild(u);
  }

  wrap.appendChild(svg);
  return wrap;
}

function topItem(label, value, sub, icon, good) {
  return E('div', { 'class': 'hx-top-item' }, [
    icon ? E('div', { 'class': 'hx-top-icon' }, icon) : '',
    E('div', { 'class': 'hx-top-content' }, [
      E('div', { 'class': 'hx-label' }, label),
      E('div', { 'class': good ? 'hx-top-value hx-green-text' : 'hx-top-value' }, val(value)),
      E('div', { 'class': 'hx-sub' }, sub || '')
    ])
  ]);
}

function signalCard(title, value, qualityInfo, chart) {
  return E('div', { 'class': 'hx-card hx-signal-card hx-' + qualityInfo.cls }, [
    E('div', { 'class': 'hx-card-head' }, [
      E('div', { 'class': 'hx-label' }, title),
      E('span', { 'class': 'hx-dot' })
    ]),
    E('div', { 'class': 'hx-signal-value' }, val(value)),
    E('div', { 'class': 'hx-quality' }, qualityInfo.text),
    chart
  ]);
}

function techRow(label, value, icon) {
  return E('div', { 'class': 'hx-tech-row' }, [
    E('div', { 'class': 'hx-tech-name' }, [
      E('span', { 'class': 'hx-tech-icon' }, icon || '•'),
      E('span', {}, label)
    ]),
    E('b', {}, val(value))
  ]);
}

function trafficLine(label, value, colorClass, big) {
  return E('div', { 'class': big ? 'hx-traffic-line hx-traffic-total' : 'hx-traffic-line' }, [
    E('span', { 'class': colorClass || '' }, label),
    E('b', {}, val(value))
  ]);
}

function trafficCard(title, total, download, upload, icon) {
  return E('div', { 'class': 'hx-card hx-traffic-card' }, [
    E('div', { 'class': 'hx-stat-head' }, [
      E('span', { 'class': 'hx-stat-icon' }, icon || '▣'),
      E('span', { 'class': 'hx-label' }, title)
    ]),
    E('div', { 'class': 'hx-traffic-lines' }, [
      trafficLine('Download', download, 'hx-blue-text'),
      trafficLine('Upload', upload, 'hx-purple-text'),
      trafficLine(tr('Всего', 'Total'), total, '', true)
    ])
  ]);
}

function sessionCard(t, history) {
  return E('div', { 'class': 'hx-card hx-session-card' }, [
    E('div', { 'class': 'hx-session-title' }, tr('Текущая сессия', 'Current session')),
    E('div', { 'class': 'hx-sub' }, tr('Время подключения', 'Connection time')),
    E('div', { 'class': 'hx-session-time' }, val(t.session_time_h)),
    E('div', { 'class': 'hx-separator' }),

    E('div', { 'class': 'hx-download-label' }, 'Download'),
    E('div', { 'class': 'hx-session-value' }, val(t.current_download_h)),
    E('div', { 'class': 'hx-blue-text' }, val(t.current_download_rate_h)),

    E('div', { 'class': 'hx-upload-label' }, 'Upload'),
    E('div', { 'class': 'hx-session-value' }, val(t.current_upload_h)),
    E('div', { 'class': 'hx-purple-text' }, val(t.current_upload_rate_h)),

    E('div', { 'class': 'hx-chart-title' }, 'Download / Upload'),
    makeSpeedSvg(history, 62)
  ]);
}

function healthRow(label, value, ok, icon) {
  return E('div', { 'class': 'hx-health-row' }, [
    E('div', { 'class': 'hx-health-label' }, [
      E('span', {}, icon || '•'),
      E('span', {}, label)
    ]),
    E('b', { 'class': ok ? 'hx-green-text' : 'hx-red-text' }, val(value))
  ]);
}

function actionButton(title, desc, cls, icon, handler) {
  return E('button', {
    'class': 'hx-action ' + (cls || ''),
    'click': handler
  }, [
    E('div', { 'class': 'hx-action-icon' }, icon || '↻'),
    E('div', { 'class': 'hx-action-text' }, [
      E('b', {}, title),
      E('span', {}, desc || '')
    ])
  ]);
}

function renderError(data, refresh) {
  return E('div', { 'class': 'hx-dashboard' }, [
    E('div', { 'class': 'hx-panel hx-error' }, [
      E('h1', {}, tr('Huawei LTE недоступен', 'Huawei LTE is unavailable')),
      E('p', {}, data && data.error ? data.error : tr('Нет данных', 'No data')),
      data && data.raw ? E('pre', {}, data.raw) : '',
      E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': refresh }, tr('Обновить', 'Refresh'))
    ])
  ]);
}

function renderDashboard(data, refresh, action) {
  if (!data || !data.ok)
    return renderError(data, refresh);

  var d = data.device || {};
  var o = data.operator || {};
  var s = data.status || {};
  var sig = data.signal || {};
  var t = data.traffic || {};
  var m = data.month || {};
  var inet = data.internet || {};
  var allHistory = data.history || [];
  var history = filterHistory(allHistory, hxRangeMinutes);

  var connected = s.connection === '901';

  var qRsrp = quality('rsrp', sig.rsrp);
  var qRsrq = quality('rsrq', sig.rsrq);
  var qSinr = quality('sinr', sig.sinr);
  var qRssi = quality('rssi', sig.rssi);

  return E('div', { 'class': 'hx-dashboard' }, [
    E('div', { 'class': 'hx-page-head' }, [
      E('div', {}, [
        E('div', { 'class': 'hx-title-row' }, [
          E('h1', {}, 'Huawei LTE'),
          E('span', { 'class': connected ? 'hx-status hx-green-text' : 'hx-status hx-red-text' },
            connected ? tr('● Подключено', '● Connected') : tr('● Не подключено', '● Disconnected'))
        ]),
        E('div', { 'class': 'hx-sub' }, tr('Обновление каждые 10 с · ', 'Refresh every 10 s · ') + val(data.updated))
      ]),
      E('div', { 'class': 'hx-auto-refresh' }, tr('↻ Обновление каждые 10 с', '↻ Refresh every 10 s'))
    ]),

    E('div', { 'class': 'hx-panel hx-top' }, [
      topItem(tr('Оператор', 'Operator'), o.full || o.short, o.numeric || '', '📡'),
      topItem(tr('Сеть', 'Network'), 'LTE', '4G · HiLink'),
      topItem(tr('Режим', 'Mode'), d.workmode || 'LTE', d.name ? tr('Модем: ', 'Modem: ') + d.name : ''),
      topItem(tr('Статус', 'Status'), localizedConnectionText(s.connection, s.connection_text), tr('Сервис: ', 'Service: ') + localizedServiceText(s.service, s.service_text), '', connected),
      topItem('WAN IP', d.wan_ip, inet.wan === 'yes' ? tr('получен', 'assigned') : tr('нет адреса', 'no address'), '🌐')
    ]),

    E('div', { 'class': 'hx-panel hx-signal-panel' }, [
      E('div', { 'class': 'hx-panel-head' }, [
        E('h2', {}, tr('Сигнал LTE', 'LTE signal')),
        E('span', { 'class': 'hx-sub' }, tr('RSRP ближе к 0 лучше, SINR выше лучше', 'RSRP is better closer to 0; higher SINR is better'))
      ]),

      E('div', { 'class': 'hx-signal-layout' }, [
        E('div', { 'class': 'hx-signal-grid' }, [
          signalCard('RSRP', sig.rsrp, qRsrp, makeSvgLine(history, 'rsrp', 'yellow')),
          signalCard('RSRQ', sig.rsrq, qRsrq, makeSvgLine(history, 'rsrq', 'orange')),
          signalCard('SINR', sig.sinr, qSinr, makeSvgLine(history, 'sinr', 'yellow')),
          signalCard('RSSI', sig.rssi, qRssi, makeSvgLine(history, 'rssi', 'green'))
        ]),

        E('div', { 'class': 'hx-tech-card' }, [
          techRow('PCI', sig.pci, '▦'),
          techRow('Cell ID', sig.cell_id, '◎'),
          techRow('EARFCN', '—', '◌'),
          techRow('Bandwidth', '—', '◉'),
          techRow('Network Type', val(s.network_type) + ' (LTE)', '◇'),
          techRow('Network Type Ex', val(s.network_type_ex) + ' (LTE+)', '◇')
        ])
      ]),

      E('div', { 'class': 'hx-info-strip' }, [
        E('span', {}, 'ⓘ'),
        E('span', {}, tr('RSRP — уровень сигнала от базовой станции. Чем ближе к 0, тем лучше.', 'RSRP is the signal level from the cell tower. Values closer to 0 are better.'))
      ])
    ]),

    E('div', { 'class': 'hx-main-grid' }, [
      E('div', { 'class': 'hx-panel hx-traffic-panel' }, [
        E('h2', {}, tr('Трафик', 'Traffic')),
        E('div', { 'class': 'hx-traffic-grid' }, [
          sessionCard(t, history),
          trafficCard(tr('Всего', 'Total'), t.total_h, t.total_download_h, t.total_upload_h, '▣'),
          trafficCard(tr('За текущий месяц', 'Current month'), m.total_h, m.download_h, m.upload_h, '◷')
        ])
      ]),

      E('div', { 'class': 'hx-panel hx-internet-panel' }, [
        E('h2', {}, tr('Интернет', 'Internet')),
        E('div', { 'class': 'hx-health-list' }, [
          healthRow(tr('Модем подключен', 'Modem connected'), inet.modem === 'yes' ? tr('Да', 'Yes') : tr('Нет', 'No'), inet.modem === 'yes', '↓'),
          healthRow(tr('SIM / Сервис', 'SIM / Service'), localizedServiceText(s.service, s.service_text), s.service === '2', '⚠'),
          healthRow('WAN IP', d.wan_ip, inet.wan === 'yes', '🌐'),
          healthRow(tr('Интернет доступен', 'Internet available'), inet.internet === 'yes' ? tr('Да', 'Yes') : tr('Нет', 'No'), inet.internet === 'yes', '🌍'),
          healthRow('Ping 8.8.8.8', inet.ping_ms ? inet.ping_ms + ' ms' : tr('нет', 'no response'), inet.ping === 'yes', '◉'),
          healthRow('DNS 1.1.1.1', inet.dns === 'yes' ? tr('Работает', 'Working') : tr('Ошибка', 'Error'), inet.dns === 'yes', '◌')
        ]),
        E('div', {
          'class': (inet.internet === 'yes' && inet.dns === 'yes') ? 'hx-ok-banner' : 'hx-warn-banner'
        }, (inet.internet === 'yes' && inet.dns === 'yes') ? tr('Все системы работают нормально', 'All systems are working normally') : tr('Есть проблема с интернетом', 'There is an internet problem'))
      ])
    ]),

    E('div', { 'class': 'hx-panel hx-history-panel' }, [
      E('div', { 'class': 'hx-history-head' }, [
        E('h2', {}, [
          tr('История ', 'History '),
          E('span', {}, tr('(последние ', '(last ') +
            (hxRangeMinutes === 360 ? tr('6 часов', '6 hours') : hxRangeMinutes + tr(' минут', ' minutes')) + ')')
        ]),
        E('div', { 'class': 'hx-tabs' }, [
          E('button', {
            'class': hxRangeMinutes === 10 ? 'active' : '',
            'click': function() { hxRangeMinutes = 10; refresh(); }
          }, tr('10 мин', '10 min')),
          E('button', {
            'class': hxRangeMinutes === 30 ? 'active' : '',
            'click': function() { hxRangeMinutes = 30; refresh(); }
          }, tr('30 мин', '30 min')),
          E('button', {
            'class': hxRangeMinutes === 60 ? 'active' : '',
            'click': function() { hxRangeMinutes = 60; refresh(); }
          }, tr('60 мин', '60 min')),
          E('button', {
            'class': hxRangeMinutes === 360 ? 'active' : '',
            'click': function() { hxRangeMinutes = 360; refresh(); }
          }, tr('6 ч', '6 h'))
        ])
      ]),

      E('div', { 'class': 'hx-history-grid' }, [
        E('div', { 'class': 'hx-history-card' }, [
          E('div', { 'class': 'hx-card-head' }, [
            E('b', {}, 'RSRP'),
            E('span', {}, 'dBm')
          ]),
          makeSvgLine(history, 'rsrp', 'yellow', 110)
        ]),
        E('div', { 'class': 'hx-history-card' }, [
          E('div', { 'class': 'hx-card-head' }, [
            E('b', {}, 'SINR'),
            E('span', {}, 'dB')
          ]),
          makeSvgLine(history, 'sinr', 'green', 110)
        ]),
        E('div', { 'class': 'hx-history-card' }, [
          E('div', { 'class': 'hx-card-head' }, [
            E('b', {}, tr('Скорость', 'Speed')),
            E('span', {}, [
              E('span', { 'class': 'hx-blue-text' }, 'Download '),
              E('span', { 'class': 'hx-purple-text' }, 'Upload')
            ])
          ]),
          makeSpeedSvg(history, 110)
        ])
      ])
    ]),

    E('div', { 'class': 'hx-panel hx-control-panel' }, [
      E('h2', {}, tr('Управление', 'Controls')),
      E('div', { 'class': 'hx-actions' }, [
        actionButton('Reconnect LTE', tr('Переподключить мобильный интернет', 'Reconnect mobile internet'), 'primary', '↻', function() { action('reconnect'); }),
        actionButton('Data Off', tr('Отключить мобильные данные', 'Disable mobile data'), '', '↓', function() {
          if (confirm(tr('Отключить мобильные данные на Huawei?', 'Disable mobile data on Huawei?')))
            action('data-off');
        }),
        actionButton('Data On', tr('Включить мобильные данные', 'Enable mobile data'), '', '◷', function() { action('data-on'); }),
        actionButton(tr('Обновить', 'Refresh'), tr('Обновить данные сейчас', 'Refresh data now'), '', '↻', refresh)
      ]),
      E('div', { 'class': 'hx-footer' }, [
        E('span', {}, tr('ⓘ Последнее обновление: ', 'ⓘ Last update: ') + val(data.updated)),
        E('span', {}, tr('История: ', 'History: ') + allHistory.length + tr(' точек', ' points'))
      ])
    ]),

    E('details', { 'class': 'hx-details' }, [
      E('summary', {}, tr('Подробнее / JSON', 'Details / JSON')),
      E('pre', {}, JSON.stringify(data, null, 2))
    ])
  ]);
}

return view.extend({
  handleSaveApply: null,
  handleSave: null,
  handleReset: null,

  load: function() {
    return runJson();
  },

  render: function(data) {
    var style = E('style', {}, `
      #maincontent,
      .main > .container,
      .main .container,
      .container,
      .cbi-map {
        max-width: none !important;
      }

      #maincontent {
        width: calc(100vw - 80px) !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .cbi-map {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .hx-dashboard {
        --panel: #0d2138;
        --card: #112b49;
        --card2: #0d233d;
        --border: rgba(104,149,205,.28);
        --border2: rgba(104,149,205,.42);
        --text: #f4f8ff;
        --muted: #9fb2cc;
        --blue: #2f94ff;
        --green: #32d66d;
        --yellow: #ffd21a;
        --orange: #ff8a0a;
        --red: #ff5454;
        --purple: #b858ff;

        max-width: 1320px;
        margin: 0 auto 36px auto;
        color: var(--text);
      }

      .hx-dashboard h1,
      .hx-dashboard h2 {
        margin: 0;
        color: var(--text);
        letter-spacing: -.03em;
      }

      .hx-page-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        margin: 24px 0 18px;
      }

      .hx-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .hx-title-row h1 {
        font-size: 32px;
        line-height: 1.05;
      }

      .hx-status {
        font-size: 14px;
        font-weight: 900;
      }

      .hx-sub {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.35;
      }

      .hx-auto-refresh {
        color: var(--muted);
        font-size: 14px;
        padding-top: 7px;
      }

      .hx-green-text { color: var(--green) !important; }
      .hx-red-text { color: var(--red) !important; }
      .hx-blue-text { color: var(--blue) !important; }
      .hx-purple-text { color: var(--purple) !important; }

      .hx-panel {
        background:
          radial-gradient(circle at top left, rgba(47,148,255,.08), transparent 34%),
          linear-gradient(145deg, rgba(16,38,64,.96), rgba(9,22,39,.98));
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 16px 44px rgba(0,0,0,.22);
        margin-bottom: 14px;
      }

      .hx-top {
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr 1.25fr 1.35fr;
        overflow: hidden;
      }

      .hx-top-item {
        min-height: 108px;
        padding: 18px 22px;
        border-right: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .hx-top-item:last-child {
        border-right: none;
      }

      .hx-top-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        color: var(--blue);
        background: rgba(47,148,255,.14);
        font-weight: 900;
      }

      .hx-label {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: .055em;
        font-size: 12px;
      }

      .hx-top-value {
        margin: 7px 0;
        font-size: 25px;
        line-height: 1.08;
        font-weight: 950;
      }

      .hx-signal-panel,
      .hx-traffic-panel,
      .hx-internet-panel,
      .hx-history-panel,
      .hx-control-panel {
        padding: 16px;
      }

      .hx-panel-head,
      .hx-card-head,
      .hx-stat-head,
      .hx-history-head,
      .hx-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .hx-signal-layout {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 14px;
        margin-top: 14px;
      }

      .hx-signal-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .hx-card,
      .hx-tech-card,
      .hx-history-card {
        background: linear-gradient(145deg, rgba(22,50,83,.82), rgba(12,30,52,.96));
        border: 1px solid var(--border2);
        border-radius: 14px;
      }

      .hx-signal-card {
        padding: 16px;
        min-height: 185px;
      }

      .hx-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--blue);
        box-shadow: 0 0 13px rgba(47,148,255,.78);
      }

      .hx-signal-value {
        margin-top: 20px;
        font-size: 34px;
        line-height: 1;
        font-weight: 950;
        letter-spacing: -.05em;
      }

      .hx-quality {
        margin-top: 11px;
        font-weight: 950;
      }

      .hx-good .hx-quality { color: var(--green); }
      .hx-warn .hx-quality { color: var(--yellow); }
      .hx-bad .hx-quality { color: var(--red); }

      .hx-chart,
      .hx-speed-chart {
        height: 62px;
        margin-top: 12px;
      }

      .hx-svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .hx-poly {
        fill: none;
        stroke-width: 4;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .hx-line-yellow { stroke: var(--yellow); }
      .hx-line-orange { stroke: var(--orange); }
      .hx-line-green { stroke: var(--green); }
      .hx-line-blue { stroke: var(--blue); }
      .hx-line-purple { stroke: var(--purple); }

      .hx-chart-empty {
        color: var(--muted);
        font-size: 12px;
        padding-top: 20px;
      }

      .hx-tech-card {
        padding: 15px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .hx-tech-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 7px 0;
        color: var(--muted);
      }

      .hx-tech-row b {
        color: var(--text);
      }

      .hx-tech-name {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .hx-tech-icon {
        color: var(--blue);
        width: 18px;
      }

      .hx-info-strip {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 14px;
        padding: 10px 14px;
        border-radius: 11px;
        border: 1px solid var(--border);
        background: rgba(255,255,255,.035);
        color: var(--muted);
        font-size: 13px;
      }

      .hx-main-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(330px, .85fr);
        gap: 14px;
      }

      .hx-traffic-grid {
        display: grid;
        grid-template-columns: 1.05fr 1fr 1fr;
        gap: 14px;
        margin-top: 14px;
      }

      .hx-session-card,
      .hx-traffic-card {
        padding: 16px;
        min-height: 245px;
      }

      .hx-session-title {
        font-weight: 900;
        margin-bottom: 10px;
      }

      .hx-session-time {
        margin-top: 5px;
        font-weight: 900;
      }

      .hx-separator {
        height: 1px;
        background: var(--border);
        margin: 14px 0;
      }

      .hx-download-label {
        color: var(--blue);
        font-weight: 900;
        margin-top: 8px;
      }

      .hx-upload-label {
        color: var(--purple);
        font-weight: 900;
        margin-top: 12px;
      }

      .hx-session-value {
        font-size: 25px;
        font-weight: 950;
        margin: 7px 0 5px;
        line-height: 1.05;
      }

      .hx-chart-title {
        margin-top: 16px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: .055em;
      }

      .hx-traffic-card {
        display: flex;
        flex-direction: column;
      }

      .hx-traffic-lines {
        margin-top: 18px;
        display: grid;
        gap: 0;
      }

      .hx-traffic-line {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
      }

      .hx-traffic-line:last-child {
        border-bottom: none;
      }

      .hx-traffic-line span {
        color: var(--muted);
        font-size: 15px;
      }

      .hx-traffic-line b {
        color: var(--text);
        font-size: 20px;
        line-height: 1.1;
      }

      .hx-traffic-total {
        margin-top: 12px;
        padding-top: 14px;
      }

      .hx-traffic-total span,
      .hx-traffic-total b {
        font-size: 24px;
        font-weight: 950;
      }

      .hx-health-list {
        overflow: hidden;
        margin-top: 14px;
        border-radius: 13px;
        border: 1px solid var(--border);
      }

      .hx-health-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        background: rgba(255,255,255,.035);
      }

      .hx-health-row:last-child {
        border-bottom: none;
      }

      .hx-health-label {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted);
      }

      .hx-ok-banner,
      .hx-warn-banner {
        margin-top: 14px;
        padding: 13px;
        border-radius: 12px;
        font-weight: 900;
        text-align: center;
      }

      .hx-ok-banner {
        color: var(--green);
        background: rgba(50,214,109,.16);
      }

      .hx-warn-banner {
        color: var(--yellow);
        background: rgba(255,210,26,.15);
      }

      .hx-history-head h2 span {
        color: var(--muted);
        font-size: 15px;
        font-weight: 500;
      }

      .hx-tabs {
        display: flex;
        gap: 6px;
        padding: 3px;
        border-radius: 999px;
        background: rgba(255,255,255,.035);
        border: 1px solid var(--border);
      }

      .hx-tabs button {
        border: none;
        border-radius: 999px;
        background: transparent;
        color: var(--muted);
        padding: 7px 15px;
        font-weight: 800;
      }

      .hx-tabs button.active {
        color: #9ccaff;
        background: rgba(47,148,255,.16);
        border: 1px solid rgba(47,148,255,.42);
      }

      .hx-history-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 14px;
      }

      .hx-history-card {
        padding: 16px;
        min-height: 165px;
      }

      .hx-control-panel h2 {
        margin-bottom: 14px;
      }

      .hx-actions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .hx-action {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 82px;
        padding: 15px 18px;
        text-align: left;
        color: var(--text);
        border: 1px solid var(--border2);
        border-radius: 14px;
        background: linear-gradient(145deg, rgba(23,52,86,.9), rgba(12,30,52,.98));
        cursor: pointer;
        overflow: hidden;
      }

      .hx-action.primary {
        border-color: rgba(47,148,255,.7);
        background: linear-gradient(145deg, #1683ff, #075bd4);
      }

      .hx-action-icon {
        width: 35px;
        height: 35px;
        border-radius: 11px;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        background: rgba(255,255,255,.09);
        color: #dcecff;
        font-weight: 950;
      }

      .hx-action-text {
        min-width: 0;
      }

      .hx-action b {
        display: block;
        font-size: 16px;
        line-height: 1.15;
      }

      .hx-action span {
        display: block;
        margin-top: 4px;
        color: rgba(244,248,255,.72);
        font-size: 12px;
        line-height: 1.2;
      }

      .hx-footer {
        margin-top: 14px;
        padding: 11px 14px;
        border-radius: 11px;
        background: rgba(255,255,255,.035);
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 13px;
      }

      .hx-details {
        margin-bottom: 20px;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: rgba(12,30,52,.84);
        color: var(--text);
      }

      .hx-details pre {
        white-space: pre-wrap;
        overflow-x: auto;
      }

      .hx-error {
        padding: 24px;
      }

      @media (max-width: 1100px) {
        #maincontent {
          width: 100% !important;
          padding-left: 14px !important;
          padding-right: 14px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .hx-dashboard {
          width: 100%;
          max-width: none;
          overflow-x: hidden;
        }

        .hx-page-head,
        .hx-history-head,
        .hx-footer {
          align-items: flex-start;
          flex-direction: column;
        }

        .hx-top,
        .hx-signal-layout,
        .hx-signal-grid,
        .hx-main-grid,
        .hx-traffic-grid,
        .hx-history-grid,
        .hx-actions {
          grid-template-columns: 1fr;
        }

        .hx-top-item {
          border-right: none;
          border-bottom: 1px solid var(--border);
        }

        .hx-top-item:last-child {
          border-bottom: none;
        }

        .hx-tabs {
          width: 100%;
          overflow-x: auto;
        }

        .hx-tabs button {
          white-space: nowrap;
        }

        .hx-action span {
          display: none;
        }

        .hx-action b {
          font-size: 18px;
        }
      }
    `);

    var content = E('div');

    function setContent(node) {
      while (content.firstChild)
        content.removeChild(content.firstChild);

      content.appendChild(node);
    }

    function refresh() {
      return runJson().then(function(newData) {
        setContent(renderDashboard(newData, refresh, action));
      });
    }

    function action(cmd) {
      return runCmd(cmd).then(function() {
        window.setTimeout(refresh, cmd === 'reconnect' ? 8000 : 2000);
      });
    }

    setContent(renderDashboard(data, refresh, action));

    poll.add(function() {
      return refresh();
    }, 10);

    return E('div', { 'class': 'cbi-map' }, [
      style,
      content
    ]);
  }
});
