// SilentAlarm - App State & Routing
const DAY_LABELS = {
  weekdays: 'Mon, Tue, Wed, Thu, Fri',
  weekends: 'Sat, Sun',
  wednesday: 'Wednesday',
  everyday: 'Everyday'
};

let alarms = [
  { id: 1, time: '07:30', period: 'AM', days: 'weekdays', type: 'smart_display', enabled: true },
  { id: 2, time: '09:00', period: 'AM', days: 'weekends', type: 'audio_file', enabled: false },
  { id: 3, time: '06:45', period: 'AM', days: 'wednesday', type: 'smart_display', enabled: true },
  { id: 4, time: '10:30', period: 'PM', days: 'everyday', type: 'audio_file', enabled: false },
];

let editMode = false;
let nextId = 5;

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, period, raw: timeStr };
}

function getNextAlarm() {
  const enabled = alarms.filter(a => a.enabled);
  if (enabled.length === 0) return null;
  enabled.sort((a, b) => {
    const ta = parseTime(a.time);
    const tb = parseTime(b.time);
    const minA = (ta.hour % 12) * 60 + ta.minute + (ta.period === 'PM' ? 720 : 0);
    const minB = (tb.hour % 12) * 60 + tb.minute + (tb.period === 'PM' ? 720 : 0);
    return minA - minB;
  });
  const n = parseTime(enabled[0].time);
  return `${n.hour}:${String(n.minute).padStart(2, '0')} ${n.period}`;
}

function updateHeader(page) {
  const header = document.getElementById('header');
  const subtitle = document.getElementById('header-subtitle');
  const action = document.getElementById('header-action');
  const addIcon = action?.querySelector('.material-symbols-outlined');

  if (page === 'alarms') {
    subtitle.textContent = `Next: ${getNextAlarm() || 'None'}`;
    action.style.display = 'flex';
    action.onclick = () => openAddAlarmModal();
    if (addIcon) addIcon.textContent = 'add';
  } else if (page === 'sleep') {
    subtitle.textContent = 'Bedtime schedule';
    action.style.display = 'flex';
    action.onclick = null;
    if (addIcon) addIcon.textContent = 'edit';
  } else if (page === 'stats') {
    subtitle.textContent = 'Your weekly overview';
    action.style.display = 'none';
  } else if (page === 'settings') {
    subtitle.textContent = 'Preferences';
    action.style.display = 'none';
  }
}

function navActive(page) {
  document.querySelectorAll('.nav-link').forEach((a, i) => {
    const icon = a.querySelector('.material-symbols-outlined');
    const isActive = a.dataset.page === page;
    a.classList.toggle('text-primary', isActive);
    a.classList.toggle('text-slate-400', !isActive);
    a.classList.toggle('dark:text-slate-500', !isActive);
    icon?.classList.toggle('material-symbols-fill', isActive);
    icon.textContent = isActive && page === 'alarms' ? 'alarm' : 
      a.dataset.page === 'alarms' ? 'alarm' : 
      a.dataset.page === 'sleep' ? 'bedtime' :
      a.dataset.page === 'stats' ? 'bar_chart' : 'settings';
  });
}

function renderAlarmItem(alarm) {
  const opacity = alarm.enabled ? '' : ' opacity-60';
  const iconBg = alarm.enabled ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400';
  return `
    <div class="flex items-center gap-4 bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors alarm-item" data-id="${alarm.id}">
      <div class="flex items-center justify-center rounded-lg ${iconBg} shrink-0 size-12">
        <span class="material-symbols-outlined">${alarm.type}</span>
      </div>
      <div class="flex flex-1 flex-col justify-center">
        <div class="flex items-baseline gap-2">
          <p class="text-2xl font-bold text-slate-900 dark:text-white leading-none${opacity}">${alarm.time}</p>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase${opacity}">${alarm.period}</p>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-sm font-normal mt-1${opacity}">${DAY_LABELS[alarm.days] || alarm.days}</p>
      </div>
      <div class="shrink-0">
        <label class="relative flex h-7 w-12 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-slate-700 p-1 has-[:checked]:justify-end has-[:checked]:bg-primary transition-all">
          <span class="h-5 w-5 rounded-full bg-white shadow-sm block"></span>
          <input type="checkbox" ${alarm.enabled ? 'checked' : ''} class="alarm-toggle invisible absolute" data-id="${alarm.id}"/>
        </label>
      </div>
    </div>
  `;
}

