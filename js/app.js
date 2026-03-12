// SilentAlarm - App State & Routing
const DAY_LABELS = {
  weekdays: 'Mon, Tue, Wed, Thu, Fri',
  weekends: 'Sat, Sun',
  wednesday: 'Wednesday',
  everyday: 'Everyday'
};

const SOUND_PRESETS = {
  gentle: { name: 'Gentle sunrise', url: 'https://assets.mixkit.co/active_storage/sfx/2560-mixkit-alarm-digital-clock-beep-989.mp3' },
  chime: { name: 'Soft chime', url: 'https://assets.mixkit.co/active_storage/sfx/2570-mixkit-modern-classic-alarm-beep-993.mp3' },
  classic: { name: 'Classic bell', url: 'https://assets.mixkit.co/active_storage/sfx/2569-mixkit-retro-clock-alarm-883.mp3' }
};

let alarms = [
  { id: 1, time: '07:30', period: 'AM', days: 'weekdays', type: 'smart_display', enabled: true, sound: { type: 'gentle', value: null } },
  { id: 2, time: '09:00', period: 'AM', days: 'weekends', type: 'audio_file', enabled: false, sound: { type: 'chime', value: null } },
  { id: 3, time: '06:45', period: 'AM', days: 'wednesday', type: 'smart_display', enabled: true, sound: { type: 'gentle', value: null } },
  { id: 4, time: '10:30', period: 'PM', days: 'everyday', type: 'audio_file', enabled: false, sound: { type: 'classic', value: null } },
];

let editMode = false;
let editingAlarmId = null;
let nextId = 5;

