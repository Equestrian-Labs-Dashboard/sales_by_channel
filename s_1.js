
document.documentElement.setAttribute('data-theme','light');localStorage.setItem('theme','light');window.toggleTheme=function(){var cur=document.documentElement.getAttribute('data-theme');var next=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',next);localStorage.setItem('theme',next);var b=document.getElementById('themeBtn');if(b)b.textContent='Theme';};(function(){var b=document.getElementById('themeBtn');if(b)b.textContent='Theme';})();
var DEFAULT_PROJECT_START='2026-06-01';var currentMode=localStorage.getItem('hits_mode')||'week';var weekOptions=[];var currentData=null;var activePanel=false;var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function setMode(mode){currentMode=mode;localStorage.setItem('hits_mode',mode);document.getElementById('tabWeek').classList.toggle('active',mode==='week');document.getElementById('tabMonth').classList.toggle('active',mode==='month');document.getElementById('tabCumulative').classList.toggle('active',mode==='cumulative');document.getElementById('tabProject').classList.toggle('active',mode==='project');document.getElementById('weekCtrl').style.display=mode==='week'?'':'none';document.getElementById('monthCtrl').style.display=mode==='month'?'':'none';document.getElementById('projectCtrl').style.display=mode==='project'?'':'none';if(mode==='project')loadProjectData();else loadData();}
function buildMonthOptions(opts){var sel=document.getElementById('monthSelect');sel.innerHTML='';var list=opts||[];if(!list.length){var opt=document.createElement('option');opt.value='2026:6';opt.textContent='June 2026 · Goal not loaded';sel.appendChild(opt);}else{list.forEach(function(o){var opt=document.createElement('option');opt.value=o.value||(o.year+':'+o.month);opt.textContent=o.label;opt.setAttribute('data-goal',o.goal||0);sel.appendChild(opt);});}var saved=localStorage.getItem('hits_month');if(saved){var exists=[].slice.call(sel.options).some(function(o){return o.value===saved;});if(exists)sel.value=saved;}sel.onchange=function(){localStorage.setItem('hits_month',sel.value);loadData();};}
function buildWeekOptions(opts){weekOptions=opts||[];var sel=document.getElementById('weekSelect');sel.innerHTML='';weekOptions.forEach(function(o,i){var opt=document.createElement('option');opt.value=i;opt.textContent=o.label;sel.appendChild(opt);});var saved=localStorage.getItem('hits_week');if(saved&&weekOptions[Number(saved)])sel.value=saved;sel.onchange=function(){localStorage.setItem('hits_week',sel.value);loadData();};}
function paramsFromUI(){if(currentMode==='cumulative')return{cumulative:true};if(currentMode==='month'){var monthEl=document.getElementById('monthSelect');if(!monthEl||!monthEl.value)throw new Error('No month options are available. Run the GitHub Action to generate report-data.json.');var parts=monthEl.value.split(':');return{year:Number(parts[0]),month:Number(parts[1])};}var idx=Number(document.getElementById('weekSelect').value||0);var w=weekOptions[idx]||weekOptions[0];if(!w)throw new Error('No week options are available. Run the GitHub Action Update HITS Hudson report.');return{startISO:w.startISO,endISO:w.endISO,label:w.label};}
function loadData(){var btn=document.getElementById('refreshBtn');if(btn)btn.disabled=true;document.getElementById('main').innerHTML='<div class="loading"><div class="spinner"></div>Loading HITS Hudson report...</div>';var params;try{params=paramsFromUI();}catch(e){if(btn)btn.disabled=false;showError(e.message||String(e));return;}google.script.run.withSuccessHandler(function(data){if(btn)btn.disabled=false;if(!data||data.error){showError(data?data.error:'Empty response');return;}currentData=data;activePanel=false;render(data);}).withFailureHandler(function(err){if(btn)btn.disabled=false;showError(err.message||String(err));}).getHitsData(params);}
function showError(msg){document.getElementById('main').innerHTML='<div class="err-box">'+escHtml(msg)+'</div>';}
function escHtml(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
function fmt(n){n=Number(n||0);return '$'+n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}function fmtNeg(n){n=Number(n||0);return (n?'-$':'$')+Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtPct(n){return (Number(n||0)*100).toFixed(1)+'%';}
function fmtDate(s){if(!s)return'';var d=new Date(s);return isNaN(d)?s:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
function rule(label,val,desc){return '<div class="rule-card"><div class="rule-lbl">'+escHtml(label)+'</div><div class="rule-val">'+escHtml(val)+'</div><div class="rule-desc">'+escHtml(desc)+'</div></div>';}
function statusBadgeClass(label){label=String(label||'').toUpperCase();if(label.indexOf('CANCEL')>=0||label.indexOf('REFUND')>=0)return 'b-ret';if(label.indexOf('UNFULFILLED')>=0||label.indexOf('PARTIAL')>=0)return 'b-warn';if(label.indexOf('PAID')>=0||label.indexOf('FULFILLED')>=0||label.indexOf('OPEN')>=0)return 'b-src';return 'b-wel';}
function deliveryBadgeClass(label){label=String(label||'').toUpperCase();return label==='IN STORE'?'b-src':'b-warn';}
function tagHtml(o){
  var tags=o&&o.all_order_tags?String(o.all_order_tags):'No tags';
  var has=!!(o&&o.tag_has_hits);
  var cls=has?'b-src':'b-warn';
  var label=has?'HitsHudson':'Missing HitsHudson';
  return '<div><span class="badge '+cls+'">'+escHtml(label)+'</span></div><div class="odate tags-text" title="'+escHtml(tags)+'">'+escHtml(tags)+'</div>';
}

function achievementInfo(actual,goal,hasStarted){
  actual=Number(actual||0);goal=Number(goal||0);
  var pct=goal>0?(actual/goal)*100:0;
  if(!hasStarted)return{pct:pct,label:'Planned',cls:'planned'};
  if(pct>=90)return{pct:pct,label:'',cls:'met'};
  if(pct>=65)return{pct:pct,label:'',cls:'watch'};
  return{pct:pct,label:'',cls:'missed'};
}
function goalSummaryHtml(data){
  var g=(data&&data.goal_context)||{};
  var s=(data&&data.summary)||{};
  var goal=Number(g.goal||0);
  if(!goal)return '';
  var actual=Number(s.gross_sales||0);
  var diff=actual-goal;
  var hasActual=Number(s.total_orders||0)>0||actual>0;
  var started=true;
  var ach=achievementInfo(actual,goal,started);
  var cls=ach.cls==='met'?'met':(ach.cls==='watch'?'':'missed');
  var period='Selected period';
  if(g.type==='week'&&g.week)period='Week '+g.week;
  else if(g.type==='month')period='Selected month';
  else if(g.type==='cumulative')period='Cumulative since HITS started';
  var source=g.source||'Repository report-data.json';
  var weeks=(g.weeks||[]).map(function(w){return 'W'+w.week+' '+fmt0(w.goal);}).join(' · ');
  var needed=diff<0?Math.abs(diff):0;
  return '<div class="goal-summary-grid">'
    +'<div class="goal-summary-card"><div class="k">Goal period</div><div class="v">'+escHtml(period)+'</div><div class="d">'+escHtml((g.startISO||'')+' – '+(g.endISO||''))+'</div></div>'
    +'<div class="goal-summary-card"><div class="k">'+(g.type==='cumulative'?'Cumulative gross sales goal':g.type==='month'?'Monthly gross sales goal':'Weekly gross sales goal')+'</div><div class="v">'+fmt0(goal)+'</div><div class="d">'+escHtml(weeks||'Loaded from repository report-data.json.')+'</div></div>'
    +'<div class="goal-summary-card '+(ach.cls==='met'?'met':ach.cls==='watch'?'':'missed')+'"><div class="k">Shopify gross sales actual</div><div class="v">'+fmt0(actual)+'</div><div class="d">Gap / over goal: <span class="'+(diff>=0?'good':'bad')+'">'+fmt0(diff)+'</span></div></div>'
    +'<div class="goal-summary-card '+(ach.cls==='met'?'met':ach.cls==='watch'?'':'missed')+'"><div class="k">Gross sales achievement</div><div class="v"><span class="goal-status-pill '+ach.cls+'">'+ach.pct.toFixed(1)+'%</span></div><div class="d">'+(diff>=0?'Over goal by ':'Still needed: ')+fmt0(diff>=0?diff:needed)+' · Source: '+escHtml(source)+'</div></div>'
    +'</div>';
}
function render(data){document.getElementById('periodLabel').textContent=data.period_label||'';var summary=data.summary||{};var orders=data.orders||[];var stats=data.stats||{};var g=(data&&data.goal_context)||{};var scope=g.type==='cumulative'?'Cumulative':(g.type==='month'?'Monthly':'Weekly');var periodDesc=g.type==='cumulative'?'Since HITS started':(g.type==='month'?'Selected month':'Selected week');var goalHtml=goalSummaryHtml(data);if(!orders.length){document.getElementById('main').innerHTML=goalHtml+'<div class="empty">No HITS Hudson orders found for this period under the HITS location/tag rules.<br>Audit fields still show order tag and source when orders are found.<br><br>The selected period KPIs remain visible above so the team can review the goal and actual performance.</div>';return;}
var rows=orders.map(function(o,i){return '<tr onclick="togglePanel()"><td><div class="oid">'+escHtml(o.order_id)+'</div><div class="odate">'+fmtDate(o.order_date)+'</div></td><td>'+tagHtml(o)+'</td><td><div class="cname">'+escHtml(o.customer||'N/A')+'</div><div class="odate">'+escHtml(o.customer_email||'')+'</div></td><td><span class="badge '+statusBadgeClass(o.payment_status)+'">'+escHtml(o.payment_status||'Unknown')+'</span></td><td><span class="badge '+statusBadgeClass(o.fulfillment_status)+'">'+escHtml(o.fulfillment_status||'Unknown')+'</span></td><td><span class="badge '+deliveryBadgeClass(o.delivery_method)+'">'+escHtml(o.delivery_method||'IN STORE')+'</span></td><td class="mono">'+fmt(o.gross_sales)+'</td><td class="mono">'+fmtNeg(o.discounts)+'</td><td class="mono">'+fmtNeg(o.returns)+'</td><td class="mono">'+fmt(o.net_sales)+'</td><td class="mono">'+fmt(o.shipping_charges)+'</td><td class="mono">'+fmt(o.taxes)+'</td><td class="mono">'+fmt(o.total_sales)+'</td><td class="mono">'+fmt(o.gross_profit)+'</td><td class="mono">'+fmtPct(o.gross_margin)+'</td><td class="mono">'+escHtml(o.units||0)+'</td></tr>';}).join('');
document.getElementById('main').innerHTML=goalHtml+'<div class="rules-grid">'+rule(scope+' Gross Sales',fmt(summary.gross_sales),periodDesc+' · excludes taxes/shipping')+rule(scope+' Discounts',fmt(summary.discounts),periodDesc+' order discounts')+rule(scope+' Returns',fmt(summary.returns),periodDesc+' product returns')+rule(scope+' Net Sales',fmt(summary.net_sales),periodDesc+' · gross - discounts - returns')+rule(scope+' Orders',summary.total_orders,periodDesc+' unique orders')+rule(scope+' Shipping Charges',fmt(summary.shipping_charges),periodDesc+' order shipping')+(g.type==='month'?rule('Monthly Total Commissions',fmt(Number(summary.net_sales||0)*0.05),'5% of selected month Net Sales'):rule(scope+' Taxes',fmt(summary.taxes),periodDesc+' order taxes'))+rule(scope+' Total Sales',fmt(summary.total_sales),periodDesc+' Shopify total')+rule(scope+' Gross Profit',fmt(summary.gross_profit),periodDesc+' · net sales - COGS')+rule(scope+' Gross Margin',fmtPct(summary.gross_margin),periodDesc+' · gross profit / net sales')+rule(scope+' Units',summary.units,periodDesc+' units')+rule(scope+' COGS',fmt(summary.cogs),periodDesc+' adjusted COGS')+'</div><div class="slbl">HITS Hudson orders</div><div class="tblwrap"><table class="ov-table"><thead><tr><th>Order ID</th><th>Order Tags</th><th>Customer</th><th>Payment</th><th>Fulfillment</th><th>Delivery</th><th>Gross Sales</th><th>Discounts</th><th>Returns</th><th>Net Sales</th><th>Shipping</th><th>Taxes</th><th>Total Sales</th><th>Gross Profit</th><th>Gross Margin</th><th>Units</th></tr></thead><tbody>'+rows+'</tbody></table></div><div id="detailPanel" class="det-panel"></div><div class="footer"><span>Stats:</span> scanned '+escHtml(stats.total_orders_scanned||0)+' orders · matched '+escHtml(stats.matched_orders||0)+' orders · online skipped '+escHtml(stats.online_orders_skipped||0)+' · unknown source skipped '+escHtml(stats.unknown_source_orders||0)+' · location/tag skipped '+escHtml(stats.location_skipped||0)+' · orders with HitsHudson tag '+escHtml(stats.orders_with_hits_tag||0)+' · tag-only orders '+escHtml(stats.tag_only_orders||0)+' · excluded missing HitsHudson tag '+escHtml(stats.excluded_missing_tag||0)+' · excluded wrong location '+escHtml(stats.excluded_wrong_location||0)+' · excluded obvious non-HITS Concierge/Employee orders without HitsHudson.</div>';}
function togglePanel(){var panel=document.getElementById('detailPanel');var rows=document.querySelectorAll('.ov-table tbody tr');if(activePanel){panel.classList.remove('open');rows.forEach(function(r){r.classList.remove('row-on');});activePanel=false;return;}activePanel=true;rows.forEach(function(r){r.classList.add('row-on');});var productLines=(currentData&&currentData.lines)||[];var orders=(currentData&&currentData.orders)||[];
var orderRows=orders.map(function(o){return '<tr><td><div class="oid">'+escHtml(o.order_id)+'</div><div class="odate">'+fmtDate(o.order_date)+'</div></td><td>'+tagHtml(o)+'</td><td><div class="cname">'+escHtml(o.customer||'N/A')+'</div><div class="odate">'+escHtml(o.customer_email||'')+'</div></td><td><span class="badge '+statusBadgeClass(o.payment_status)+'">'+escHtml(o.payment_status||'Unknown')+'</span></td><td><span class="badge '+statusBadgeClass(o.fulfillment_status)+'">'+escHtml(o.fulfillment_status||'Unknown')+'</span></td><td><span class="badge '+statusBadgeClass(o.order_status)+'">'+escHtml(o.order_status||'Open')+'</span><div class="odate">'+escHtml(o.status_summary||'')+'</div></td><td><span class="badge '+deliveryBadgeClass(o.delivery_method)+'">'+escHtml(o.delivery_method||'IN STORE')+'</span></td><td><div class="src">'+escHtml(o.location||'')+'</div><div class="odate">'+escHtml(o.location_evidence||'')+'</div><div class="odate">'+escHtml(o.source_display||'')+'</div></td><td class="r">'+fmt(o.gross_sales)+'</td><td class="r">'+fmtNeg(o.discounts)+'</td><td class="r">'+fmtNeg(o.returns)+'</td><td class="r">'+fmt(o.net_sales)+'</td><td class="r">'+fmt(o.shipping_charges)+'</td><td class="r">'+fmt(o.taxes)+'</td><td class="r">'+fmt(o.total_sales)+'</td><td class="r">'+escHtml(o.units||0)+'</td></tr>';}).join('');
var lineRows=productLines.map(function(o){var tagWarn=o.product_tag_status&&o.product_tag_status!=='Regular / No dropship tag';var productTags=o.product_tags?'<div class="odate" title="'+escHtml(o.product_tags)+'">'+escHtml(o.product_tags)+'</div>':'<div class="odate">No product tags</div>';var cogsNote=o.cogs_status&&o.cogs_status!=='OK'?'<div class="flags">'+escHtml(o.cogs_status)+'</div>':'';var audit=o.product_tag_audit?'<div class="flags">'+escHtml(o.product_tag_audit)+'</div>':'';return '<tr><td><div class="oid">'+escHtml(o.order_id)+'</div><div class="odate">'+fmtDate(o.order_date)+'</div></td><td>'+tagHtml(o)+'</td><td><div class="cname">'+escHtml(o.customer||'N/A')+'</div><div class="odate">'+escHtml(o.customer_email||'')+'</div></td><td><span class="badge '+statusBadgeClass(o.payment_status)+'">'+escHtml(o.payment_status||'Unknown')+'</span><div class="odate">'+escHtml(o.status_summary||'')+'</div></td><td><div class="pname" title="'+escHtml(o.product)+'">'+escHtml(o.product)+'</div><div class="odate">SKU '+escHtml(o.sku||'—')+' · Qty '+escHtml(o.quantity||0)+'</div></td><td><span class="badge '+(tagWarn?'b-warn':'b-src')+'">'+escHtml(o.product_tag_status||'Regular / No dropship tag')+'</span>'+productTags+audit+'</td><td><span class="badge '+deliveryBadgeClass(o.delivery_method)+'">'+escHtml(o.delivery_method||'IN STORE')+'</span></td><td><div class="src">'+escHtml(o.location||'')+'</div><div class="odate">'+escHtml(o.location_evidence||'')+'</div><div class="odate">'+escHtml(o.source_display||'')+'</div></td><td class="r">'+fmt(o.gross)+'</td><td class="r">'+fmt(o.discount)+'</td><td class="r">'+fmt(o.net)+'</td><td class="r">'+fmt(o.cogs)+cogsNote+'</td><td class="r">'+fmt(o.gross_profit)+'</td><td class="r">'+fmtPct(o.gross_margin)+'</td></tr>';}).join('');
panel.innerHTML='<div class="ph"><div class="ph-rep">HITS Hudson <small>· Order tag HitsHudson</small></div><div class="ph-metrics"><div><div class="pm-val">'+fmt((currentData.summary||{}).net_sales)+'</div><div class="pm-lbl">Net Sales</div></div><div><div class="pm-val">'+escHtml((currentData.summary||{}).total_orders||0)+'</div><div class="pm-lbl">Orders</div></div><div><div class="pm-val">'+fmt((currentData.summary||{}).gross_profit)+'</div><div class="pm-lbl">Gross Profit</div></div></div></div><div class="pb"><div class="slbl">Orders — Shopify Analytics columns plus status</div><table class="ord-table compact"><thead><tr><th>Order ID</th><th>Order Tags</th><th>Customer</th><th>Payment Status</th><th>Fulfillment Status</th><th>Order Status</th><th>Delivery Method</th><th>Location / Source</th><th class="r">Gross Sales</th><th class="r">Discounts</th><th class="r">Returns</th><th class="r">Net Sales</th><th class="r">Shipping</th><th class="r">Taxes</th><th class="r">Total Sales</th><th class="r">Units</th></tr></thead><tbody>'+orderRows+'</tbody></table><div class="slbl">Product lines — all non-shipping products from each qualifying order</div><table class="ord-table"><thead><tr><th>Order #</th><th>Order Tags</th><th>Customer</th><th>Payment / Order Status</th><th>Product</th><th>Product Tags</th><th>Delivery Method</th><th>Location / Source</th><th class="r">Gross</th><th class="r">Discount</th><th class="r">Net</th><th class="r">COGS</th><th class="r">Gross Profit</th><th class="r">Gross Margin</th></tr></thead><tbody>'+lineRows+'</tbody></table></div>';panel.classList.add('open');panel.scrollIntoView({behavior:'smooth',block:'nearest'});}


function refreshCurrent(){
  // Refresh must reload the repository configuration options first. Otherwise the
  // report data may update but the week/month dropdown can keep old goal labels
  // until a full page reload.
  if(currentMode==='project'){
    loadProjectData();
    return;
  }
  reloadGoalFiltersAndLoad(true);
}
function reloadGoalFiltersAndLoad(preserveSelection){
  var btn=document.getElementById('refreshBtn');
  if(btn)btn.disabled=true;
  var prevWeekStart='';
  var prevMonth='';
  var wSel=document.getElementById('weekSelect');
  var mSel=document.getElementById('monthSelect');
  if(preserveSelection&&wSel&&weekOptions[Number(wSel.value||0)])prevWeekStart=weekOptions[Number(wSel.value||0)].startISO;
  if(preserveSelection&&mSel)prevMonth=mSel.value;
  google.script.run.withSuccessHandler(function(months){
    buildMonthOptions(months||[]);
    if(prevMonth){
      var ms=document.getElementById('monthSelect');
      var mFound=[].slice.call(ms.options).some(function(o){return o.value===prevMonth;});
      if(mFound)ms.value=prevMonth;
    }
    google.script.run.withSuccessHandler(function(opts){
      buildWeekOptions(opts||[]);
      if(prevWeekStart){
        var idx=(weekOptions||[]).findIndex(function(o){return o.startISO===prevWeekStart;});
        if(idx>=0){document.getElementById('weekSelect').value=idx;localStorage.setItem('hits_week',String(idx));}
      }
      if(btn)btn.disabled=false;
      if(currentMode==='project')loadProjectData();else loadData();
    }).withFailureHandler(function(err){if(btn)btn.disabled=false;showError('Failed to refresh weekly report data: '+(err.message||err));}).getWeekOptions(26);
  }).withFailureHandler(function(err){if(btn)btn.disabled=false;showError('Failed to refresh monthly report data: '+(err.message||err));}).getMonthOptions();
}
function buildProjectWeekOptions(opts){
  var sel=document.getElementById('projectWeekSelect');
  if(!sel)return;
  sel.innerHTML='';
  var seen={};
  function addOption(startISO,label,endISO){
    if(!startISO||seen[startISO])return;
    seen[startISO]=true;
    var opt=document.createElement('option');
    opt.value=startISO;
    opt.textContent=label||('Project starts: '+startISO);
    opt.setAttribute('data-end',endISO||'');
    sel.appendChild(opt);
  }
  addOption(DEFAULT_PROJECT_START,'Project starts: Jun 1, 2026 · Week 1 fixed start','2026-06-07');
  (opts||[]).forEach(function(o){addOption(o.startISO,'Project starts: '+o.label,o.endISO||'');});
  var saved=localStorage.getItem('hits_project_start');
  if(saved&&seen[saved]){sel.value=saved;}else{sel.value=DEFAULT_PROJECT_START;localStorage.setItem('hits_project_start',DEFAULT_PROJECT_START);}
}
function setupProjectStart(){var sel=document.getElementById('projectWeekSelect');if(sel&&sel.value)localStorage.setItem('hits_project_start',sel.value);}
function saveProjectStart(){setupProjectStart();}
function projectParamsFromUI(){return{};}
function manualKey(w,k){return 'hits_manual_w'+w+'_'+k;}
function hasManual(w,k){return localStorage.getItem(manualKey(w,k))!==null;}
function getManual(w,k,def){var v=localStorage.getItem(manualKey(w,k));return v==null?def:Number(v||0);}
window.setManual=function(w,k,val){localStorage.setItem(manualKey(w,k),String(Number(val||0)));recalcProjectTable();};
function offWeekKey(w){return 'hits_off_week_'+w;}
function isManualOffWeek(w){var week=(typeof w==='object')?w.week:w;return localStorage.getItem(offWeekKey(week))==='1';}
window.setOffWeek=function(w,checked){if(checked){localStorage.setItem(offWeekKey(w),'1');}else{localStorage.removeItem(offWeekKey(w));}if(currentMode==='project'&&currentData){renderProject(currentData);}};
function offWeekControl(w){var checked=isManualOffWeek(w)?' checked':'';return '<label class="off-week-control"><input type="checkbox" data-week="'+escHtml(w.week)+'"'+checked+' onchange="setOffWeek(this.dataset.week,this.checked)"> Off Week</label>'; }
function weekCalcLabel(w){return isCalcWeek(w)?'<span class="included-badge">Included</span>':'<span class="off-week-badge">Off Week</span>'; }
function budgetKey(k){return 'hits_budget_'+k;}
function getBudget(k,def){var v=localStorage.getItem(budgetKey(k));return v==null?Number(def||0):Number(v||0);}
window.setBudget=function(k,val){localStorage.setItem(budgetKey(k),String(Number(val||0)));if(currentMode==='project'&&currentData)renderProject(currentData);};
function loadProjectData(){var btn=document.getElementById('refreshBtn');if(btn)btn.disabled=true;document.getElementById('main').innerHTML='<div class="loading"><div class="spinner"></div>Loading 12-week calculation report...</div>';google.script.run.withSuccessHandler(function(data){if(btn)btn.disabled=false;if(!data||data.error){showError(data?data.error:'Empty response');return;}currentData=data;renderProject(data);}).withFailureHandler(function(err){if(btn)btn.disabled=false;showError(err.message||String(err));}).getHitsProjectData(projectParamsFromUI());}
function fmt0(n){n=Number(n||0);return '$'+Math.round(n).toLocaleString();}
function fmtPlain(n){return Math.round(Number(n||0)).toLocaleString();}
function assumptionInput(label,key,val,suffix,note){suffix=suffix||'';note=note||'Editable budget assumption';return '<tr class="editable-assumption"><td>'+escHtml(label)+'<div class="odate">'+escHtml(note)+'</div></td><td><input class="assumption-input" type="number" step="0.01" value="'+Number(val||0)+'" data-key="'+escHtml(key)+'" onchange="setBudget(this.dataset.key,this.value)" onfocus="this.select()">'+escHtml(suffix)+'</td></tr>';}
function assumptionRow(label,val,cls,note){return '<tr class="'+(cls||'')+'"><td>'+escHtml(label)+(note?'<div class="odate">'+escHtml(note)+'</div>':'')+'</td><td>'+val+'</td></tr>';}
function sectionRow(label){return '<tr class="section-row"><td colspan="2">'+escHtml(label)+'</td></tr>';}
function buildBudgetModel(a){
  a=a||{};
  var m={};
  m.weeks=Number(a.weeks||12);
  m.calculationWeeks=Number(a.calculation_weeks||12);
  m.calculationStartWeek=Number(a.calculation_start_week||1);
  m.trailer=getBudget('trailer',a.trailer_cost||40000);
  m.setup=getBudget('setup_furniture',a.setup_furniture_cost||800);
  m.otherCapex=getBudget('other_capex_costs',a.capex_other_costs||1321.62);
  m.capex=m.trailer+m.setup+m.otherCapex;
  m.fallbackGrossSales=Number(a.weekly_gross_sales_budget||8000);
  m.marketing=getBudget('marketing_income',a.weekly_marketing_income_budget||1000);
  m.discountRate=getBudget('discounts_returns_pct',((a.discounts_returns_rate||0.15)*100))/100;
  m.grossMargin=getBudget('gross_margin_pct',((a.gross_margin_target||0.60)*100))/100;
  m.payroll=getBudget('payroll_weekly_cost',a.payroll_weekly_cost||a.nicole_weekly_cost||660);
  m.hotel=getBudget('hotel_weekly',a.hotel_weekly||1400);
  m.marketingActivationsTotal=getBudget('marketing_activations_total',a.marketing_activations_total||a.marketing_activations||638.33);
  m.othersTotal=getBudget('others_total',a.others_total||a.others||272);
  m.weeklyOpex=m.payroll+m.hotel;
  m.oneTimeOpex=m.marketingActivationsTotal+m.othersTotal;
  m.totalProjectOpex=m.weeklyOpex+m.oneTimeOpex;
  m.goalsSource=a.goals_source||'Repository report-data.json';
  var weeks=(currentData&&currentData.weeks)||[];
  var firstCalcWeek=calcWeeks(weeks)[0]||weeks[0]||null;
  var firstGoal=firstCalcWeek?Number(firstCalcWeek.goal||m.fallbackGrossSales):m.fallbackGrossSales;
  var firstBudget=budgetFromGoal(firstGoal,m);
  m.sales=firstGoal+m.marketing;
  m.netSales=firstBudget.net_sales;
  m.grossProfit=firstBudget.gross_profit;
  m.weeklyContribution=firstBudget.weekly_contribution;
  m.firstWeekContribution=firstBudget.weekly_contribution-m.oneTimeOpex;
  var remainingAfterFirst=m.capex-m.firstWeekContribution;
  m.paybackWeeks=m.weeklyContribution>0?(1+Math.max(0,remainingAfterFirst)/m.weeklyContribution):0;
  return m;
}
function budgetFromGoal(goal,m){
  goal=Number(goal||m.fallbackGrossSales||0);
  var net=goal*(1-m.discountRate);
  var gp=net*m.grossMargin;
  var contribution=gp+m.marketing-m.weeklyOpex;
  return{gross_sales:goal,marketing_income:m.marketing,discounts_returns_rate:m.discountRate,net_sales:net,gross_margin:m.grossMargin,gross_profit:gp,weekly_opex:m.weeklyOpex,opex:m.weeklyOpex,one_time_opex:m.oneTimeOpex,weekly_contribution:contribution};
}
function budgetForWeek(w,m){return budgetFromGoal((w&&w.goal)!=null?w.goal:m.fallbackGrossSales,m);}
function isCalcWeek(w){return !(w&&w.include_in_calculation===false) && !isManualOffWeek(w);}
function calcWeeks(weeks){return (weeks||[]).filter(isCalcWeek);}
function totalGoalSales(weeks,m){return calcWeeks(weeks).reduce(function(sum,w){return sum+Number((w&&w.goal)!=null?w.goal:m.fallbackGrossSales||0);},0);}
function renderProject(data){
  document.getElementById('periodLabel').textContent=data.period_label||'';
  var weeks=data.weeks||[];
  var m=buildBudgetModel(data.assumptions||{});
  currentBudgetModel=m;
  var capexRows=''
    +sectionRow('CAPEX')
    +assumptionInput('Trailer','trailer',m.trailer)
    +assumptionInput('Set-Up Furniture','setup_furniture',m.setup)
    +assumptionInput('Other CAPEX Costs','other_capex_costs',m.otherCapex,'','Manual amount from the prior model; detailed source is pending confirmation.')
    +assumptionRow('CAPEX',fmt0(m.capex),'total-row computed-assumption')
    +sectionRow('SALES')
    +assumptionRow('Weekly Gross Sales Goal','Repository data','sheet-goal','Agreed weekly target. Configured at $8,000 in report data.')
    +assumptionRow('Goals Source',escHtml(m.goalsSource),'sheet-goal')
    +assumptionInput('Marketing Income Budget','marketing_income',m.marketing)
    +assumptionInput('Discounts & Returns %','discounts_returns_pct',m.discountRate*100,'%')
    +assumptionInput('Gross Margin %','gross_margin_pct',m.grossMargin*100,'%')
    +assumptionRow('First Calculation Week Goal',fmt0(((calcWeeks(weeks)[0]||weeks[0])&&((calcWeeks(weeks)[0]||weeks[0]).goal))||m.fallbackGrossSales),'computed-assumption','From repository report data. 12 formal show weeks are included; Use the Off Week checkbox to exclude non-show weeks.')
    +sectionRow('WEEKLY OPEX')
    +assumptionInput('Payroll / Personnel Weekly Cost','payroll_weekly_cost',m.payroll,'','Weekly recurring cost. Editable for one or more people.')
    +assumptionInput('Hotel Weekly Cost','hotel_weekly',m.hotel,'','Weekly recurring hotel cost.')
    +assumptionRow('Total Weekly OPEX',fmt0(m.weeklyOpex),'total-row computed-assumption','Repeated once for every included show week.')
    +sectionRow('ONE-TIME OPEX')
    +assumptionInput('Marketing / Activations Total Cost','marketing_activations_total',m.marketingActivationsTotal,'','One-time total: Activations $100 + Wines $305 + VistaPrint $138.22 + Price Chopper $53.88 + $41.23.')
    +assumptionInput('Others Total Cost','others_total',m.othersTotal,'','One-time total: Cleaners $125 + $125 + Storage Box $22.')
    +assumptionRow('Total One-Time OPEX',fmt0(m.oneTimeOpex),'total-row computed-assumption','Deducted only once in the first included calculation week.')
    +sectionRow('PROFIT - Calculation Week Reference')
    +assumptionRow('Net Sales',fmt0(m.netSales),'computed-assumption')
    +assumptionRow('Gross Profit',fmt0(m.grossProfit),'computed-assumption','Net Sales × Gross Margin. OPEX does not change Gross Profit.')
    +assumptionRow('Weekly Recurring OPEX',fmt0(m.weeklyOpex),'computed-assumption')
    +assumptionRow('Recurring Weekly Contribution',fmt0(m.weeklyContribution),'total-row computed-assumption','Gross Profit + Marketing Income − Weekly OPEX.')
    +assumptionRow('Cumulative Profit After OPEX','<span id="liveCumulativeProfit">$0</span>','total-row computed-assumption','Actual Gross Profit accumulated since HITS started − weekly recurring OPEX for elapsed included weeks − one-time OPEX once.')
    +sectionRow('')
    +assumptionRow('Estimated Payback Using Budget',m.paybackWeeks?m.paybackWeeks.toFixed(1)+' weeks':'Not reached','total-row computed-assumption');
  var cumulativeBudget=-m.capex;
  var oneTimeBudgetApplied=false;
  var cumRows=weeks.map(function(w){var b=budgetForWeek(w,m);var oneTimeThisWeek=0;if(isCalcWeek(w)){if(!oneTimeBudgetApplied){oneTimeThisWeek=m.oneTimeOpex;oneTimeBudgetApplied=true;}cumulativeBudget+=b.weekly_contribution-oneTimeThisWeek;}var note=isCalcWeek(w)?('Included'+(oneTimeThisWeek?' · includes one-time OPEX '+fmt0(oneTimeThisWeek):'')):'Off Week excluded';return '<tr><td>'+w.week+'<div class="odate">'+note+'</div>'+offWeekControl(w)+'</td><td>'+fmt0(b.gross_sales)+'</td><td class="'+(cumulativeBudget>=0?'good':'bad')+'">'+fmt0(cumulativeBudget)+'</td></tr>';}).join('');
  var totals={gross:0, net:0, gp:0, orders:0, actualWeeks:0};
  weeks.forEach(function(w){if(!isCalcWeek(w))return;var act=w.actual||{};var hasActual=!!(act.gross_sales||act.net_sales||act.total_orders);if(hasActual){totals.actualWeeks++;totals.gross+=Number(act.gross_sales||0);totals.net+=Number(act.net_sales||0);totals.gp+=Number(act.gross_profit||0);totals.orders+=Number(act.total_orders||0);}});
  var goalTotal=totalGoalSales(weeks,m);
  var summary='<div class="summary-grid">'
    +'<div class="summary-card budget"><div class="summary-lbl">12-week calculation goal sales</div><div class="summary-val">'+fmt0(goalTotal)+'</div><div class="summary-desc">Loaded from repository report-data.json. Only the 12 formal show weeks are included in final calculations.</div></div>'
    +'<div class="summary-card actual"><div class="summary-lbl">Shopify actual gross sales</div><div class="summary-val">'+fmt0(totals.gross)+'</div><div class="summary-desc">Real Shopify HITS sales for the 12 formal show weeks, excluding obvious Concierge/Employee false positives.</div></div>'
    +'<div class="summary-card actual"><div class="summary-lbl">Shopify actual net sales</div><div class="summary-val">'+fmt0(totals.net)+'</div><div class="summary-desc">Gross minus discounts/returns.</div></div>'
    +'<div class="summary-card actual"><div class="summary-lbl">Shopify orders</div><div class="summary-val">'+totals.orders+'</div><div class="summary-desc">Matched HITS orders for the 12 formal show weeks.</div></div>'
    +'<div class="summary-card actual"><div class="summary-lbl">Cumulative Profit After OPEX</div><div class="summary-val" id="topCumulativeProfit">$0</div><div class="summary-desc">Actual GP to date minus weekly recurring OPEX for elapsed included weeks and one-time OPEX once.</div></div>'
    
    +'</div>';
  var perfRows=weeks.map(function(w){
    var act=w.actual||{};var b=budgetForWeek(w,m);
    var weekStart=new Date(String(w.startISO)+'T00:00:00');
    var today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());
    var hasStarted=weekStart<=today;
    var goal=Number(b.gross_sales||0), actualGross=Number(act.gross_sales||0), variance=actualGross-goal;
    var calc=isCalcWeek(w);
    var ach=achievementInfo(actualGross,goal,hasStarted);
    var status=calc?(hasStarted?ach.label:'Planned'):'Off Week excluded';
    var statusCls=calc?(hasStarted?ach.cls:'planned'):'planned';
    return '<tr class="'+(calc?'':'tracking-only-row')+'"><td><b>Week '+w.week+'</b><div class="odate">'+escHtml(w.startISO)+' – '+escHtml(w.endISO)+'</div>'+weekCalcLabel(w)+offWeekControl(w)+'</td>'
      +'<td>'+fmt0(b.gross_sales)+'</td><td class="'+(actualGross===0?'actual-zero':'')+'">'+fmt0(actualGross)+'</td>'
      +'<td class="achievement-'+statusCls+'">'+(calc?(hasStarted?ach.pct.toFixed(1)+'%':'Planned'):'Excluded')+'</td>'
      +'<td>'+fmt0(b.net_sales)+'</td><td class="'+(Number(act.net_sales||0)===0?'actual-zero':'')+'">'+fmt0(act.net_sales)+'</td>'
      +'<td>'+fmt0(b.gross_profit)+'</td><td class="'+(Number(act.gross_profit||0)===0?'actual-zero':'')+'">'+fmt0(act.gross_profit)+'</td>'
      +'<td class="'+(variance<0?'miss':'met')+'">'+(variance>=0?'+':'')+fmt0(variance)+'</td></tr>';
  }).join('');
  var performance='<div class="perf-card"><div class="perf-title"><b>Weekly Performance — Goal vs Shopify Actual</b><span>Gross Sales / Net Sales / Gross Profit by week. Goals come from repository data; actuals come from Shopify.</span></div><div class="perf-wrap"><table class="perf-table"><thead><tr><th>Week</th><th>Gross Sales Goal</th><th>Actual Gross Sales</th><th>% Achievement</th><th>Net Sales Goal</th><th>Actual Net Sales</th><th>Gross Profit Goal</th><th>Actual Gross Profit</th><th>Gap / Over Goal</th></tr></thead><tbody>'+perfRows+'</tbody></table></div></div>';
  var model='<div class="model-grid"><div class="model-card"><div class="model-title">CAPEX & Budget Assumptions<div class="model-subtitle">Weekly gross sales goals come from repository report data. Gross Profit is calculated from Net Sales × Gross Margin; weekly and one-time OPEX are treated separately.</div></div><table class="mini-table"><tbody>'+capexRows+'</tbody></table><div class="formula-note">Shopify supplies the real actuals: gross sales, discounts, returns, net sales, gross profit, gross margin and orders. Weekly goals are loaded from repository report data. Actual Gross Sales, Net Sales and Gross Profit come from Shopify. The report preserves the original HITS rule (Corro Trailer 1 warehouse/location OR HitsHudson) and excludes Concierge/Employee orders without HitsHudson. Order tags are shown for audit.</div></div><div class="model-card"><div class="model-title">12-Week Budget Cumulative Cash<div class="model-subtitle">Calculates the 12 formal show weeks only. Use the Off Week checkbox to exclude non-show weeks.</div></div><table class="mini-table"><thead><tr><th>Week</th><th>Weekly Goal</th><th>Cumulative Cash</th></tr></thead><tbody>'+cumRows+'</tbody></table></div></div>';
  var explainer='';
  var head='<div class="tracking-title"><div class="slbl">12-week calculation — goal vs Shopify actual</div><div class="tracking-note">Weekly goals are loaded from repository report data. Use the Off Week checkbox to exclude non-show weeks from goals, payback and catch-up. Use the Off Week checkbox to exclude non-show weeks. Real actuals come from Shopify.</div></div><div class="tblwrap project-scroll"><table class="pay-table"><thead><tr class="group-head"><th rowspan="2">Week</th><th colspan="7">Budget / Goal</th><th colspan="11">Weekly Actuals, Goal Check & Catch-up</th><th colspan="3">Payback</th></tr><tr class="sub-head"><th class="budget-col">Gross Sales Goal</th><th class="budget-col">Marketing Budget</th><th class="budget-col">Disc/Returns Top</th><th class="budget-col">Net Sales Budget</th><th class="budget-col">GM Target</th><th class="budget-col">Weekly OPEX Budget</th><th class="budget-col">Weekly Contribution Budget</th><th class="actual-col gap-left">Shopify Gross Sales Actual</th><th class="actual-col">% Achievement</th><th class="actual-col">Sales Gap / Over Goal</th><th class="calc-col">Next Week Sales Target</th><th class="manual-col">Manual: Marketing Actual</th><th class="actual-col">Discounts</th><th class="actual-col">Returns</th><th class="actual-col">Net Sales</th><th class="actual-col">Gross Margin</th><th class="actual-col">Gross Profit</th><th class="manual-col">Manual: Weekly OPEX Actual</th><th class="calc-col gap-left">Weekly Contribution</th><th class="calc-col">Budget Cum. Cash</th><th class="calc-col">Actual/Forecast Cum. Cash</th><th class="actual-col">Orders</th></tr></thead><tbody>';
  var budgetCum=-m.capex;
  var oneTimeBudgetTableApplied=false;
  var today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  var body=weeks.map(function(w){
    var act=w.actual||{};var b=budgetForWeek(w,m);var oneTimeBudgetThisWeek=0;if(isCalcWeek(w)){if(!oneTimeBudgetTableApplied){oneTimeBudgetThisWeek=m.oneTimeOpex;oneTimeBudgetTableApplied=true;}budgetCum+=b.weekly_contribution-oneTimeBudgetThisWeek;}
    var manualMarketingDefault=0;
    var manualOpexDefault=b.weekly_opex||b.opex||0;
    var marketing=getManual(w.week,'marketing',manualMarketingDefault);
    var opex=getManual(w.week,'opex',manualOpexDefault);
    var hasActual=!!(act.gross_sales||act.net_sales||act.total_orders);
    var weekStart=new Date(String(w.startISO)+'T00:00:00');
    var hasStarted=weekStart<=today;
    return '<tr data-week="'+w.week+'" data-started="'+(hasStarted?'1':'0')+'" data-calc="'+(isCalcWeek(w)?'1':'0')+'"><td class="left week-cell"><b>Week '+w.week+'</b><div class="odate">'+escHtml(w.startISO)+' – '+escHtml(w.endISO)+'</div>'+weekCalcLabel(w)+offWeekControl(w)+'</td>'
      +'<td class="budget-col sheet-goal-cell">'+fmt0(b.gross_sales)+'</td>'
      +'<td class="budget-col">'+fmt0(b.marketing_income)+'</td>'
      +'<td class="budget-col">'+fmtPct(b.discounts_returns_rate)+'</td>'
      +'<td class="budget-col">'+fmt0(b.net_sales)+'</td>'
      +'<td class="budget-col">'+fmtPct(b.gross_margin)+'</td>'
      +'<td class="budget-col">'+fmt0(b.opex)+'</td>'
      +'<td class="budget-col">'+fmt0(b.weekly_contribution)+'</td>'
      +'<td class="actual-col gap-left '+(hasActual?'':'muted-cell')+'">'+fmt0(act.gross_sales)+'</td>'
      +'<td class="actual-col achievement-cell"></td>'
      +'<td class="actual-col sales-variance"></td>'
      
      +'<td class="calc-col catchup-target"></td>'
      +'<td class="manual-col"><input type="number" value="'+marketing+'" data-week="'+w.week+'" data-type="marketing" onchange="setManual(this.dataset.week,this.dataset.type,this.value)" onfocus="this.select()"></td>'
      +'<td class="actual-col '+(hasActual?'':'muted-cell')+'">'+fmt0(act.discounts)+'</td>'
      +'<td class="actual-col '+(hasActual?'':'muted-cell')+'">'+fmt0(act.returns)+'</td>'
      +'<td class="actual-col '+(hasActual?'':'muted-cell')+'">'+fmt0(act.net_sales)+'</td>'
      +'<td class="actual-col '+(hasActual?'':'muted-cell')+'">'+fmtPct(act.gross_margin)+'</td>'
      +'<td class="actual-col '+(hasActual?'':'muted-cell')+'">'+fmt0(act.gross_profit)+'</td>'
      +'<td class="manual-col"><input type="number" value="'+opex+'" data-week="'+w.week+'" data-type="opex" onchange="setManual(this.dataset.week,this.dataset.type,this.value)" onfocus="this.select()"></td>'
      +'<td class="calc-col weekly-contribution gap-left"></td>'
      +'<td class="calc-col '+(budgetCum>=0?'good':'bad')+'">'+fmt0(budgetCum)+'</td>'
      +'<td class="calc-col actual-cum"></td>'
      +'<td class="actual-col">'+(act.total_orders||0)+'</td></tr>';
  }).join('');
  document.getElementById('main').innerHTML=summary+explainer+performance+model+head+body+'</tbody></table></div><div id="projectSummary" class="footer"></div>';
  recalcProjectTable();
}
function recalcProjectTable(){
  if(!currentData||!currentData.weeks)return;
  var m=currentBudgetModel||buildBudgetModel(currentData.assumptions||{});
  var weeks=currentData.weeks||[];
  var cum=-m.capex;
  var payback='Not reached';
  var totalRevenue=0;
  var actualWeeks=0;
  var manualWeeks=0;
  var missedWeeks=0;
  var metWeeks=0;
  var cumulativeSalesShortfall=0;
  var firstCalc=calcWeeks(weeks)[0]||weeks[0];
  var nextCatchupTarget=firstCalc?budgetForWeek(firstCalc,m).gross_sales:m.fallbackGrossSales;
  var today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  var oneTimeActualForecastApplied=false;
  var cumulativeActualGrossProfit=0;
  var cumulativeActualOpex=0;
  var elapsedIncludedWeeks=0;
  document.querySelectorAll('.pay-table tbody tr').forEach(function(row,i){
    var w=weeks[i];if(!w)return;
    var b=budgetForWeek(w,m);
    var calc=isCalcWeek(w);
    var nextCalcWeek=weeks.slice(i+1).filter(isCalcWeek)[0]||w;
    var nextB=budgetForWeek(nextCalcWeek,m);
    var act=(w&&w.actual)||{};
    var marketing=getManual(w.week,'marketing',0);
    var opex=getManual(w.week,'opex',b.weekly_opex||b.opex);
    var hasShopifyActual=!!(act.gross_sales||act.net_sales||act.total_orders||act.discounts||act.returns||act.gross_profit);
    var hasManualActual=hasManual(w.week,'marketing')||hasManual(w.week,'opex');
    var weekStart=new Date(String(w.startISO)+'T00:00:00');
    var hasStarted=(row.getAttribute('data-started')==='1') || weekStart<=today;
    var useActualLine=hasStarted||hasShopifyActual||hasManualActual;
    if(hasShopifyActual)actualWeeks++;
    if(hasManualActual)manualWeeks++;
    if(calc&&hasStarted){
      elapsedIncludedWeeks++;
      cumulativeActualGrossProfit+=Number(act.gross_profit||0);
      cumulativeActualOpex+=opex;
    }

    var actualGross=Number(act.gross_sales||0);
    var goal=Number(b.gross_sales||0);
    var variance=actualGross-goal;
    var ach=achievementInfo(actualGross,goal,hasStarted||hasShopifyActual);
    var status=calc?'Planned':'Off Week excluded';
    var statusClass=calc?'status-planned':'status-planned';
    row.classList.remove('goal-met','goal-missed');
    if(calc && (hasStarted||hasShopifyActual)){
      status=ach.label;
      statusClass='status-'+ach.cls;
      if(ach.cls==='met'){metWeeks++;row.classList.add('goal-met');}
      else{missedWeeks++;row.classList.add('goal-missed');}
      cumulativeSalesShortfall=Math.max(0,cumulativeSalesShortfall+(goal-actualGross));
      nextCatchupTarget=nextB.gross_sales+cumulativeSalesShortfall;
    } else if(calc) {
      nextCatchupTarget=goal+cumulativeSalesShortfall;
    }

    var oneTimeThisWeek=0;
    if(calc&&!oneTimeActualForecastApplied){oneTimeThisWeek=m.oneTimeOpex;oneTimeActualForecastApplied=true;}
    var contribution=(useActualLine?((Number(act.gross_profit||0))+marketing-opex):(b.weekly_contribution||0))-oneTimeThisWeek;
    if(calc){
      totalRevenue+=useActualLine?(actualGross+marketing):(b.gross_sales+b.marketing_income);
      cum+=contribution;
    }

    var achCell=row.querySelector('.achievement-cell');
    var varCell=row.querySelector('.sales-variance');
    var statusCell=row.querySelector('.goal-status');
    var catchupCell=row.querySelector('.catchup-target');
    var wc=row.querySelector('.weekly-contribution');
    var ac=row.querySelector('.actual-cum');
    if(achCell){
      achCell.innerHTML=calc?((hasStarted||hasShopifyActual)?ach.pct.toFixed(1)+'%':'Planned'):'Excluded';
      achCell.className='actual-col achievement-cell achievement-'+(calc?(hasStarted||hasShopifyActual?ach.cls:'planned'):'planned');
    }
    if(varCell){
      varCell.innerHTML=(variance>=0?'+':'')+fmt0(variance);
      varCell.className='actual-col sales-variance '+(variance>=0?'variance-pos':'variance-neg');
    }
    if(statusCell){statusCell.innerHTML='<span class="badge-status '+statusClass+'">'+status+'</span>';}
    if(catchupCell){
      catchupCell.innerHTML=calc?fmt0(nextCatchupTarget):'Excluded';
      catchupCell.className='calc-col catchup-target '+((hasStarted&&cumulativeSalesShortfall>0)?'catchup-cell':'');
    }
    if(wc){wc.innerHTML=fmt0(contribution);wc.className='calc-col weekly-contribution gap-left '+(contribution>=0?'good':'bad');}
    if(ac){ac.innerHTML=fmt0(cum);ac.className='calc-col actual-cum '+(cum>=0?'good':'bad');}
    if(calc&&cum>=0&&payback==='Not reached')payback='Week '+w.week;
  });
  var cumulativeProfitAfterOpex=cumulativeActualGrossProfit-cumulativeActualOpex-(elapsedIncludedWeeks>0?m.oneTimeOpex:0);
  var cumulativeProfitEl=document.getElementById('liveCumulativeProfit');
  if(cumulativeProfitEl){cumulativeProfitEl.textContent=fmt0(cumulativeProfitAfterOpex);cumulativeProfitEl.className=cumulativeProfitAfterOpex>=0?'good':'bad';}
  var topCumulativeProfit=document.getElementById('topCumulativeProfit');
  if(topCumulativeProfit){topCumulativeProfit.textContent=fmt0(cumulativeProfitAfterOpex);topCumulativeProfit.className='summary-val '+(cumulativeProfitAfterOpex>=0?'good':'bad');}
  var s=currentData.stats||{};
  var live=document.getElementById('livePayback');
  if(live)live.textContent=payback;
  var catchup=document.getElementById('liveCatchup');
  if(catchup)catchup.textContent=fmt0(nextCatchupTarget);
  var summary=document.getElementById('projectSummary');
  if(summary){
    summary.innerHTML='<span>Cumulative profit after OPEX:</span> '+fmt0(cumulativeProfitAfterOpex)+' · <span>Elapsed included weeks:</span> '+elapsedIncludedWeeks+' · <span>Actual GP accumulated:</span> '+fmt0(cumulativeActualGrossProfit)+' · <span>Actual/forecast payback:</span> '+payback+' · <span>Budget payback:</span> recalculated with weekly recurring OPEX and one-time OPEX deducted once · <span>Goals source:</span> '+escHtml((currentData.assumptions||{}).goals_source||'Repository report-data.json')+' · <span>Next week catch-up sales target:</span> '+fmt0(nextCatchupTarget)+' · <span>Calculation weeks with Shopify actuals:</span> '+actualWeeks+'/'+calcWeeks(weeks).length+' · <span>12-week actual/forecast revenue:</span> '+fmt0(totalRevenue)+' · <span>Matched orders:</span> '+escHtml(s.matched_orders||0)+' · <span>Shopify inclusion:</span> Corro Trailer 1 warehouse/location OR HitsHudson, excluding Concierge/Employee orders without HitsHudson. · <span>Orders missing HitsHudson tag:</span> '+escHtml(s.orders_missing_hits_tag||0)+'.';
  }
}
function applyModeUI(){
  currentMode=localStorage.getItem('hits_mode')||currentMode||'week';
  document.getElementById('tabWeek').classList.toggle('active',currentMode==='week');
  document.getElementById('tabMonth').classList.toggle('active',currentMode==='month');
  document.getElementById('tabCumulative').classList.toggle('active',currentMode==='cumulative');
  document.getElementById('tabProject').classList.toggle('active',currentMode==='project');
  document.getElementById('weekCtrl').style.display=currentMode==='week'?'':'none';
  document.getElementById('monthCtrl').style.display=currentMode==='month'?'':'none';
  document.getElementById('projectCtrl').style.display=currentMode==='project'?'':'none';
}
function init(){
  applyModeUI();
  reloadGoalFiltersAndLoad(false);
}
init();