function renderAlarmsPage() {
  const editSpan = document.getElementById('edit-span') || (() => {
    const s = document.createElement('span');
    s.id = 'edit-span';
    s.className = 'text-sm text-primary font-medium cursor-pointer';
    s.textContent = 'Edit';
    return s;
  })();
  editSpan.textContent = editMode ? 'Done' : 'Edit';
  editSpan.onclick = () => {
    editMode = !editMode;
    renderPage('alarms');
  };

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between px-2">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Alarms</h2>
        <span id="edit-span" class="text-sm text-primary font-medium cursor-pointer">Edit</span>
      </div>
      <div id="alarm-list" class="space-y-3">
        ${alarms.map(renderAlarmItem).join('')}
      </div>
      <div class="bg-primary/10 dark:bg-primary/20 rounded-xl p-4 border border-primary/20">
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-primary">lightbulb</span>
          <div>
            <h4 class="text-sm font-semibold text-primary">Power Saver Active</h4>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">Your alarms will still ring even if the device is in low power mode.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSleepPage() {
  return `
    <div class="space-y-6">
      <div class="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700/50">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-symbols-outlined text-primary text-3xl">bedtime</span>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Sleep Schedule</h2>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Set your ideal bedtime and wake time for better sleep consistency.</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Bedtime</label>
            <input type="time" value="22:30" class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-white"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Wake time</label>
            <input type="time" value="07:00" class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-white"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Wind-down duration</label>
            <select class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-white">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option selected>45 minutes</option>
              <option>1 hour</option>
            </select>
          </div>
        </div>
      </div>
      <div class="bg-slate-100 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50">
        <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span class="material-symbols-outlined">schedule</span>
          <span class="text-sm font-medium">~8.5 hours sleep target</span>
        </div>
      </div>
    </div>
  `;
}

function renderStatsPage() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const bars = days.map((d, i) => {
    const h = [7.2, 6.8, 7.5, 8.0, 6.5, 9.0, 8.5][i];
    const pct = (h / 10) * 100;
    return `<div class="flex flex-col items-center gap-2">
      <div class="w-8 h-24 rounded-t-lg bg-primary/30 dark:bg-primary/40 flex items-end justify-center">
        <div class="w-6 rounded-t bg-primary" style="height:${pct}%"></div>
      </div>
      <span class="text-xs font-medium text-slate-500 dark:text-slate-400">${d}</span>
      <span class="text-[10px] text-slate-400 dark:text-slate-500">${h}h</span>
    </div>`;
  }).join('');

  return `
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 px-2">Sleep This Week</h2>
      <div class="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700/50">
        <div class="flex items-end justify-between gap-2 h-32">
          ${bars}
        </div>
        <p class="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">Avg: 7.6 hours/night</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50">
          <span class="material-symbols-outlined text-primary text-2xl">alarm</span>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-2">${alarms.filter(a => a.enabled).length}</p>
          <p class="text-sm text-slate-500 dark:text-slate-400">Active alarms</p>
        </div>
        <div class="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50">
          <span class="material-symbols-outlined text-primary text-2xl">wb_sunny</span>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-2">12</p>
          <p class="text-sm text-slate-500 dark:text-slate-400">Snoozes this week</p>
        </div>
      </div>
    </div>
  `;
}

