/**
 * System Techo v2 - Google Apps Script Backend
 * Tasks / Notes / Journal / DailyCache CRUD API
 * 個別行upsert/論理削除方式
 */

const SPREADSHEET_ID = '1ZImVrwRsnTqKptDOeEapj6yRFheY93YM-jW-9RYwupY';

const SHEET_NAMES = {
  tasks: 'Tasks',
  notes: 'Notes',
  journal: 'Journal',
  dailyCache: 'DailyCache'
};

const HEADERS = {
  tasks: ['id', 'title', 'priority', 'due', 'progress', 'status', 'note', 'shopping', 'created', 'updated', 'completedDate', 'deleted'],
  notes: ['id', 'type', 'title', 'content', 'url', 'source', 'pinned', 'read', 'readAt', 'created', 'updated', 'deleted'],
  journal: ['id', 'date', 'time', 'content', 'created', 'updated', 'deleted'],
  dailyCache: ['date', 'events', 'fetchedAt']
};

const CALENDAR_IDS = [
  {id: 'basabasa@en-conect.com', name: 'プライベート'},
  {id: 'c_8sv1q87i11lsbql5puu1bto420@group.calendar.google.com', name: '取材'},
  {id: 'c_d238efeadb857d0cfab95a973626c2f1d3ca5116e2f85f6ccccc21d848694ca5@group.calendar.google.com', name: '取材(調整中)'},
  {id: 'c_2376883f13ad1c7d785e4b0ec44bf04140ac4609e945563a4491c5bdd922f833@group.calendar.google.com', name: '定期予定'},
  {id: 'c_4321769af6ef44c4b6014f5d2e464935fc985ad326ff5df54be6587de1869349@group.calendar.google.com', name: '定期予定(仕事)'},
  {id: 'c_2dd3f3a724074ccfa2c8f674643f3158f3574d9f8d6545fa6a9d35f05e165ecf@group.calendar.google.com', name: '不定期予定(仕事)'},
];

// ========== Utility ==========

function nowJST() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function todayJST() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
}

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function makeResponse(obj) {
  obj.timestamp = nowJST();
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data) {
  return makeResponse({ success: true, data: data });
}

function errorResponse(message) {
  return makeResponse({ success: false, error: String(message) });
}

/**
 * シートからヘッダー行を読み取り、データ行をオブジェクト配列に変換する
 * deleted=TRUE の行を除外する（excludeDeleted=true の場合）
 */
function sheetToObjects(sheetName, excludeDeleted) {
  var sheet = getSheet(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var deletedIdx = headers.indexOf('deleted');
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (excludeDeleted && deletedIdx >= 0) {
      var dVal = data[i][deletedIdx];
      if (dVal === true || dVal === 'TRUE' || dVal === true) continue;
    }
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    results.push(obj);
  }
  return results;
}

/**
 * idで既存行を検索し、行番号(1-based)を返す。見つからなければ-1
 */
function findRowById(sheetName, id) {
  var sheet = getSheet(sheetName);
  if (!sheet) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) return -1;
  var idCol = sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(id)) {
      return i + 2; // 1-based, skip header
    }
  }
  return -1;
}

/**
 * 1件のupsert処理（共通）
 * sheetName: シート名
 * headersKey: HEADERSのキー
 * item: 書き込むオブジェクト
 */
function upsertRow(sheetName, headersKey, item) {
  var sheet = getSheet(sheetName);
  var cols = HEADERS[headersKey];
  var now = nowJST();

  // idが無ければ生成
  if (!item.id) {
    item.id = Utilities.getUuid();
  }
  item.updated = now;

  var existingRow = findRowById(sheetName, item.id);

  if (existingRow > 0) {
    // 既存行を更新: 既存値を読み取り、送られたフィールドのみ上書き
    var currentValues = sheet.getRange(existingRow, 1, 1, cols.length).getValues()[0];
    var headers = sheet.getRange(1, 1, 1, cols.length).getValues()[0];
    var newRow = [];
    for (var i = 0; i < cols.length; i++) {
      var key = cols[i];
      if (key in item) {
        newRow.push(item[key] != null ? item[key] : '');
      } else {
        newRow.push(currentValues[i]);
      }
    }
    sheet.getRange(existingRow, 1, 1, cols.length).setValues([newRow]);
    return { action: 'updated', id: item.id };
  } else {
    // 新規追加
    if (!item.created) item.created = now;
    var newRow = cols.map(function(key) {
      return item[key] != null ? item[key] : '';
    });
    sheet.appendRow(newRow);
    return { action: 'created', id: item.id };
  }
}

/**
 * 論理削除
 */
function softDelete(sheetName, headersKey, id) {
  var sheet = getSheet(sheetName);
  var cols = HEADERS[headersKey];
  var row = findRowById(sheetName, id);
  if (row < 0) {
    return { action: 'not_found', id: id };
  }
  var deletedIdx = cols.indexOf('deleted');
  var updatedIdx = cols.indexOf('updated');
  if (deletedIdx >= 0) {
    sheet.getRange(row, deletedIdx + 1).setValue('TRUE');
  }
  if (updatedIdx >= 0) {
    sheet.getRange(row, updatedIdx + 1).setValue(nowJST());
  }
  return { action: 'deleted', id: id };
}

