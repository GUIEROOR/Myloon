/* 朴朴超市保守去广告：只清理明确的广告列表，保留响应结构。 */
(function () {
  if (typeof $response === "undefined" || !$response.body) return $done({});
  var url = $request.url || "";
  var obj;
  try { obj = JSON.parse($response.body); } catch (_) { return $done({}); }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return $done({});
  // 不修补/伪造错误响应，避免掩盖真正的接口故障
  if (typeof obj.errcode === "number" && obj.errcode !== 0) return $done({});
  var changed = false;
  function clear(container, key) {
    if (container && Object.prototype.hasOwnProperty.call(container, key) && Array.isArray(container[key]) && container[key].length) {
      container[key] = [];
      changed = true;
    }
  }
  if (/\/client\/marketing\/advertisement\/v\d+/.test(url)) {
    // 不将整个接口替换为 {}，只清空识别到的广告列表
    if (Array.isArray(obj.data)) { clear(obj, "data"); }
    else if (obj.data && typeof obj.data === "object") {
      ["advertisements", "advertisement_list", "ad_list", "ads", "list", "items"].forEach(function(k) { clear(obj.data, k); });
    }
  } else if (/\/client\/marketing\/banner\/v\d+/.test(url)) {
    // 仅过滤明确的开屏位 position_types=2，避免误伤首页的其他业务轮播
    if (!/[?&]position_types=(?:2|2%2C|2,)(?:&|$)/i.test(url)) return $done({});
    if (Array.isArray(obj.data)) { clear(obj, "data"); }
    else if (obj.data && typeof obj.data === "object") {
      ["banners", "banner_list", "list", "items"].forEach(function(k) { clear(obj.data, k); });
    }
  }
  return $done(changed ? {body: JSON.stringify(obj)} : {});
})();