// locate.js — 「我的位置」:包瀏覽器 Geolocation(手機 GPS 不需要網路,離線也能定位)。
//
// 只在使用者選「距離近→遠」時才開始追蹤、切走就停(省電,也不無故要權限)。
// 對外只露 startWatch / stopWatch;位置怎麼用(排序、顯示距離)是殼層的事。

let watchId = null;

// onPos({ lat, lng, acc })(acc = 精確度半徑,公尺);onErr(訊息)。重複呼叫無副作用。
export function startWatch(onPos, onErr) {
  if (!('geolocation' in navigator)) { onErr('這個瀏覽器不支援定位'); return; }
  if (watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(
    (p) => onPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
    (e) => onErr(errText(e)),
    // timeout 只是「多久沒結果就提示一次」;watch 本身會繼續找,之後定到位會自動更新
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 60000 },
  );
}

export function stopWatch() {
  if (watchId === null) return;
  navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

function errText(e) {
  switch (e.code) {
    case 1: return '定位權限被拒絕:請在瀏覽器網站權限與手機系統設定中允許位置存取';
    case 2: return '目前無法取得位置:室內或訊號弱時常見,到戶外再試';
    case 3: return '定位還沒成功:沒網路時 GPS 第一次定位較慢,到戶外空曠處稍等,定到會自動更新';
    default: return '定位失敗';
  }
}