// ========== Boolean / Type Conversion ==========

function toBool(val) {
  return val === true || val === 'TRUE' || val === 'true' || val === 1;
}

function formatTaskObj(obj) {
  obj.shopping = toBool(obj.shopping);
  obj.deleted = toBool(obj.deleted);
  if (obj.progress !== '') obj.progress = Number(obj.progress);
  return obj;
}

function formatNoteObj(obj) {
  obj.pinned = toBool(obj.pinned);
  obj.read = toBool(obj.read);
  obj.deleted = toBool(obj.deleted);
  return obj;
}

function formatJournalObj(obj) {
  obj.deleted = toBool(obj.deleted);
  return obj;
}

// ========== GET Handlers ==========

function doGet(e) {
  try {
    var type = (e.parameter.type || '').toLowerCase();

    switch (type) {
      case 'ping':
        return successResponse({ message: 'pong' });

      case 'tasks':
        return handleGetTasks();

      case 'notes':
        return handleGetNotes();

      case 'journal':
        return handleGetJournal(e.parameter);

      case 'calendar':
        return handleGetCalendar(e.parameter);

      case 'all':
        return handleGetAll();

      default:
        return errorResponse('Unknown type: ' + type);
    }
  } catch (err) {
    return errorResponse(err.message);
  }
}

function handleGetTasks() {
  var items = sheetToObjects(SHEET_NAMES.tasks, true);
  items = items.map(formatTaskObj);
  return successResponse({ tasks: items, count: items.length });
}

function handleGetNotes() {
  var items = sheetToObjects(SHEET_NAMES.notes, true);
  items = items.map(formatNoteObj);
  return successResponse({ notes: items, count: items.length });
}

function handleGetJournal(params) {
  if (params.date) {
    // 指定日のエントリ取得
    var targetDate = params.date;
    var all = sheetToObjects(SHEET_NAMES.journal, true);
    var filtered = all.filter(function(j) {
      return String(j.date) === targetDate;
    });
    filtered = filtered.map(formatJournalObj);
    return successResponse({ journal: filtered, count: filtered.length, date: targetDate });
  } else if (params.month) {
    // 指定月のJournal日付一覧（カレンダードット用）
    var targetMonth = params.month; // YYYY-MM
    var all = sheetToObjects(SHEET_NAMES.journal, true);
    var dateSet = {};
    all.forEach(function(j) {
      var d = String(j.date);
      if (d.substring(0, 7) === targetMonth) {
        dateSet[d] = (dateSet[d] || 0) + 1;
      }
    });
    // { "2026-04-01": 3, "2026-04-02": 1 } 形式
    return successResponse({ dates: dateSet, month: targetMonth });
  } else {
    return errorResponse('journal requires date or month parameter');
  }
}

function handleGetCalendar(params) {
  var dateStr = params.date || todayJST();
  var result = getCalendarEventsForDaily(dateStr);
  return successResponse(result);
}

function handleGetAll() {
  var tasks = sheetToObjects(SHEET_NAMES.tasks, true).map(formatTaskObj);
  var notes = sheetToObjects(SHEET_NAMES.notes, true).map(formatNoteObj);

  // Journalは当日分のみ（全件だと重すぎる可能性）
  var today = todayJST();
  var allJournal = sheetToObjects(SHEET_NAMES.journal, true);
  var todayJournal = allJournal.filter(function(j) {
    return String(j.date) === today;
  }).map(formatJournalObj);

  // Journal月のドット情報（今月分）
  var currentMonth = today.substring(0, 7);
  var journalDates = {};
  allJournal.forEach(function(j) {
    var d = String(j.date);
    if (d.substring(0, 7) === currentMonth) {
      journalDates[d] = (journalDates[d] || 0) + 1;
    }
  });

  return successResponse({
    tasks: tasks,
    notes: notes,
    journal: todayJournal,
    journalDates: journalDates,
    fetchedAt: nowJST()
  });
}

// ========== POST Handlers ==========

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : null;
    if (!raw) return errorResponse('No post data');
    var payload = JSON.parse(raw);
    var type = (payload.type || '').toLowerCase();

    switch (type) {
      case 'task_upsert':
        return handleTaskUpsert(payload);

      case 'task_delete':
        return handleTaskDelete(payload);

      case 'note_upsert':
        return handleNoteUpsert(payload);

      case 'note_delete':
        return handleNoteDelete(payload);

      case 'note_webhook':
        return handleNoteWebhook(payload);

      case 'journal_upsert':
        return handleJournalUpsert(payload);

      case 'journal_delete':
        return handleJournalDelete(payload);

      default:
        return errorResponse('Unknown type: ' + type);
    }
  } catch (err) {
    return errorResponse(err.message);
  }
}

