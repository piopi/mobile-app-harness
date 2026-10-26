/* global http, json, output, MAILPIT_URL, EMAIL */
// Read the newest sign-in code mailed to EMAIL from this stack's Mailpit (MAILPIT_URL, passed by `pnpm e2e`).
// Locally Supabase Auth puts the code in the subject ("123456 is your <app> code"; see supabase/config.toml).
// Mailpit's search matches words, so check the exact recipient: other runs' addresses share the prefix.
var code = null;
for (var i = 0; i < 40 && !code; i++) {
  var res = http.get(MAILPIT_URL + '/api/v1/search?limit=50&query=' + encodeURIComponent('to:"' + EMAIL + '"'));
  var messages = json(res.body).messages || [];
  for (var j = 0; j < messages.length && !code; j++) {
    var to = messages[j].To || [];
    var mine = false;
    for (var k = 0; k < to.length; k++) if ((to[k].Address || '').toLowerCase() === EMAIL.toLowerCase()) mine = true;
    var m = mine ? messages[j].Subject.match(/\b(\d{6})\b/) : null;
    if (m) code = m[1];
  }
}
if (!code) throw new Error('no sign-in code mailed to ' + EMAIL);
output.code = code;