// Audio output device (localStorage)
const AUDIO_OUTPUT_KEY = 'silentalarm_audio_output';
function getStoredAudioOutput() {
  try {
    const s = localStorage.getItem(AUDIO_OUTPUT_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function setStoredAudioOutput(deviceId, label) {
  localStorage.setItem(AUDIO_OUTPUT_KEY, JSON.stringify({ deviceId, label }));
}
async function applySinkId(audioElement) {
  const stored = getStoredAudioOutput();
  if (stored?.deviceId && audioElement.setSinkId) {
    try {
      await audioElement.setSinkId(stored.deviceId);
    } catch (_) {}
  }
}

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

function ensureAlarmSound(alarm) {
  if (!alarm.sound) alarm.sound = { type: 'gentle', value: null };
  return alarm;
}

function updateHeader(page) {
  const subtitle = document.getElementById('header-subtitle');
  const action = document.getElementById('header-action');
  const addIcon = action?.querySelector('.material-symbols-outlined');

  if (page === 'alarms') {
    subtitle.textContent = `Next: ${getNextAlarm() || 'None'}`;
    action.style.display = 'flex';
    action.onclick = () => { editingAlarmId = null; openAddAlarmModal(); };
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
  document.querySelectorAll('.nav-link').forEach((a) => {
    const icon = a.querySelector('.material-symbols-outlined');
    const isActive = a.dataset.page === page;
    a.classList.toggle('text-primary', isActive);
    a.classList.toggle('text-slate-400', !isActive);
    a.classList.toggle('dark:text-slate-500', !isActive);
    icon?.classList.toggle('material-symbols-fill', isActive);
    icon.textContent = isActive && page === 'alarms' ? 'alarm' : a.dataset.page === 'alarms' ? 'alarm' : a.dataset.page === 'sleep' ? 'bedtime' : a.dataset.page === 'stats' ? 'bar_chart' : 'settings';
  });
}

function getSoundLabel(alarm) {
  alarm = ensureAlarmSound(alarm);
  const s = alarm.sound;
  if (s.type === 'gentle' || s.type === 'chime' || s.type === 'classic') return SOUND_PRESETS[s.type]?.name || s.type;
  if (s.type === 'youtube' && s.value) return 'YouTube';
  if (s.type === 'upload' && s.value) return 'Custom audio';
  return 'Gentle sunrise';
}

function renderAlarmItem(alarm) {
  alarm = ensureAlarmSound(alarm);
  const enabled = alarm.enabled;
  const opacity = enabled ? '' : ' opacity-60';
  const iconBg = enabled ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400';
  const cardBorder = enabled ? 'border-primary/40 dark:border-primary/50 ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-700/50';
  const deleteBtn = editMode ? `<button class="alarm-delete p-2 -ml-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors shrink-0" data-id="${alarm.id}" aria-label="Delete"><span class="material-symbols-outlined text-xl">delete</span></button>` : '';

  return `
    <div class="flex items-center gap-4 bg-white dark:bg-slate-800/50 p-4 rounded-xl border ${cardBorder} hover:bg-slate-50 dark:hover:bg-slate-800 transition-all alarm-item ${enabled ? 'shadow-sm shadow-primary/5' : ''}" data-id="${alarm.id}">
      ${deleteBtn}
      <div class="alarm-card-content flex flex-1 items-center gap-4 min-w-0 ${editMode ? 'cursor-pointer hover:opacity-90' : ''}" data-id="${alarm.id}" title="${editMode ? 'Tap to edit' : ''}">
        <div class="flex items-center justify-center rounded-lg ${iconBg} shrink-0 size-12">
          <span class="material-symbols-outlined">${alarm.type}</span>
        </div>
        <div class="flex flex-1 flex-col justify-center min-w-0">
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-bold text-slate-900 dark:text-white leading-none${opacity}">${alarm.time}</p>
            <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase${opacity}">${alarm.period}</p>
          </div>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-normal mt-1${opacity} truncate">${DAY_LABELS[alarm.days] || alarm.days}</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">${getSoundLabel(alarm)}</p>
        </div>
      </div>
      <div class="shrink-0">
        <label class="relative flex h-8 w-14 cursor-pointer items-center rounded-full p-1 transition-all bg-slate-200 dark:bg-slate-700 has-[:checked]:bg-primary has-[:checked]:shadow-lg has-[:checked]:shadow-primary/30 has-[:checked]:justify-end">
          <span class="h-6 w-6 rounded-full bg-white shadow-md block"></span>
          <input type="checkbox" ${enabled ? 'checked' : ''} class="alarm-toggle invisible absolute" data-id="${alarm.id}"/>
        </label>
      </div>
    </div>
  `;
}

function renderAlarmsPage() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between px-2">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Alarms</h2>
        <span id="edit-span" class="text-sm text-primary font-medium cursor-pointer hover:underline">${editMode ? 'Done' : 'Edit'}</span>
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
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 px-2">Audio output</h2>
      <div class="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
          <div class="flex items-center gap-3 min-w-0">
            <span class="material-symbols-outlined text-slate-500 dark:text-slate-400 shrink-0">speaker</span>
            <div class="min-w-0">
              <span class="font-medium text-slate-900 dark:text-white block">Play alarm through</span>
              <span id="audio-output-label" class="text-sm text-slate-500 dark:text-slate-400 truncate block">Default device</span>
            </div>
          </div>
          <button id="choose-speaker-btn" class="shrink-0 py-2 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Change
          </button>
        </div>
        <div class="p-4 border-t border-slate-200 dark:border-slate-700/50">
          <button id="test-speaker-btn" class="flex items-center gap-2 w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <span class="material-symbols-outlined text-lg">play_circle</span>
            Test sound
          </button>
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
    bindAlarmsPage();
  } else if (page === 'sleep') {
    main.innerHTML = renderSleepPage();
  } else if (page === 'stats') {
    main.innerHTML = renderStatsPage();
  } else if (page === 'settings') {
    main.innerHTML = renderSettingsPage();
    bindDarkModeToggle();
    bindAudioOutputSettings();
  }

  updateHeader(page);
  navActive(page);
}

function bindAlarmsPage() {
  // Edit/Done button
  document.getElementById('edit-span')?.addEventListener('click', () => {
    editMode = !editMode;
    renderPage('alarms');
  });

  // Toggle switches
  document.querySelectorAll('.alarm-toggle').forEach(cb => {
    cb.onchange = () => {
      const id = parseInt(cb.dataset.id, 10);
      const alarm = alarms.find(a => a.id === id);
      if (alarm) {
        alarm.enabled = cb.checked;
        renderPage('alarms');
      }
    };
  });

  // Delete buttons (edit mode)
  document.querySelectorAll('.alarm-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id, 10);
      if (confirm('Delete this alarm?')) {
        alarms = alarms.filter(a => a.id !== id);
        renderPage('alarms');
      }
    });
  });

  // Click alarm card to edit (edit mode only)
  document.querySelectorAll('.alarm-card-content').forEach(el => {
    if (!editMode) return;
    el.addEventListener('click', (e) => {
      if (e.target.closest('.alarm-toggle') || e.target.closest('.alarm-delete')) return;
      const id = parseInt(el.dataset.id, 10);
      openEditAlarmModal(id);
    });
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

function updateAudioOutputLabel() {
  const el = document.getElementById('audio-output-label');
  if (!el) return;
  const stored = getStoredAudioOutput();
  el.textContent = stored?.label || 'Default device';
}

async function chooseAudioOutput() {
  const chooseBtn = document.getElementById('choose-speaker-btn');
  if (!chooseBtn) return;
  chooseBtn.disabled = true;
  chooseBtn.textContent = '...';
  try {
    if (navigator.mediaDevices?.selectAudioOutput) {
      const device = await navigator.mediaDevices.selectAudioOutput();
      setStoredAudioOutput(device.deviceId, device.label);
      updateAudioOutputLabel();
    } else {
      const devices = await navigator.mediaDevices?.enumerateDevices?.() || [];
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      if (outputs.length === 0) {
        alert('No audio output devices found. This feature requires a secure connection (HTTPS) and may not be supported in all browsers.');
        return;
      }
      const labels = outputs.map((d, i) => `${i + 1}. ${d.label || 'Speaker ' + (i + 1)}`).join('\n');
      const choice = prompt(`Enter the number of your preferred device (1-${outputs.length}):\n\n${labels}`);
      if (choice) {
        const idx = parseInt(choice, 10) - 1;
        if (idx >= 0 && idx < outputs.length) {
          const d = outputs[idx];
          setStoredAudioOutput(d.deviceId, d.label || 'Speaker ' + (idx + 1));
          updateAudioOutputLabel();
        }
      }
    }
  } catch (err) {
    if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
      console.warn('Audio output selection:', err);
    }
  } finally {
    chooseBtn.disabled = false;
    chooseBtn.textContent = 'Change';
  }
}

async function testAudioOutput() {
  const testBtn = document.getElementById('test-speaker-btn');
  if (!testBtn) return;
  testBtn.disabled = true;
  const icon = testBtn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = 'hourglass_empty';
  const audio = new Audio(SOUND_PRESETS.gentle.url);
  await applySinkId(audio);
  audio.volume = 0.5;
  audio.onended = () => {
    testBtn.disabled = false;
    if (icon) icon.textContent = 'play_circle';
  };
  audio.onerror = () => {
    testBtn.disabled = false;
    if (icon) icon.textContent = 'play_circle';
  };
  audio.play().catch(() => {
    testBtn.disabled = false;
    if (icon) icon.textContent = 'play_circle';
  });
}

function bindAudioOutputSettings() {
  updateAudioOutputLabel();
  const chooseBtn = document.getElementById('choose-speaker-btn');
  const testBtn = document.getElementById('test-speaker-btn');
  if (chooseBtn) chooseBtn.addEventListener('click', chooseAudioOutput);
  if (testBtn) testBtn.addEventListener('click', testAudioOutput);
}

function toggleSoundFields() {
  const type = document.getElementById('alarm-sound-type').value;
  document.getElementById('sound-youtube-wrap').classList.toggle('hidden', type !== 'youtube');
  document.getElementById('sound-upload-wrap').classList.toggle('hidden', type !== 'upload');
  document.getElementById('alarm-sound-youtube').value = '';
  document.getElementById('alarm-sound-file').value = '';
}

function openAddAlarmModal() {
  editingAlarmId = null;
  document.getElementById('modal-title').textContent = 'Add Alarm';
  document.getElementById('new-alarm-time').value = '07:00';
  document.getElementById('new-alarm-label').value = '';
  document.getElementById('new-alarm-repeat').value = 'weekdays';
  document.getElementById('alarm-sound-type').value = 'gentle';
  toggleSoundFields();
  document.getElementById('add-alarm-modal').classList.remove('hidden');
  document.getElementById('add-alarm-modal').classList.add('flex');
}

function openEditAlarmModal(id) {
  const alarm = alarms.find(a => a.id === id);
  if (!alarm) return;
  ensureAlarmSound(alarm);

  editingAlarmId = id;
  document.getElementById('modal-title').textContent = 'Edit Alarm';

  const [h, m] = alarm.time.split(':');
  let hour24 = parseInt(h, 10);
  if (alarm.period === 'PM' && hour24 !== 12) hour24 += 12;
  if (alarm.period === 'AM' && hour24 === 12) hour24 = 0;
  const timeVal = `${String(hour24).padStart(2, '0')}:${m}`;
  document.getElementById('new-alarm-time').value = timeVal;
  document.getElementById('new-alarm-label').value = alarm.label || '';
  document.getElementById('new-alarm-repeat').value = alarm.days;
  document.getElementById('alarm-sound-type').value = alarm.sound.type;
  document.getElementById('alarm-sound-youtube').value = alarm.sound.type === 'youtube' ? (alarm.sound.value || '') : '';
  toggleSoundFields();
  if (alarm.sound.type === 'upload' && alarm.sound.value) {
    document.getElementById('alarm-sound-file').dataset.hasFile = '1';
  } else {
    document.getElementById('alarm-sound-file').value = '';
    document.getElementById('alarm-sound-file').removeAttribute('data-has-file');
  }

  document.getElementById('add-alarm-modal').classList.remove('hidden');
  document.getElementById('add-alarm-modal').classList.add('flex');
}

function closeAddAlarmModal() {
  document.getElementById('add-alarm-modal').classList.add('hidden');
  document.getElementById('add-alarm-modal').classList.remove('flex');
  editingAlarmId = null;
}

function parseSoundFromForm(existingSound) {
  const type = document.getElementById('alarm-sound-type').value;
  let value = null;
  if (type === 'youtube') {
    value = document.getElementById('alarm-sound-youtube').value.trim() || null;
  } else if (type === 'upload') {
    const fileInput = document.getElementById('alarm-sound-file');
    if (fileInput.files && fileInput.files[0]) {
      return new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve({ type: 'upload', value: fr.result });
        fr.readAsDataURL(fileInput.files[0]);
      });
    }
    value = existingSound?.type === 'upload' ? existingSound.value : null;
  }
  return Promise.resolve({ type, value });
}

