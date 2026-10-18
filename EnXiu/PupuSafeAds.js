/* Pupu splash ad: precise region 50 filtering, preserve response schema and other home feeds.
 * HAR confirmed /client/marketing/advertisement/v1 data[].region_code=50,
 * positions[].code=50, advertisements["50"] array.
 */
(function () {
  if (typeof $response === "undefined" || !$response.body) return $done({});
  var url = $request.url || "";
  if (!/^https?:\/\/j1\.pupuapi\.com\/client\/marketing\/advertisement\/v1(?:\?|$)/i.test(url)) return $done({});
  var json;
  try { json = JSON.parse($response.body); } catch (e) { return $done({}); }
  if (!json || json.errcode !== 0 || !Array.isArray(json.data)) return $done({});
  var changed = false;
  json.data.forEach(function(region) {
    if (!region || Number(region.region_code) !== 50 || !Array.isArray(region.positions)) return;
    region.positions.forEach(function(position) {
      if (!position || Number(position.code) !== 50 || !position.advertisements ||
          typeof position.advertisements !== "object" || Array.isArray(position.advertisements)) return;
      if (Array.isArray(position.advertisements["50"]) && position.advertisements["50"].length > 0) {
        position.advertisements["50"] = [];
        changed = true;
      }
    });
  });
  console.log("[PupuSplashOnly] advertisement/v1 matched; region50_removed=" + changed);
  $done(changed ? {body: JSON.stringify(json)} : {});
})();