function renderSettingsPage() {
  const isDark = document.documentElement.classList.contains('dark');
  return `
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 px-2">Appearance</h2>
      <div class="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-slate-500 dark:text-slate-400">dark_mode</span>
            <span class="font-medium text-slate-900 dark:text-white">Dark mode</span>
          </div>
          <label class="relative flex h-7 w-12 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-slate-700 p-1 has-[:checked]:justify-end has-[:checked]:bg-primary transition-all">
            <span class="h-5 w-5 rounded-full bg-white shadow-sm block"></span>
            <input type="checkbox" id="dark-mode-toggle" ${isDark ? 'checked' : ''} class="invisible absolute"/>
          </label>
        </div>
        <div class="flex items-center justify-between p-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-slate-500 dark:text-slate-400">notifications</span>
            <span class="font-medium text-slate-900 dark:text-white">Alarm notifications</span>
          </div>
          <label class="relative flex h-7 w-12 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-slate-700 p-1 has-[:checked]:justify-end has-[:checked]:bg-primary transition-all">
            <span class="h-5 w-5 rounded-full bg-white shadow-sm block"></span>
            <input type="checkbox" checked class="invisible absolute"/>
          </label>
        </div>
      </div>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 px-2">Sounds</h2>
      <div class="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div class="flex items-center justify-between p-4">
          <span class="font-medium text-slate-900 dark:text-white">Default alarm sound</span>
          <span class="text-sm text-slate-500 dark:text-slate-400">Gentle sunrise</span>
        </div>
        <div class="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700/50">
          <span class="font-medium text-slate-900 dark:text-white">Volume</span>
          <span class="text-sm text-slate-500 dark:text-slate-400">80%</span>
        </div>
      </div>
    </div>
  `;
}

function renderPage(page) {
  const main = document.getElementById('main');
  main.innerHTML = '';

  if (page === 'alarms') {
    main.innerHTML = renderAlarmsPage();
    bindAlarmToggles();
  } else if (page === 'sleep') {
    main.innerHTML = renderSleepPage();
  } else if (page === 'stats') {
    main.innerHTML = renderStatsPage();
  } else if (page === 'settings') {
    main.innerHTML = renderSettingsPage();
    bindDarkModeToggle();
  }

  updateHeader(page);
  navActive(page);
}

function bindAlarmToggles() {
  document.querySelectorAll('.alarm-toggle').forEach(cb => {
    cb.onchange = () => {
      const id = parseInt(cb.dataset.id, 10);
      const alarm = alarms.find(a => a.id === id);
      if (alarm) {
        alarm.enabled = cb.checked;
        updateHeader('alarms');
      }
    };
  });
}

function bindDarkModeToggle() {
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.onchange = () => {
      document.documentElement.classList.toggle('dark', toggle.checked);
    };
  }
}

function openAddAlarmModal() {
  document.getElementById('add-alarm-modal').classList.remove('hidden');
  document.getElementById('add-alarm-modal').classList.add('flex');
}

function closeAddAlarmModal() {
  document.getElementById('add-alarm-modal').classList.add('hidden');
  document.getElementById('add-alarm-modal').classList.remove('flex');
}

function addAlarm() {
  const timeInput = document.getElementById('new-alarm-time');
  const repeatSelect = document.getElementById('new-alarm-repeat');
  const [h, m] = timeInput.value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  alarms.push({
    id: nextId++,
    time: timeStr,
    period,
    days: repeatSelect.value,
    type: 'smart_display',
    enabled: true,
  });
  alarms.sort((a, b) => {
    const ta = parseTime(a.time);
    const tb = parseTime(b.time);
    const minA = (ta.hour % 12) * 60 + ta.minute + (ta.period === 'PM' ? 720 : 0);
    const minB = (tb.hour % 12) * 60 + tb.minute + (tb.period === 'PM' ? 720 : 0);
    return minA - minB;
  });
  closeAddAlarmModal();
  renderPage('alarms');
}

function route() {
  const hash = (location.hash || '#alarms').slice(1);
  const page = ['alarms', 'sleep', 'stats', 'settings'].includes(hash) ? hash : 'alarms';
  renderPage(page);
}

// Init
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    location.hash = a.dataset.page;
  });
});

document.getElementById('modal-cancel')?.addEventListener('click', closeAddAlarmModal);
document.getElementById('modal-save')?.addEventListener('click', addAlarm);
document.getElementById('add-alarm-modal')?.addEventListener('click', e => {
  if (e.target.id === 'add-alarm-modal') closeAddAlarmModal();
});

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
