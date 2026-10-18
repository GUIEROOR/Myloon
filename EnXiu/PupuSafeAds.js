/* PuPu selective UI promo filtering based on observed HAR:
   splash 50; modal 80; incentivized floating 2511; speaker 630.
   Do not touch catalog, coupons, checkout, task/reward APIs or structural fields. */
(function () {
  if (typeof $response === "undefined" || !$response.body) return $done({});
  var url = ($request && $request.url) || "";
  if (!/^https?:\/\/j1\.pupuapi\.com\/client\/marketing\/advertisement\/v1(?:\?|$)/i.test(url)) return $done({});
  var doc;
  try { doc = JSON.parse($response.body); } catch (e) { return $done({}); }
  if (!doc || doc.errcode !== 0 || !Array.isArray(doc.data)) return $done({});
  // 50 splash screen; 80 modal; 2511 cash task bubble; 630 marketing horn.
  // Keep region/position and key shape to minimize app-side parse failures.
  var blocked = { "50": true, "80": true, "2511": true, "630": true };
  var changed = false;
  doc.data.forEach(function (region) {
    if (!region || !Array.isArray(region.positions)) return;
    region.positions.forEach(function (pos) {
      if (!pos || !blocked[String(pos.code)] || !pos.advertisements ||
          typeof pos.advertisements !== "object" || Array.isArray(pos.advertisements)) return;
      Object.keys(pos.advertisements).forEach(function (key) {
        if (Array.isArray(pos.advertisements[key]) && pos.advertisements[key].length) {
          pos.advertisements[key] = [];
          changed = true;
        }
      });
    });
  });
  $done(changed ? { body: JSON.stringify(doc) } : {});
})();