function handleTaskUpsert(payload) {
  var item = payload.item || {};
  // Boolean正規化
  if ('shopping' in item) item.shopping = toBool(item.shopping) ? 'TRUE' : 'FALSE';
  if ('deleted' in item) item.deleted = toBool(item.deleted) ? 'TRUE' : 'FALSE';
  // completedDate: statusがdoneになった時にセット
  if (item.status === 'completed' && !item.completedDate) {
    item.completedDate = todayJST();
  }
  var result = upsertRow(SHEET_NAMES.tasks, 'tasks', item);
  return successResponse(result);
}

function handleTaskDelete(payload) {
  var id = payload.id;
  if (!id) return errorResponse('id is required');
  var result = softDelete(SHEET_NAMES.tasks, 'tasks', id);
  return successResponse(result);
}

function handleNoteUpsert(payload) {
  var item = payload.item || {};
  // Boolean正規化
  if ('pinned' in item) item.pinned = toBool(item.pinned) ? 'TRUE' : 'FALSE';
  if ('read' in item) item.read = toBool(item.read) ? 'TRUE' : 'FALSE';
  if ('deleted' in item) item.deleted = toBool(item.deleted) ? 'TRUE' : 'FALSE';
  // content長制限
  if (item.content) item.content = String(item.content).substring(0, 50000);
  var result = upsertRow(SHEET_NAMES.notes, 'notes', item);
  return successResponse(result);
}

function handleNoteDelete(payload) {
  var id = payload.id;
  if (!id) return errorResponse('id is required');
  var result = softDelete(SHEET_NAMES.notes, 'notes', id);
  return successResponse(result);
}

function handleNoteWebhook(payload) {
  // n8n等の外部からのノート追加
  var item = {
    id: Utilities.getUuid(),
    type: payload.noteType || 'webhook',
    title: payload.title || '',
    content: payload.content || '',
    url: payload.url || '',
    source: payload.source || 'n8n',
    pinned: 'FALSE',
    read: 'FALSE',
    readAt: '',
    created: nowJST(),
    updated: nowJST(),
    deleted: 'FALSE'
  };
  if (item.content) item.content = String(item.content).substring(0, 50000);
  var result = upsertRow(SHEET_NAMES.notes, 'notes', item);
  return successResponse(result);
}

function handleJournalUpsert(payload) {
  var item = payload.item || {};
  if ('deleted' in item) item.deleted = toBool(item.deleted) ? 'TRUE' : 'FALSE';
  // content長制限
  if (item.content) item.content = String(item.content).substring(0, 50000);
  var result = upsertRow(SHEET_NAMES.journal, 'journal', item);
  return successResponse(result);
}

function handleJournalDelete(payload) {
  var id = payload.id;
  if (!id) return errorResponse('id is required');
  var result = softDelete(SHEET_NAMES.journal, 'journal', id);
  return successResponse(result);
}

// ========== Google Calendar Integration ==========

function getCalendarEventsForDaily(dateStr) {
  var date = new Date(dateStr + 'T00:00:00+09:00');
  var nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  var events = [];

  CALENDAR_IDS.forEach(function(cal) {
    try {
      var calendar = CalendarApp.getCalendarById(cal.id);
      if (!calendar) return;
      var calEvents = calendar.getEventsForDay(date);
      calEvents.forEach(function(ev) {
        var isAllDay = ev.isAllDayEvent();
        var start = ev.getStartTime();
        var end = ev.getEndTime();
        var loc = ev.getLocation();
        var text = ev.getTitle();
        if (loc) text += ' @ ' + loc;

        var startHour = null;
        var endHour = null;
        var startTime = '';
        var endTime = '';

        if (isAllDay) {
          startTime = 'all-day';
          endTime = 'all-day';
        } else {
          startHour = start.getHours();
          var startMin = start.getMinutes();
          endHour = end.getHours();
          var endMin = end.getMinutes();
          if (endHour === 0 && endMin === 0) endHour = 24;
          else if (endMin > 0) endHour += 1;

          startTime = Utilities.formatDate(start, 'Asia/Tokyo', 'HH:mm');
          endTime = Utilities.formatDate(end, 'Asia/Tokyo', 'HH:mm');
        }

        events.push({
          id: 'cal_' + ev.getId().replace(/@.+$/, '').substring(0, 20),
          title: ev.getTitle(),
          location: loc || '',
          text: text,
          date: dateStr,
          startHour: startHour,
          endHour: endHour,
          startTime: startTime,
          endTime: endTime,
          isAllDay: isAllDay,
          calendarName: cal.name,
          source: 'calendar'
        });
      });
    } catch (err) {
      // Calendar not accessible, skip
    }
  });

  // 終日イベントを先頭、時刻付きイベントはstartHour順
  events.sort(function(a, b) {
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    if (a.isAllDay && b.isAllDay) return 0;
    return (a.startHour || 0) - (b.startHour || 0);
  });

  return { events: events, count: events.length, date: dateStr };
}
