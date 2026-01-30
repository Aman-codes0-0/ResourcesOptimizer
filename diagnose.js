try { require('express'); console.log('express ok'); } catch (e) { console.log('express fail'); }
try { require('cors'); console.log('cors ok'); } catch (e) { console.log('cors fail'); }
try { require('uuid'); console.log('uuid ok'); } catch (e) { console.log('uuid fail'); }
try { require('ws'); console.log('ws ok'); } catch (e) { console.log('ws fail'); }
try { require('cron'); console.log('cron ok'); } catch (e) { console.log('cron fail'); }
try { require('./database'); console.log('database ok'); } catch (e) { console.log('database fail', e.message); }
try { require('./rule-engine'); console.log('rule-engine ok'); } catch (e) { console.log('rule-engine fail', e.message); }
try { require('./allocation-optimizer'); console.log('optimizer ok'); } catch (e) { console.log('optimizer fail', e.message); }
try { require('./auth'); console.log('auth ok'); } catch (e) { console.log('auth fail', e.message); }
try { require('./middleware/auth-middleware'); console.log('middleware ok'); } catch (e) { console.log('middleware fail', e.message); }
try { require('./services/notification-service'); console.log('notification ok'); } catch (e) { console.log('notification fail', e.message); }
try { require('./services/alert-engine'); console.log('alert ok'); } catch (e) { console.log('alert fail', e.message); }
try { require('./ai/recommendation-engine'); console.log('ai ok'); } catch (e) { console.log('ai fail', e.message); }
try { require('./services/export-service'); console.log('export ok'); } catch (e) { console.log('export fail', e.message); }
try { require('./services/workflow-engine'); console.log('workflow ok'); } catch (e) { console.log('workflow fail', e.message); }
try { require('./services/cost-analyzer'); console.log('cost ok'); } catch (e) { console.log('cost fail', e.message); }
try { require('./integrations/integration-hub'); console.log('integration ok'); } catch (e) { console.log('integration fail', e.message); }
