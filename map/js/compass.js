// compass.js — 手機朝向(羅盤,不需要網路)。
//
// 只採用「以北為基準的絕對方位」:deviceorientationabsolute,或 absolute=true 的 deviceorientation。
// 拿不到絕對方位(桌機、部分瀏覽器)就永遠不回報 → 畫面退回純文字方位(往東北 520m),不會亂指。
// 對外只露 startCompass / stopCompass。

let evName = null;
let handler = null;

// onHeading(deg):手機螢幕上方朝向的方位角(0=北,順時針)。重複呼叫無副作用。
export function startCompass(onHeading) {
  if (handler) return;
  evName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  handler = (e) => {
    if (e.alpha == null) return;
    if (evName === 'deviceorientation' && !e.absolute) return;   // 相對方位(不以北為準)不能拿來指路
    // alpha 是逆時針角度 → 羅盤方位 = 360 - alpha;再補上螢幕旋轉(橫拿手機時)
    const angle = (screen.orientation && screen.orientation.angle) || 0;
    onHeading((360 - e.alpha + angle) % 360);
  };
  window.addEventListener(evName, handler);
}

export function stopCompass() {
  if (!handler) return;
  window.removeEventListener(evName, handler);
  handler = null;
}