function addOrUpdateAlarm() {
  const timeInput = document.getElementById('new-alarm-time');
  const repeatSelect = document.getElementById('new-alarm-repeat');
  const [h, m] = timeInput.value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const label = document.getElementById('new-alarm-label').value.trim();

  const existingAlarm = editingAlarmId ? alarms.find(a => a.id === editingAlarmId) : null;
  parseSoundFromForm(existingAlarm?.sound).then((sound) => {
    if (editingAlarmId) {
      const alarm = alarms.find(a => a.id === editingAlarmId);
      if (alarm) {
        alarm.time = timeStr;
        alarm.period = period;
        alarm.days = repeatSelect.value;
        alarm.label = label || undefined;
        alarm.sound = sound;
      }
    } else {
      alarms.push({
        id: nextId++,
        time: timeStr,
        period,
        days: repeatSelect.value,
        type: 'smart_display',
        enabled: true,
        label: label || undefined,
        sound: sound
      });
      alarms.sort((a, b) => {
        const ta = parseTime(a.time);
        const tb = parseTime(b.time);
        const minA = (ta.hour % 12) * 60 + ta.minute + (ta.period === 'PM' ? 720 : 0);
        const minB = (tb.hour % 12) * 60 + tb.minute + (tb.period === 'PM' ? 720 : 0);
        return minA - minB;
      });
    }
    closeAddAlarmModal();
    renderPage('alarms');
  });
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
document.getElementById('modal-save')?.addEventListener('click', addOrUpdateAlarm);
document.getElementById('add-alarm-modal')?.addEventListener('click', e => {
  if (e.target.id === 'add-alarm-modal') closeAddAlarmModal();
});

document.getElementById('alarm-sound-type')?.addEventListener('change', toggleSoundFields);

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
