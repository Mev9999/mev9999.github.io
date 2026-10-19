import { ORDER_CONSENT_VERSION, orderConsent } from '../frontend/order-consent.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const portalSource=await readFile(new URL('../frontend/portal.js',import.meta.url),'utf8');
const translationSource=await readFile(new URL('../frontend/translations.js',import.meta.url),'utf8');
const css=await readFile(new URL('../frontend/portal.css',import.meta.url),'utf8');
const homepageCss=await readFile(new URL('../../../scripts/homepage.css',import.meta.url),'utf8');
const images=[{id:'a',title:'IMG_20',previewUrl:'/a',width:1200,height:800},{id:'b',title:'IMG_2',previewUrl:'/b',width:800,height:1200},{id:'c',title:'IMG_10',previewUrl:'/c',width:800,height:1000}];
const gallery={id:'g',name:'Familie',date:'2026-10-08',coverUrl:'/a',published:true,pricingMode:'images',theme:'warm',gridLayout:'masonry',coverLayout:'split',coverHeight:'large',gridDensity:'compact',gridGap:24,showFilenames:true};
const members=[{id:'u1',name:'Anna',email:'anna@example.test'},{id:'u2',name:'Emir',email:'emir@example.test'}];
const detailFixture=()=>({gallery:{...gallery},images:structuredClone(images),members:structuredClone(members),packages:[],packageOrderReady:true,finalDeliveryReady:true,favorites:['c'],invoices:[],customerFavorites:{customers:[{...members[0],imageIds:['a','b'],count:2},{...members[1],imageIds:['b'],count:1}],images:[{imageId:'a',count:1,customers:[members[0]]},{imageId:'b',count:2,customers:members}],count:3}});

function harness({lang='de',url='https://portal.test/galerie/',user={id:'admin',name:'Admin',role:'admin'},storedGalleryView,storageUnavailable=false}={}){
  const dom=new JSDOM(`<html lang="${lang}"><body><main id="main-content" class="portal-content"><div id="portal-app"></div></main><div id="portal-toast" hidden></div></body></html>`,{url,runScripts:'outside-only'}),window=dom.window,requests=[];
  let detail=detailFixture(),orders=[],completeResult={galleryId:'g'},confirmResult=true,orderHandler=null,pendingDeletions=[],galleryAvailable=true,requestHandler=null,testOrderDeletionReady=true;
  if(storedGalleryView!==undefined)window.localStorage.setItem('liza.portal.galleryView',storedGalleryView);
  if(storageUnavailable)Object.defineProperty(window,'localStorage',{get(){throw new window.DOMException('Storage blocked','SecurityError');}});
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  window.confirm=()=>confirmResult;
  window.fetch=async(path,options={})=>{
    const body=options.body instanceof window.FormData?options.body:options.body?JSON.parse(options.body):undefined;
    requests.push({path,method:options.method||'GET',body});
    if(requestHandler){const response=await requestHandler(path,options,body);if(response)return response;}
    let data;
    if(path==='/api/session')data={user,csrf:'csrf',capabilities:{email:true,transferConfigured:true}};
    else if(path==='/api/admin/galleries'||path==='/api/galleries')data={galleries:galleryAvailable?[{...detail.gallery,imageCount:detail.images.length}]:[],...(path==='/api/admin/galleries'?{pendingDeletions}:{})};
    else if(/^\/api\/admin\/galleries\/[\w-]+$/.test(path)&&options.method==='DELETE'){const id=path.split('/').at(-1);if(id===detail.gallery.id)galleryAvailable=false;pendingDeletions=pendingDeletions.filter(gallery=>gallery.id!==id);data={ok:true,cleanupPending:false};}
    else if(path==='/api/admin/settings')data={settings:{watermark:{enabled:true,text:'LiZa',size:36,opacity:.35,position:'diagonal'},emails:{}}};
    else if(path==='/api/admin/images')data={images:detail.images.map((image,index)=>({...image,galleryId:'g',galleryName:'Familie',date:'2026-10-08',favoriteCount:index===1?2:0}))};
    else if(path==='/api/admin/activity')data={activities:[{id:'activity1',kind:'download',customerName:'Anna',galleryId:'g',galleryName:'Familie',imageTitle:'IMG_2',createdAt:'2026-10-09T10:30:00Z',read:false}],unreadCount:1,readThrough:1791541800000};
    else if(path==='/api/orders'&&options.method==='POST'){
      if(orderHandler)return orderHandler(body);
      const order={id:'test-order',reference:'LZ-TEST',galleryId:body.galleryId,packageId:body.packageId,packageName:'Testbestellung',amountCents:body.expectedAmountCents,currency:'EUR',status:'pending',paymentMethod:body.paymentMethod,createdAt:'2026-10-11T12:00:00Z',imageIds:body.all?detail.images.map(image=>image.id):body.imageIds};
      orders=[order];data={order,paymentUrl:null};
    }
    else if(path==='/api/orders'||path==='/api/admin/orders')data={orders:orders.map(order=>({...order,...(path==='/api/admin/orders'?{canDeleteTest:order.paymentMethod==='transfer'&&testOrderDeletionReady,...(Object.hasOwn(order,'canDeleteTest')?{canDeleteTest:order.canDeleteTest}:{})}:{})})),...(path==='/api/admin/orders'?{testOrderDeletionReady}:{})};
    else if(/^\/api\/admin\/orders\/[^/]+$/.test(path)&&options.method==='DELETE'){orders=orders.filter(order=>order.id!==path.split('/').at(-1));data={ok:true,deleted:true};}
    else if(path==='/api/auth/complete')data=completeResult;
    else if(path==='/api/galleries/g?customerView=1')data={gallery:detail.gallery,images:detail.images,packages:detail.packages,favorites:[]};
    else if(path==='/api/galleries/g'||path==='/api/galleries/valid-target')data=detail;
    else if(/^\/api\/admin\/galleries\/g\/images\/[^/]+\/final$/.test(path)&&options.method==='POST'){const image=detail.images.find(i=>path.split('/')[6]===i.id);if(image)image.finalReady=true;data={image};}
    else if(/^\/api\/images\/[abc]\?kind=original$/.test(path))return{ok:true,status:200,blob:async()=>new window.Blob(['original'],{type:'image/jpeg'})};
    else if(/^\/api\/admin\/galleries\/g\/images\/[abc](?:\/previews)?$/.test(path)){
      const image=detail.images.find(i=>path.split('/')[6]===i.id);
      if(path.endsWith('/previews')){image.protectedPreviewReady=Boolean(body.get('protectedPreview'));data={image};}
      else{Object.assign(image,body);image.watermarkEnabled=image.watermarkOverride==='on'||(image.watermarkOverride!=='off'&&Boolean(detail.previewSettings?.enabled));data={image};}
    }
    else if(path==='/api/admin/galleries/g/images/finalize'&&options.method==='POST'){detail.images.filter(image=>body.imageIds.includes(image.id)).forEach(image=>image.finalReady=true);data={images:detail.images.filter(image=>body.imageIds.includes(image.id)),notification:{status:'sent'}};}
    else if(path==='/api/admin/galleries/g/packages/order'&&options.method==='PUT'){detail.packages=body.packageIds.map(id=>detail.packages.find(pkg=>pkg.id===id));data={packages:detail.packages};}
    else if(path==='/api/admin/galleries/g/images/order'){detail.images=body.imageIds.map(id=>detail.images.find(image=>image.id===id));data={ok:true};}
    else if(path==='/api/admin/galleries/g/release'){detail.notificationStatus={status:'pending',pendingCount:1};data={ok:true,notification:detail.notificationStatus};}
    else if(path.endsWith('/notifications/retry')){detail.notificationStatus={status:'sent',pendingCount:0};data={ok:true,notification:detail.notificationStatus};}
    else if(path==='/api/admin/galleries/g/invoice'&&options.method==='POST'){const invoice={id:'inv',userId:body.get('userId'),filename:body.get('file').name,size:body.get('file').size,uploadedAt:Date.now(),url:'/api/galleries/g/invoice?userId='+body.get('userId')};data={invoice};}
    else data={ok:true};
    return{ok:true,status:200,json:async()=>structuredClone(data)};
  };
  window.eval(translationSource.replace('export const translations =','window.portalTranslations ='));
  window.orderConsent=orderConsent;window.ORDER_CONSENT_VERSION=ORDER_CONSENT_VERSION;
  window.eval(portalSource.replace("import { ORDER_CONSENT_VERSION, orderConsent } from './order-consent.js';",'const {ORDER_CONSENT_VERSION,orderConsent}=window;').replace("import { translations } from './translations.js';",'const translations=window.portalTranslations;').replace(/initialise\(\);\s*$/,'window.ui={state,loadSession,loadAdmin,renderAdmin,renderGallery,openGallery,onAction,onChange,onSubmit,adminOrderDirty,acceptAdminDetail,ordersHtml,initialise,openCheckout,showBank,makePreview,paintWatermark,previewFormData,updateDesignPreview,pollStudioActivity};'));
  const ui=window.ui;
  const action=async(name,attrs={})=>{const button=[...window.document.querySelectorAll(`[data-action="${name}"]`)].find(node=>Object.entries(attrs).every(([key,value])=>node.dataset[key]===value));assert.ok(button,`Missing action ${name}`);await ui.onAction({target:button,preventDefault(){}});};
  const change=(selector,value)=>{const input=window.document.querySelector(selector);assert.ok(input,selector);input.value=value;ui.onChange({target:input});};
  return{dom,window,ui,requests,action,change,get detail(){return detail;},set detail(value){detail=value;},set orders(value){orders=value;},set completeResult(value){completeResult=value;},set confirmResult(value){confirmResult=value;},set orderHandler(value){orderHandler=value;},set pendingDeletions(value){pendingDeletions=value;},set requestHandler(value){requestHandler=value;},set testOrderDeletionReady(value){testOrderDeletionReady=value;}};
}
async function adminHarness(options){const h=harness(options);await h.ui.loadSession();await h.ui.loadAdmin('g');return h;}

test('customer overview switches views without refetching or losing focus and retains the choice after opening a gallery',async t=>{
  const h=harness({user:{id:'u1',name:'Anna',role:'customer'}});t.after(()=>h.dom.window.close());await h.ui.initialise();
  const list=h.window.document.querySelector('#portal-gallery-list'),galleryLink=list.querySelector('[data-action="open-gallery"]');
  assert.equal(list.dataset.view,'large');const requestCount=h.requests.length;
  for(const view of ['compact','list','large','compact']){
    const control=h.window.document.querySelector(`[data-action="gallery-view"][data-view="${view}"]`);control.focus();await h.action('gallery-view',{view});
    assert.equal(list.dataset.view,view);assert.equal(h.window.document.activeElement,control);
    assert.equal(h.window.document.querySelectorAll('[data-action="gallery-view"][aria-pressed="true"]').length,1);
    assert.equal(control.getAttribute('aria-pressed'),'true');assert.equal(h.requests.length,requestCount);assert.equal(list.querySelector('[data-action="open-gallery"]'),galleryLink);
  }
  assert.equal(h.window.localStorage.getItem('liza.portal.galleryView'),'compact');
  await h.action('open-gallery',{id:'g'});assert.equal(h.ui.state.view,'gallery');await h.action('home');
  assert.equal(h.window.document.querySelector('#portal-gallery-list').dataset.view,'compact');
  assert.equal(h.window.document.querySelector('.portal-orders > p').classList.contains('portal-small'),false);
});

test('a new page restores only supported gallery views from browser storage',async t=>{
  for(const [stored,expected] of [['list','list'],['compact','compact'],['invalid','large'],['__proto__','large']]){
    const h=harness({storedGalleryView:stored});t.after(()=>h.dom.window.close());await h.ui.initialise();
    assert.equal(h.window.document.querySelector('#portal-gallery-list').dataset.view,expected);
    const control=h.window.document.querySelector('[data-action="gallery-view"][aria-pressed="true"]');assert.equal(control.dataset.view,expected);
  }
});

test('blocked browser storage does not prevent login, view changes or opening a gallery',async t=>{
  const h=harness({storageUnavailable:true});t.after(()=>h.dom.window.close());await h.ui.initialise();
  assert.equal(h.ui.state.view,'home');await h.action('gallery-view',{view:'list'});
  assert.equal(h.window.document.querySelector('#portal-gallery-list').dataset.view,'list');
  await h.action('open-gallery',{id:'g'});assert.equal(h.ui.state.view,'gallery');
});

test('admin customer favourites show counts and names and select only the chosen client',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  const favorite=h.window.document.querySelector('[data-admin-thumb="b"] .portal-admin-favorite-badge');
  assert.equal(favorite.querySelector('strong').textContent,'2');assert.match(favorite.textContent,/Anna, Emir/);
  assert.equal(h.window.document.querySelector('[data-admin-thumb="c"] .portal-admin-favorite-badge'),null);
  h.change('#p-admin-favourite-filter','u2');
  assert.deepEqual([...h.window.document.querySelectorAll('[data-admin-thumb]')].map(node=>node.dataset.adminThumb),['b']);
  await h.action('admin-select-favourites');
  assert.deepEqual([...h.ui.state.adminSelection],['b']);assert.equal(h.window.document.querySelector('#p-release-user').value,'u2');
  await h.action('admin-release');
  const release=h.requests.find(request=>request.path.endsWith('/release'));
  assert.deepEqual(release.body,{userId:'u2',imageIds:['b']});
  assert.match(h.window.document.querySelector('#portal-toast').textContent,/E-Mail/);
  assert.ok(h.window.document.querySelector('[data-action="retry-gallery-notifications"]'));
  await h.action('retry-gallery-notifications');
  assert.ok(h.requests.some(request=>request.path==='/api/admin/galleries/g/notifications/retry'));
  assert.equal(h.window.document.querySelector('[data-action="retry-gallery-notifications"]'),null);
});

test('filtered reordering submits the entire image set and retains selection across edits',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.change('#p-admin-favourite-filter','u1');await h.action('admin-select-favourites');
  await h.action('admin-move-image',{id:'b',direction:'up'});
  assert.deepEqual([...h.ui.state.adminOrderIds],['b','a','c']);assert.equal(h.ui.adminOrderDirty(),true);
  assert.deepEqual([...h.ui.state.adminSelection],['a','b']);
  assert.match(h.window.document.querySelector('.portal-unsaved').textContent,/nicht gespeichert/);
  await h.action('admin-refresh');assert.deepEqual([...h.ui.state.adminOrderIds],['b','a','c']);assert.equal(h.ui.adminOrderDirty(),true);
  h.change('#p-admin-image-sort','desc');assert.deepEqual([...h.ui.state.adminOrderIds],['a','c','b']);
  await h.action('admin-save-order');
  assert.deepEqual(h.requests.find(request=>request.path.endsWith('/images/order')).body,{imageIds:['a','c','b']});
  assert.equal(h.ui.adminOrderDirty(),false);await h.ui.loadAdmin('g');assert.deepEqual([...h.ui.state.adminOrderIds],['a','c','b']);
  h.change('#p-admin-image-sort','asc');assert.deepEqual([...h.ui.state.adminOrderIds],['b','c','a']);
  await h.action('admin-reset-order');assert.deepEqual([...h.ui.state.adminOrderIds],['a','c','b']);
});

test('unsaved ordering guards navigation and client preview uses customerView',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  await h.action('admin-move-image',{id:'a',direction:'down'});h.confirmResult=false;
  await h.action('toggle-admin');assert.equal(h.ui.state.admin,true);assert.equal(h.ui.adminOrderDirty(),true);
  h.confirmResult=true;await h.action('toggle-admin');assert.equal(h.ui.state.admin,false);assert.equal(h.ui.adminOrderDirty(),false);
  assert.ok(h.requests.some(request=>request.path==='/api/galleries/g?customerView=1'));
  assert.equal(h.window.document.querySelector('.portal-gallery-head').dataset.layout,'split');
  assert.equal(h.window.document.querySelector('.portal-photo-grid').dataset.density,'compact');
  assert.equal(h.window.document.querySelector('.portal-photo-grid').style.getPropertyValue('--gallery-gap'),'24px');
  assert.equal(h.window.document.querySelectorAll('.portal-photo-filename').length,3);
});

test('appearance controls persist all layout fields with explicit boolean',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());const form=h.window.document.querySelector('#portal-gallery-settings');
  form.elements.coverLayout.value='editorial';form.elements.coverHeight.value='compact';form.elements.gridDensity.value='spacious';form.elements.gridGap.value='40';form.elements.showFilenames.checked=false;
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const patch=h.requests.find(request=>request.path==='/api/admin/galleries/g'&&request.method==='PATCH');
  assert.equal(patch.body.coverLayout,'editorial');assert.equal(patch.body.coverHeight,'compact');assert.equal(patch.body.gridDensity,'spacious');assert.equal(patch.body.gridGap,40);assert.equal(patch.body.showFilenames,false);
});

test('setup completion routes to server-validated gallery and respects a null target',async t=>{
  for(const target of ['valid-target',null]){
    const h=harness({user:{id:'u1',role:'customer'},url:'https://portal.test/galerie/?token='+'a'.repeat(64)+'&gallery=untrusted'});t.after(()=>h.dom.window.close());h.completeResult={galleryId:target};
    await h.ui.initialise();const form=h.window.document.querySelector('#portal-password-form');form.elements.password.value='long-password-123';form.elements.passwordRepeat.value='long-password-123';
    await h.ui.onSubmit({target:form,preventDefault(){}});
    assert.equal(h.requests.some(request=>request.path==='/api/galleries/untrusted'),false);
    assert.equal(h.requests.some(request=>request.path==='/api/galleries/valid-target'),Boolean(target));
    assert.equal(h.ui.state.view,target?'gallery':'home');
  }
});

test('invoice controls isolate the selected customer, upload the PDF and remove it',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.detail.invoices=[{id:'other',userId:'u2',filename:'private-u2.pdf',url:'/api/galleries/g/invoice?userId=u2'}];
  h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();h.change('#p-invoice-user','u1');
  assert.doesNotMatch(h.window.document.querySelector('#p-invoice-current').textContent,/private-u2/);
  const form=h.window.document.querySelector('#portal-invoice-form'),file=new h.window.File(['%PDF-1.7\ninvoice'],'rechnung.pdf',{type:'application/pdf'});
  Object.defineProperty(form.elements.file,'files',{value:[file],configurable:true});
  // JSDOM has no file chooser; application-level PDF validation still runs.
  form.reportValidity=()=>true;
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const upload=h.requests.find(request=>request.path.endsWith('/invoice')&&request.method==='POST');
  assert.equal(upload.body.get('userId'),'u1');assert.equal(upload.body.get('file').name,'rechnung.pdf');assert.equal(upload.body.get('file').size,file.size);
  assert.match(h.window.document.querySelector('#p-invoice-current').textContent,/rechnung.pdf/);
  await h.action('remove-invoice');assert.deepEqual(h.requests.find(request=>request.path.endsWith('/invoice')&&request.method==='DELETE').body,{userId:'u1'});
  assert.equal(h.ui.state.adminDetail.invoices.some(invoice=>invoice.userId==='u2'),true);
  assert.equal(h.ui.state.adminDetail.invoices.some(invoice=>invoice.userId==='u1'),false);
});

test('customer gallery includes only its returned invoice and localized labels',async t=>{
  for(const lang of ['de','en','bs']){
    const h=harness({lang,user:{id:'u1',role:'customer'}});t.after(()=>h.dom.window.close());await h.ui.loadSession();
    h.detail.invoice={filename:'rechnung.pdf',url:'/api/galleries/g/invoice'};await h.ui.openGallery('g');
    assert.equal(h.window.document.querySelector('.portal-gallery-invoice a').getAttribute('href'),'/api/galleries/g/invoice');
    assert.equal(h.window.document.querySelector('#p-invoice-user'),null);
    assert.doesNotMatch(h.window.document.querySelector('.portal-gallery-invoice').textContent,/downloadInvoice/);
  }
});

test('refresh adopts externally saved order and keeps a user draft when images are added',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.detail.images=[h.detail.images[2],h.detail.images[0],h.detail.images[1]];
  await h.action('admin-refresh');assert.deepEqual([...h.ui.state.adminOrderIds],['c','a','b']);assert.equal(h.ui.adminOrderDirty(),false);
  await h.action('admin-move-image',{id:'a',direction:'down'});
  h.detail.images.push({id:'d',title:'IMG_30',previewUrl:'/d'});
  await h.action('admin-refresh');assert.deepEqual([...h.ui.state.adminOrderIds],['c','b','a','d']);assert.equal(h.ui.adminOrderDirty(),true);
});

test('admin preview hearts are temporary and never post admin favourites as customer data',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());await h.action('toggle-admin');
  await h.action('favorite',{id:'a'});assert.equal(h.ui.state.favourites.has('a'),true);
  assert.equal(h.requests.some(request=>request.path.endsWith('/favorites')),false);
});

test('invoice validation rejects non-PDF and oversized files before an upload request',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.change('#p-invoice-user','u1');const form=h.window.document.querySelector('#portal-invoice-form');form.reportValidity=()=>true;
  for(const file of [new h.window.File(['text'],'rechnung.txt',{type:'text/plain'}),new h.window.File([new Uint8Array(5*1024*1024+1)],'rechnung.pdf',{type:'application/pdf'})]){
    Object.defineProperty(form.elements.file,'files',{value:[file],configurable:true});await h.ui.onSubmit({target:form,preventDefault(){}});
    assert.ok(form.querySelector('.portal-form-message'));assert.equal(h.requests.some(request=>request.path.endsWith('/invoice')&&request.method==='POST'),false);
  }
});

test('customer cover and grid render every supported appearance combination without a cover image',async t=>{
  const h=harness({user:{id:'u1',role:'customer'}});t.after(()=>h.dom.window.close());await h.ui.loadSession();
  for(const coverLayout of ['overlay','split','editorial'])for(const gridLayout of ['masonry','grid']){
    h.detail.gallery={...gallery,coverLayout,gridLayout,coverUrl:null,showFilenames:false};await h.ui.openGallery('g');
    assert.equal(h.window.document.querySelector('.portal-gallery-head').dataset.layout,coverLayout);
    assert.equal(h.window.document.querySelector('.portal-gallery-head').classList.contains('no-photo'),true);
    assert.equal(h.window.document.querySelector('.portal-photo-grid').classList.contains('portal-equal-grid'),gridLayout==='grid');
    assert.equal(h.window.document.querySelector('.portal-photo-filename'),null);
  }
});

test('admin order mail failures provide an order-specific retry with long order content',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.orders=[{id:'00000000-1111-2222-3333-444444444444',galleryId:'g',galleryName:'Eine Galerie mit einem sehr langen Namen',packageName:'1EUR Galerie Digital',createdAt:'2026-10-08',customerEmail:'a-very-long-customer-email@example.test',amountCents:100,currency:'EUR',status:'paid',receiptSent:true,notificationStatus:{status:'pending',pendingCount:1}}];
  h.ui.state.adminTab='orders';await h.ui.loadAdmin();
  assert.match(h.window.document.querySelector('.portal-order').textContent,/00000000-1111-2222-3333-444444444444/);
  assert.match(h.window.document.querySelector('.portal-badge').textContent,/Bezahlt/);
  await h.action('retry-order-notifications');
  assert.ok(h.requests.some(request=>request.path==='/api/admin/orders/00000000-1111-2222-3333-444444444444/notifications/retry'&&request.method==='POST'));
});

test('mobile order containment allows long identifiers, badges, and admin actions to wrap',()=>{
  assert.match(css,/\.portal-order\{flex-wrap:wrap;min-width:0;max-width:100%;overflow-wrap:anywhere\}/);
  assert.match(css,/\.portal-order>div\{min-width:0;flex:1 1 200px\}/);
  assert.match(css,/\.portal-order \.portal-badge\{max-width:100%;white-space:normal;overflow-wrap:anywhere;/);
  assert.match(css,/@media\(max-width:480px\)\{[^\n]*\.portal-order>div,\.portal-order>\.portal-order-meta\{flex-basis:100%;text-align:left;margin-left:0;min-width:0\}/);
  assert.match(css,/\.portal-order>\.portal-btn\{flex:1 1 100%\}/);
});


test('studio navigation, date filtering and image library retain the correct gallery target',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  await h.action('admin-tab',{tab:'galleries'});
  assert.equal(h.window.document.querySelector('.portal-admin-editor'),null);
  assert.equal(h.window.document.querySelectorAll('.portal-studio-gallery').length,1);
  h.change('[name="studioSearch"]','not there');assert.equal(h.window.document.querySelector('.portal-studio-gallery'),null);
  await h.action('reset-filters');h.change('[name="studioDate"]','2026-10-09');assert.equal(h.window.document.querySelector('.portal-studio-gallery'),null);
  await h.action('admin-tab',{tab:'images'});assert.equal(h.window.document.querySelectorAll('.portal-library-card').length,3);
  await h.action('admin-tab',{tab:'favourites'});assert.equal(h.window.document.querySelectorAll('.portal-library-card').length,1);
  assert.equal(h.window.document.querySelector('.portal-library-card [data-action="admin-image"]').dataset.galleryId,'g');
  await h.action('admin-image',{id:'b'});const form=h.window.document.querySelector('#portal-rename-image');assert.equal(form.dataset.galleryId,'g');form.elements.title.value='Neuer Name';
  await h.ui.onSubmit({target:form,preventDefault(){}});
  assert.deepEqual(h.requests.find(request=>request.path==='/api/admin/galleries/g/images/b'&&request.method==='PATCH').body,{title:'Neuer Name'});
});

test('gallery panels retain unsaved form values and update desktop/mobile design previews',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  assert.equal(h.window.document.querySelector('[data-editor-panel="photos"]').hidden,false);
  assert.equal(h.window.document.querySelector('[data-editor-panel="members"]').hidden,true);
  await h.action('editor-panel',{panel:'design'});
  const form=h.window.document.querySelector('#portal-gallery-settings');form.elements.name.value='Meine neue Galerie';h.change('[name="typography"]','sans');h.change('[name="theme"]','dark');h.change('[name="coverDecoration"]','frame');
  assert.equal(h.window.document.querySelector('#p-preview-page').dataset.theme,'dark');
  assert.equal(h.window.document.querySelector('.portal-preview-cover').dataset.typography,'sans');
  assert.equal(h.window.document.querySelector('.portal-preview-cover').dataset.decoration,'frame');
  assert.match(h.window.document.querySelector('.portal-preview-cover').textContent,/Meine neue Galerie/);
  await h.action('preview-device',{device:'mobile'});assert.equal(h.window.document.querySelector('#p-preview-page').dataset.device,'mobile');
  await h.action('editor-panel',{panel:'members'});await h.action('editor-panel',{panel:'settings'});assert.equal(form.elements.name.value,'Meine neue Galerie');
  form.elements.watermarkMode.value='off';await h.ui.onSubmit({target:form,preventDefault(){}});
  const patch=h.requests.find(request=>request.path==='/api/admin/galleries/g'&&request.method==='PATCH');assert.equal(patch.body.typography,'sans');assert.equal(patch.body.watermarkMode,'off');assert.equal(patch.body.coverDecoration,'frame');
});

test('studio settings only submit bounded plain text and supported watermark options',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());await h.action('admin-tab',{tab:'settings'});
  const form=h.window.document.querySelector('#portal-studio-settings');form.elements.watermarkText.value='Emina ♥';form.elements.watermarkSize.value='48';form.elements.watermarkOpacity.value='.5';form.elements.watermarkPosition.value='center';form.elements.email_order_intro.value='<script>plain text</script>';
  assert.equal(form.elements.email_order_intro.maxLength,1000);
  await h.ui.onSubmit({target:form,preventDefault(){}});const patch=h.requests.find(request=>request.path==='/api/admin/settings'&&request.method==='PATCH');
  assert.deepEqual(patch.body.watermark,{enabled:true,text:'Emina ♥',size:48,opacity:.5,position:'center'});assert.equal(patch.body.emails.order.intro,'<script>plain text</script>');assert.equal(h.window.document.querySelector('script'),null);
});

test('activity explicitly reports started downloads and supports marking them read',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());await h.action('admin-tab',{tab:'activity'});
  assert.match(h.window.document.querySelector('.portal-activity').textContent,/Download gestartet/);
  assert.equal(h.window.document.querySelector('.portal-activity').classList.contains('unread'),true);
  await h.action('activity-read');assert.ok(h.requests.find(request=>request.path==='/api/admin/activity/read').body.readThrough===1791541800000);
});

test('customer orders show immutable invoice immediately after confirmation link and use short reference',async t=>{
  const h=harness();t.after(()=>h.dom.window.close());const html=h.ui.ordersHtml([{id:'internal-uuid',reference:'LZ-ABC12345',invoiceUrl:'/api/orders/internal-uuid/invoice',packageName:'Galerie Digital',amountCents:2500,currency:'EUR',status:'pending',createdAt:'2026-10-09'}]);
  h.window.document.querySelector('#portal-app').innerHTML=html;
  const invoice=h.window.document.querySelector('.portal-order-invoice');assert.equal(invoice.previousElementSibling.getAttribute('href'),'/api/orders/internal-uuid/receipt');assert.equal(invoice.getAttribute('href'),'/api/orders/internal-uuid/invoice');
  assert.match(h.window.document.querySelector('.portal-order').textContent,/LZ-ABC12345/);assert.doesNotMatch(h.window.document.querySelector('.portal-order').textContent,/internal-uuid/);
});

test('checkout uses the actual logo and payment details copy exactly the new reference',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());await h.ui.openGallery('g');h.ui.state.selected.add('a');h.ui.openCheckout();
  assert.match(h.window.document.querySelector('.portal-modal-brand img').getAttribute('src'),/logo-liza.webp/);
  h.ui.state.capabilities.transfer={recipient:'Test Name',iban:'TEST123',bic:'TESTBIC'};let copied;Object.defineProperty(h.window.navigator,'clipboard',{value:{writeText:async value=>copied=value}});
  h.ui.showBank({id:'uuid',reference:'LZ-ABC12345',status:'paid',amountCents:2500,currency:'EUR',paymentMethod:'transfer'});
  const button=[...h.window.document.querySelectorAll('[data-action="copy-bank"]')].find(node=>node.dataset.value==='LZ-ABC12345');await h.ui.onAction({target:button,preventDefault(){}});assert.equal(copied,'LZ-ABC12345');assert.doesNotMatch(h.window.document.querySelector('.portal-modal-copy>p').textContent,/Bitte überweise/);
});

test('main-site form styles cannot expand thumbnail checkboxes or force titles into single letters',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  for(const text of [homepageCss,css]){const style=h.window.document.createElement('style');style.textContent=text;h.window.document.head.append(style);}
  const box=h.window.document.querySelector('[data-admin-image]'),caption=box.nextElementSibling,button=h.window.document.querySelector('.portal-admin-move .portal-btn'),computed=h.window.getComputedStyle(box);
  assert.equal(computed.width,'16px');assert.equal(computed.height,'16px');assert.equal(computed.padding,'0px');assert.equal(computed.flexBasis,'16px');
  assert.equal(h.window.getComputedStyle(caption).whiteSpace,'nowrap');assert.equal(h.window.getComputedStyle(caption).textOverflow,'ellipsis');
  assert.equal(h.window.getComputedStyle(button).whiteSpace,'nowrap');assert.equal(h.window.getComputedStyle(button).overflowWrap,'normal');
});

test('preview generation retains original dimensions and embeds watermark only in reduced protected image',async t=>{
  const h=harness();t.after(()=>h.dom.window.close());const encoded=[],drawn=[];let closed=0;
  h.window.createImageBitmap=async()=>({width:2400,height:1600,close(){closed++;}});
  h.window.HTMLCanvasElement.prototype.getContext=function(){const canvas=this;return{drawImage(){},measureText(text){return{width:text.length*20};},save(){},restore(){},translate(){},rotate(){},strokeText(text){drawn.push({canvas,text});},fillText(){}};};
  h.window.HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){encoded.push({width:this.width,height:this.height,type,quality});callback(new h.window.Blob(['preview'],{type}));};
  const file=new h.window.File(['image'],'photo.jpg',{type:'image/jpeg'}),result=await h.ui.makePreview(file,{enabled:true,text:'LiZa',size:36,opacity:.4,position:'diagonal',fingerprint:'fp'});
  assert.equal(result.width,2400);assert.equal(result.height,1600);assert.equal(closed,1);assert.deepEqual(encoded.map(x=>[x.width,x.height,x.quality]),[[1800,1200,.85],[1200,800,.65]]);assert.equal(drawn.length,3);assert.ok(drawn.every(x=>x.canvas.width===1200&&x.text==='LiZa'));
  const data=h.ui.previewFormData(result);assert.ok(data.get('preview'));assert.ok(data.get('protectedPreview'));assert.equal(data.get('watermarkFingerprint'),'fp');assert.equal(data.has('original'),false);
  encoded.length=0;drawn.length=0;const clean=await h.ui.makePreview(file,{enabled:false});assert.equal(clean.protectedBlob,null);assert.equal(encoded.length,1);assert.equal(drawn.length,0);
});


test('gallery favourite selection excludes backend rows with zero favourite count',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail.customerFavorites.images.push({imageId:'c',count:0,customers:[]});h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  h.change('#p-admin-favourite-filter','favourites');assert.deepEqual([...h.window.document.querySelectorAll('[data-admin-thumb]')].map(node=>node.dataset.adminThumb),['a','b']);
  await h.action('admin-select-favourites');assert.deepEqual([...h.ui.state.adminSelection],['a','b']);
});


test('email order deep links only open an order already authorized by the orders response',async t=>{
  for(const matching of [true,false]){const h=harness({user:{id:'u1',role:'customer'},url:'https://portal.test/galerie/?gallery=g&order=authorized-order'});t.after(()=>h.dom.window.close());h.orders=matching?[{id:'authorized-order',reference:'LZ-SHORT123',galleryId:'g',amountCents:2500,currency:'EUR',status:'pending'}]:[];await h.ui.initialise();
    assert.equal(Boolean(h.window.document.querySelector('dialog')),matching);if(matching)assert.match(h.window.document.querySelector('dialog').textContent,/LZ-SHORT123/);
    assert.equal(h.requests.some(request=>request.path.includes('authorized-order')),false);
  }
});

test('activity badge poll does not disrupt an unsaved editor and discards responses after logout',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());Object.defineProperty(h.window.document,'hidden',{value:false});
  const form=h.window.document.querySelector('#portal-gallery-settings');form.elements.name.value='Unsaved';
  h.window.fetch=async()=>({ok:true,status:200,json:async()=>({unreadCount:7})});await h.ui.pollStudioActivity();assert.equal(h.window.document.querySelector('[data-studio-count]').textContent,'7');assert.equal(form.elements.name.value,'Unsaved');
  let finish;h.window.fetch=()=>new Promise(resolve=>finish=resolve);const poll=h.ui.pollStudioActivity();h.ui.state.admin=false;h.ui.state.user=null;finish({ok:true,status:200,json:async()=>({unreadCount:99})});await poll;assert.equal(h.ui.state.adminUnread,7);
});

test('admin photos and inspector display the protected preview while originals remain downloadable',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.detail.previewSettings={enabled:true};
  h.detail.images=h.detail.images.map(image=>({...image,watermarkEnabled:true,protectedPreviewReady:true,protectedPreviewUrl:`/api/images/${image.id}?kind=preview&watermark=1`}));
  h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  const thumb=h.window.document.querySelector('[data-admin-thumb="a"]');
  assert.equal(thumb.querySelector('img').getAttribute('src'),'/api/images/a?kind=preview&watermark=1');
  assert.match(thumb.querySelector('.portal-watermark-status').textContent,/Wasserzeichen sichtbar/);
  await h.action('admin-image',{id:'a'});
  const dialog=h.window.document.querySelector('dialog');
  assert.equal(dialog.querySelector('.portal-admin-detail-photo').getAttribute('src'),'/api/images/a?kind=preview&watermark=1');
  assert.equal(dialog.querySelector('a[download]').getAttribute('href'),'/api/images/a?kind=original');
});

test('missing admin previews remain inspectable and explain regeneration without reupload; gallery off uses clean images',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.detail.previewSettings={enabled:true};
  h.detail.images=h.detail.images.map((image,index)=>({...image,watermarkEnabled:true,protectedPreviewReady:index===0,protectedPreviewUrl:`/protected-${image.id}`}));
  h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  assert.equal(h.window.document.querySelector('[data-admin-thumb="b"] img').getAttribute('src'),'/b');
  assert.match(h.window.document.querySelector('[data-admin-thumb="b"] .portal-watermark-status').textContent,/aktualisieren/);
  const warning=h.window.document.querySelector('.portal-preview-warning').textContent;
  assert.match(warning,/2 von 3/);assert.match(warning,/Vorschauen aktualisieren/);assert.match(warning,/nicht neu hochladen/);
  assert.ok(h.window.document.querySelector('[data-action="regenerate-previews"]'));
  h.detail.gallery.watermarkMode='off';h.detail.previewSettings.enabled=false;h.detail.images.forEach(image=>image.watermarkEnabled=false);
  h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  assert.equal(h.window.document.querySelector('[data-admin-thumb="a"] img').getAttribute('src'),'/a');
  assert.match(h.window.document.querySelector('[data-admin-thumb="a"] .portal-watermark-status').textContent,/Wasserzeichen aus/);
  assert.equal(h.window.document.querySelector('.portal-preview-maintenance .portal-preview-warning'),null);
});

test('admin design and library use protected previews and respect effective gallery watermark modes',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.detail.gallery.watermarkMode='on';h.detail.gallery.coverImageId='a';h.detail.previewSettings={enabled:true};
  h.detail.images=h.detail.images.map((image,index)=>({...image,watermarkEnabled:index!==1,protectedPreviewReady:true,protectedPreviewUrl:`/protected-${image.id}`}));
  h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();await h.action('editor-panel',{panel:'design'});
  assert.equal(h.window.document.querySelector('.portal-preview-cover img').getAttribute('src'),'/protected-a');
  assert.equal(h.window.document.querySelector('.portal-preview-photos img').getAttribute('src'),'/protected-a');
  h.change('[name="watermarkMode"]','off');
  assert.equal(h.window.document.querySelector('.portal-preview-cover img').getAttribute('src'),'/a');
  assert.match(h.window.document.querySelector('#p-preview-page .portal-preview-warning').textContent,/Speichere/);
  h.detail.previewSettings.enabled=false;h.detail.images.forEach(image=>image.watermarkEnabled=false);
  h.change('[name="watermarkMode"]','on');
  assert.equal(h.window.document.querySelector('.portal-preview-cover img').getAttribute('src'),'/a');
  assert.match(h.window.document.querySelector('#p-preview-page .portal-preview-warning').textContent,/Speichere/);
  h.detail.previewSettings.enabled=true;h.detail.images.forEach((image,index)=>image.watermarkEnabled=index!==1);
  await h.action('admin-tab',{tab:'images'});
  const cards=[...h.window.document.querySelectorAll('.portal-library-card')];
  assert.deepEqual(cards.map(card=>card.querySelector('img').getAttribute('src')),['/protected-a','/b','/protected-c']);
  assert.match(cards[0].textContent,/Wasserzeichen sichtbar/);assert.match(cards[1].textContent,/Wasserzeichen aus/);
});

test('all fifteen palette swatches select the matching real preview without discarding other edits',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());await h.action('editor-panel',{panel:'design'});
  const form=h.window.document.querySelector('#portal-gallery-settings'),themes=['warm','light','dark','cream','rose','blush','sand','clay','sage','olive','forest','sea','sky','lavender','slate'];
  assert.deepEqual([...form.elements.theme.options].map(option=>option.value),themes);
  assert.equal(form.elements.coverLayout.options.length,8);assert.equal(form.elements.coverDecoration.options.length,8);
  form.elements.name.value='Noch ungespeichert';const requestCount=h.requests.length;
  for(const theme of themes){
    await h.action('choose-theme',{theme});
    assert.equal(form.elements.theme.value,theme);assert.equal(h.window.document.querySelector('#p-preview-page').dataset.theme,theme);
    assert.equal(form.querySelectorAll('[data-action="choose-theme"][aria-pressed="true"]').length,1);
    assert.equal(form.querySelector('[data-action="choose-theme"][aria-pressed="true"]').dataset.theme,theme);
    assert.equal(form.elements.name.value,'Noch ungespeichert');
  }
  assert.equal(h.requests.length,requestCount);
  h.change('[name="theme"]','sage');assert.equal(form.querySelector('[data-action="choose-theme"][aria-pressed="true"]').dataset.theme,'sage');
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const patch=h.requests.find(request=>request.path==='/api/admin/galleries/g'&&request.method==='PATCH');assert.equal(patch.body.theme,'sage');assert.equal(patch.body.name,'Noch ungespeichert');
});

test('desktop and mobile cover choices stay independent across preview devices and reach saved customer markup',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());await h.action('editor-panel',{panel:'design'});
  const form=h.window.document.querySelector('#portal-gallery-settings');
  for(const [name,value] of Object.entries({coverLayout:'arch',coverDecoration:'corners',coverHeight:'large',coverHeightMobile:'compact',coverFit:'contain',coverFitMobile:'cover',theme:'forest'}))h.change(`[name="${name}"]`,value);
  for(const device of ['mobile','desktop','mobile']){
    await h.action('preview-device',{device});
    const preview=h.window.document.querySelector('.portal-preview-cover');assert.equal(preview.dataset.height,'large');assert.equal(preview.dataset.mobileHeight,'compact');assert.equal(preview.dataset.fit,'contain');assert.equal(preview.dataset.mobileFit,'cover');assert.equal(preview.dataset.layout,'arch');assert.equal(preview.dataset.decoration,'corners');
    assert.equal(form.elements.coverHeight.value,'large');assert.equal(form.elements.coverHeightMobile.value,'compact');
  }
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const patch=h.requests.find(request=>request.path==='/api/admin/galleries/g'&&request.method==='PATCH');
  for(const [name,value] of Object.entries({coverHeight:'large',coverHeightMobile:'compact',coverFit:'contain',coverFitMobile:'cover',coverLayout:'arch',coverDecoration:'corners'}))assert.equal(patch.body[name],value);
  h.detail.gallery={...h.detail.gallery,...patch.body};await h.ui.openGallery('g');
  const cover=h.window.document.querySelector('.portal-gallery-head');assert.equal(cover.dataset.height,'large');assert.equal(cover.dataset.mobileHeight,'compact');assert.equal(cover.dataset.fit,'contain');assert.equal(cover.dataset.mobileFit,'cover');assert.equal(cover.dataset.layout,'arch');assert.equal(cover.dataset.decoration,'corners');assert.equal(h.window.document.querySelector('.portal-content').dataset.theme,'forest');
});

test('selection dock has compact translated labels, full accessible names and still clears the selection',async t=>{
  for(const [lang,labels] of [['de',['Leeren','Download','Bestellen']],['en',['Clear','Download','Order']],['bs',['Poništi','Preuzmi','Naruči']]]){
    const h=harness({lang,user:{id:'u1',role:'customer'}});t.after(()=>h.dom.window.close());await h.ui.loadSession();await h.ui.openGallery('g');await h.action('select-image',{id:'a'});await h.action('select-image',{id:'b'});
    const dock=h.window.document.querySelector('#portal-selection-dock');assert.equal(dock.hidden,false);assert.equal(dock.getAttribute('role'),'region');
    const buttons=[...dock.querySelectorAll('button')];assert.deepEqual(buttons.map(button=>button.querySelector('.portal-btn-label').textContent),labels);assert.ok(buttons.every(button=>button.getAttribute('aria-label').length>=button.textContent.length));
    await h.action('clear-selection');assert.equal(h.ui.state.selected.size,0);assert.equal(dock.hidden,true);
  }
});

const checkoutOffers=()=>[
  {id:'all',name:'Alle Bilder',imageCount:0,priceCents:25000,currency:'EUR',active:true},
  {id:'single',name:'Ein Bild',imageCount:1,priceCents:1500,currency:'EUR',active:true},
  {id:'five',name:'Fünfer-Paket',imageCount:5,priceCents:6000,currency:'EUR',active:true},
  {id:'ten',name:'Zehner-Paket',imageCount:10,priceCents:10000,currency:'EUR',active:true}
];
async function checkoutHarness(t,{count=0,total=20,packages=checkoutOffers(),pricingMode='images',lang='de',requiredPackageId=null,requiredPackagePaid=false}={}){
  const h=harness({lang,user:{id:'u1',name:'Anna',role:'customer'}});t.after(()=>h.dom.window.close());
  h.detail={...h.detail,gallery:{...h.detail.gallery,pricingMode},images:Array.from({length:total},(_,index)=>({id:'photo-'+(index+1),title:'Foto '+(index+1),previewUrl:'/photo-'+(index+1),width:1200,height:800})),packages,requiredPackageId,requiredPackagePaid};
  await h.ui.loadSession();await h.ui.openGallery('g');
  h.ui.state.selected=new h.window.Set(h.detail.images.slice(0,count).map(image=>image.id));h.ui.renderGallery();
  return h;
}
function checkoutForm(h){return h.window.document.querySelector('#portal-order-form');}
function chooseCheckoutPackage(h,id){
  const input=checkoutForm(h).querySelector(`input[name="packageId"][value="${id}"]`);assert.ok(input);assert.equal(input.disabled,false,id+' must be eligible');
  input.checked=true;h.ui.onChange({target:input});return input;
}
function checkoutTotal(h){return Number(checkoutForm(h).querySelector('[data-checkout-total]')?.dataset.checkoutTotal);}
function acceptCheckout(h){const form=checkoutForm(h);form.elements.termsAccepted.checked=true;form.elements.earlyStartConsent.checked=true;form.elements.digitalConsent.checked=true;return form;}

test('checkout keeps every active package visible and defaults to the cheapest exact combination at each selection size',async t=>{
  for(const [count,preferred,total] of [[0,null,null],[4,'single',6000],[6,'five',7500],[9,'five',12000],[10,'ten',10000],[12,'ten',13000],[15,'ten',16000],[17,'ten',19000]]){
    const h=await checkoutHarness(t,{count});await h.action('checkout');const form=checkoutForm(h);
    const radios=[...form.querySelectorAll('[name="packageId"]')];assert.deepEqual(radios.map(input=>input.value),['all','single','five','ten'],String(count));
    const expectedDisabled={all:true,single:count===0,five:count<5,ten:count<10};
    for(const input of radios){assert.equal(input.disabled,expectedDisabled[input.value],`${count}: ${input.value}`);assert.equal(input.closest('label').classList.contains('is-unavailable'),input.disabled);assert.ok(h.window.document.getElementById(input.getAttribute('aria-describedby'))?.textContent);}
    assert.equal(form.querySelector('[name="packageId"]:checked')?.value||null,preferred,`${count}: preferred`);
    assert.equal(form.querySelector('button[type="submit"]').disabled,count===0);
    if(total===null)assert.equal(form.querySelector('[data-checkout-total]'),null);else assert.equal(checkoutTotal(h),total,String(count));
    assert.equal(h.ui.state.selected.size,count,'opening checkout never selects additional photos');
  }
});

test('choosing another package updates the exact breakdown while retaining automatic cheapest additions',async t=>{
  const h=await checkoutHarness(t,{count:15});await h.action('checkout');
  assert.equal(checkoutForm(h).querySelector('[name="packageId"]:checked').value,'ten');assert.equal(checkoutTotal(h),16000);
  let summary=checkoutForm(h).querySelector('#p-checkout-summary').textContent;assert.match(summary,/Zehner-Paket/);assert.match(summary,/Fünfer-Paket/);
  chooseCheckoutPackage(h,'five');assert.equal(checkoutTotal(h),16000);summary=checkoutForm(h).querySelector('#p-checkout-summary').textContent;assert.match(summary,/1 × Fünfer-Paket/);assert.match(summary,/1 × Zehner-Paket/);
  chooseCheckoutPackage(h,'single');assert.equal(checkoutTotal(h),17500);summary=checkoutForm(h).querySelector('#p-checkout-summary').textContent;assert.match(summary,/5 × Ein Bild/);assert.match(summary,/1 × Zehner-Paket/);
  chooseCheckoutPackage(h,'ten');assert.equal(checkoutTotal(h),16000);
});

test('whole-gallery offers require explicit selection of the entire gallery rather than only the visible favorites',async t=>{
  const h=await checkoutHarness(t,{pricingMode:'gallery',total:8});
  await h.action('buy-gallery');assert.equal(h.ui.state.selected.size,0);assert.deepEqual([...checkoutForm(h).querySelectorAll('[name="packageId"]')].map(input=>input.value),['all']);assert.equal(checkoutForm(h).elements.packageId.disabled,true);
  await h.action('close-dialog');h.ui.state.favourites=new h.window.Set(['photo-1','photo-2']);await h.action('filter',{filter:'favourites'});await h.action('select-all');await h.action('buy-gallery');
  assert.equal(h.ui.state.selected.size,2);assert.equal(checkoutForm(h).elements.packageId.disabled,true);assert.match(checkoutForm(h).textContent,/Noch 6/);
  await h.action('close-dialog');await h.action('filter',{filter:'all'});await h.action('select-all');await h.action('buy-gallery');
  assert.equal(h.ui.state.selected.size,8);assert.equal(checkoutForm(h).elements.packageId.disabled,false);assert.equal(checkoutTotal(h),25000);
});

test('exact mixed packages work without single-image offers and impossible combinations remain visibly disabled',async t=>{
  const packages=[{id:'five',name:'Fünfer-Paket',imageCount:5,priceCents:6000,currency:'EUR',active:true},{id:'three',name:'Dreier-Paket',imageCount:3,priceCents:4000,currency:'EUR',active:true}];
  const h=await checkoutHarness(t,{count:8,packages});await h.action('checkout');
  assert.equal(checkoutTotal(h),10000);assert.equal(checkoutForm(h).querySelector('[name="packageId"]:checked').value,'five');assert.ok([...checkoutForm(h).querySelectorAll('[name="packageId"]')].every(input=>!input.disabled));
  assert.match(checkoutForm(h).querySelector('#p-checkout-summary').textContent,/Fünfer-Paket/);assert.match(checkoutForm(h).querySelector('#p-checkout-summary').textContent,/Dreier-Paket/);
  await h.action('close-dialog');h.ui.state.selected=new h.window.Set(h.detail.images.slice(0,7).map(image=>image.id));await h.action('checkout');
  assert.equal(checkoutForm(h).querySelectorAll('[name="packageId"]').length,2);assert.ok([...checkoutForm(h).querySelectorAll('[name="packageId"]')].every(input=>input.disabled));assert.equal(checkoutForm(h).querySelector('button[type="submit"]').disabled,true);assert.equal(checkoutForm(h).querySelector('[data-checkout-total]'),null);
});

test('inactive and foreign-currency offers cannot discount checkout and duplicate-price ties remain deterministic',async t=>{
  const packages=[...checkoutOffers(),{id:'hidden',name:'Inaktiv',imageCount:2,priceCents:1,currency:'EUR',active:false},{id:'foreign',galleryId:'another-gallery',name:'Andere Galerie',imageCount:2,priceCents:1,currency:'EUR',active:true},{id:'dollar',name:'US-Dollar',imageCount:2,priceCents:1,currency:'USD',active:true},{id:'a-five',name:'Fünfer Alternative',imageCount:5,priceCents:6000,currency:'EUR',active:true}];
  const h=await checkoutHarness(t,{count:6,packages});await h.action('checkout');
  assert.equal(checkoutForm(h).querySelector('[value="hidden"]'),null);assert.equal(checkoutForm(h).querySelector('[value="foreign"]'),null);assert.equal(checkoutForm(h).querySelector('[value="dollar"]').disabled,true);assert.equal(checkoutTotal(h),7500);assert.equal(checkoutForm(h).querySelector('[name="packageId"]:checked').value,'a-five');
});

test('checkout posts the displayed total and original selection without accepting form-injected prices or quantities',async t=>{
  const h=await checkoutHarness(t,{count:17});await h.action('checkout');const form=acceptCheckout(h);
  form.insertAdjacentHTML('beforeend','<input name="amountCents" value="1"><input name="packageQuantity" value="900"><input name="singlePriceCents" value="0">');
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const posted=h.requests.filter(request=>request.path==='/api/orders'&&request.method==='POST');assert.equal(posted.length,1);
  assert.deepEqual(posted[0].body,{galleryId:'g',imageIds:h.detail.images.slice(0,17).map(image=>image.id),packageId:'ten',expectedAmountCents:19000,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de'});
});

test('whole-gallery checkout posts all only after all photos are selected and never falls back to a partial order',async t=>{
  const h=await checkoutHarness(t,{count:8,total:8,pricingMode:'gallery'});await h.action('buy-gallery');const form=acceptCheckout(h);await h.ui.onSubmit({target:form,preventDefault(){}});
  const posted=h.requests.find(request=>request.path==='/api/orders'&&request.method==='POST');assert.deepEqual(posted.body,{galleryId:'g',all:true,packageId:'all',expectedAmountCents:25000,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de'});
  const incomplete=await checkoutHarness(t,{count:7,total:8,pricingMode:'gallery'});await incomplete.action('buy-gallery');const badForm=acceptCheckout(incomplete);badForm.elements.packageId.disabled=false;badForm.elements.packageId.checked=true;await incomplete.ui.onSubmit({target:badForm,preventDefault(){}});
  assert.equal(incomplete.requests.filter(request=>request.path==='/api/orders'&&request.method==='POST').length,0);assert.equal(badForm.querySelector('button[type="submit"]').disabled,true);
});

test('package changes during a pending order cannot re-enable submit or create a second order',async t=>{
  const h=await checkoutHarness(t,{count:15});await h.action('checkout');const form=acceptCheckout(h);
  let finish;h.orderHandler=()=>new Promise(resolve=>{finish=resolve;});
  const pending=h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(form.getAttribute('aria-busy'),'true');assert.equal(typeof finish,'function');
  chooseCheckoutPackage(h,'single');assert.equal(form.querySelector('button[type="submit"]').disabled,true);
  await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(h.requests.filter(request=>request.path==='/api/orders'&&request.method==='POST').length,1);
  finish({ok:false,status:409,json:async()=>({code:'price_changed',message:'Changed'})});await pending;
  assert.equal(form.hasAttribute('aria-busy'),false);assert.equal(form.querySelector('button[type="submit"]').disabled,false);assert.match(form.textContent,/inzwischen geändert/);assert.match(form.textContent,/keine neue Bestellung/);assert.equal(checkoutTotal(h),17500);
});

test('checkout amount and eligibility are consistent across German, English and Bosnian',async t=>{
  for(const lang of ['de','en','bs']){const h=await checkoutHarness(t,{count:12,lang});await h.action('checkout');assert.equal(checkoutTotal(h),13000);assert.equal(checkoutForm(h).querySelector('[name="packageId"]:checked').value,'ten');assert.equal(checkoutForm(h).querySelector('[value="all"]').disabled,true);assert.doesNotMatch(checkoutForm(h).textContent,/packageNeeds|packageCombination|checkoutSummary/);}
});

const bookingOffers=()=>[{id:'booking',name:'Gebuchtes Shooting',imageCount:5,priceCents:20000,currency:'EUR',active:true,isRequired:true},...checkoutOffers()];

test('admin can set the required booking on new and existing packages and sees the persisted marker',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail.requiredPackagesReady=true;h.detail.packages=bookingOffers();h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  const form=h.window.document.querySelector('#portal-package-form');assert.ok(form.elements.isRequired);assert.equal(form.elements.isRequired.disabled,false);assert.equal(form.elements.isRequired.checked,false);
  form.elements.packageName.value='Reserviertes Paket';form.elements.imageCount.value='5';form.elements.price.value='200';form.elements.isRequired.checked=true;
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const created=h.requests.find(request=>request.path==='/api/admin/galleries/g/packages'&&request.method==='POST');
  assert.deepEqual(created.body,{name:'Reserviertes Paket',imageCount:5,priceCents:20000,currency:'EUR',isRequired:true});
  assert.ok(h.window.document.querySelector('.portal-admin-list .portal-required-label'));
  await h.action('edit-package',{id:'booking'});const edited=h.window.document.querySelector('#portal-edit-package');assert.equal(edited.elements.isRequired.checked,true);edited.elements.isRequired.checked=false;
  await h.ui.onSubmit({target:edited,preventDefault(){}});
  assert.equal(h.requests.find(request=>request.path==='/api/admin/galleries/g/packages/booking'&&request.method==='PATCH').body.isRequired,false);
});

test('required-package admin checkbox explains a missing database upgrade and cannot be chosen',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail.requiredPackagesReady=false;h.detail.packages=bookingOffers();h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  assert.equal(h.window.document.querySelector('#portal-package-form').elements.isRequired.disabled,true);
  assert.match(h.window.document.querySelector('.portal-required-field').textContent,/Datenbank/);
  await h.action('edit-package',{id:'booking'});assert.equal(h.window.document.querySelector('#portal-edit-package').elements.isRequired.disabled,true);
});

test('mandatory initial booking stays selected and optimizes only photos above its included count',async t=>{
  for(const [count,total,parts]of[[5,20000,['1 × Gebuchtes Shooting']],[7,23000,['1 × Gebuchtes Shooting','2 × Ein Bild']],[12,29000,['1 × Gebuchtes Shooting','1 × Fünfer-Paket','2 × Ein Bild']],[17,33000,['1 × Gebuchtes Shooting','1 × Zehner-Paket','2 × Ein Bild']],[20,36000,['1 × Gebuchtes Shooting','1 × Zehner-Paket','1 × Fünfer-Paket']]]){
    const h=await checkoutHarness(t,{count,total:30,packages:bookingOffers(),requiredPackageId:'booking'});await h.action('checkout');const form=checkoutForm(h);
    assert.equal(form.querySelector('[name="packageId"]:checked').value,'booking');assert.equal(checkoutTotal(h),total);
    const choices=[...form.querySelectorAll('[name="packageId"]')];assert.equal(choices.length,5);assert.equal(choices.filter(input=>!input.disabled).length,1);
    const summary=form.querySelector('#p-checkout-summary').textContent;for(const part of parts)assert.ok(summary.includes(part),`${count}: ${part}`);
    assert.equal(form.querySelectorAll('.portal-required-label').length,1);
    assert.equal(h.ui.state.selected.size,count,'opening an order must not change its photo selection');
  }
});

test('mandatory booking rejects too few photos and cannot be bypassed by manipulating another package radio',async t=>{
  const h=await checkoutHarness(t,{count:4,packages:bookingOffers(),requiredPackageId:'booking'});await h.action('checkout');const form=acceptCheckout(h);
  assert.ok([...form.querySelectorAll('[name="packageId"]')].every(input=>input.disabled));assert.equal(form.querySelector('button[type="submit"]').disabled,true);assert.equal(form.querySelector('[data-checkout-total]'),null);
  assert.match(form.querySelector('[value="booking"]').closest('label').textContent,/Noch 1/);
  const bypass=form.querySelector('[value="single"]');bypass.disabled=false;bypass.checked=true;await h.ui.onSubmit({target:form,preventDefault(){}});
  assert.equal(h.requests.filter(request=>request.path==='/api/orders'&&request.method==='POST').length,0);
  assert.equal(form.querySelector('button[type="submit"]').disabled,true);
});

test('all-photo required booking remains unavailable until the entire actual gallery is selected',async t=>{
  const packages=checkoutOffers().map(pkg=>({...pkg,isRequired:pkg.id==='all'}));
  const h=await checkoutHarness(t,{count:7,total:8,packages,requiredPackageId:'all'});await h.action('checkout');assert.ok([...checkoutForm(h).querySelectorAll('[name="packageId"]')].every(input=>input.disabled));
  await h.action('close-dialog');h.ui.state.selected=new h.window.Set(h.detail.images.map(image=>image.id));await h.action('checkout');
  assert.equal(checkoutForm(h).querySelector('[name="packageId"]:checked').value,'all');assert.equal(checkoutTotal(h),25000);
  assert.equal(checkoutForm(h).querySelectorAll('[name="packageId"]:not(:disabled)').length,1);
  await h.ui.onSubmit({target:acceptCheckout(h),preventDefault(){}});
  assert.deepEqual(h.requests.find(request=>request.path==='/api/orders'&&request.method==='POST').body,{galleryId:'g',all:true,packageId:'all',expectedAmountCents:25000,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de'});
});

test('after the booking is paid additional orders use only the cheapest extra packages without charging the base again',async t=>{
  const h=await checkoutHarness(t,{count:12,packages:bookingOffers(),requiredPackageId:'booking',requiredPackagePaid:true});await h.action('checkout');const form=checkoutForm(h);
  assert.equal(form.querySelector('[value="booking"]').disabled,true);assert.match(form.querySelector('[value="booking"]').closest('label').textContent,/bereits bezahlt/i);
  assert.equal(form.querySelector('[name="packageId"]:checked').value,'ten');assert.equal(checkoutTotal(h),13000);assert.doesNotMatch(form.querySelector('#p-checkout-summary').textContent,/Gebuchtes Shooting/);
  await h.ui.onSubmit({target:acceptCheckout(h),preventDefault(){}});const posted=h.requests.find(request=>request.path==='/api/orders'&&request.method==='POST');assert.equal(posted.body.packageId,'ten');assert.equal(posted.body.expectedAmountCents,13000);assert.equal(posted.body.imageIds.length,12);
});

test('fixed numeric booking remains selectable in gallery pricing mode and submits its actual photo selection',async t=>{
  for(const [paid,expected,packageId]of[[false,23000,'booking'],[true,9000,'five']]){
    const h=await checkoutHarness(t,{count:7,pricingMode:'gallery',packages:bookingOffers(),requiredPackageId:'booking',requiredPackagePaid:paid});
    assert.ok(h.window.document.querySelector('[data-action="checkout"]'));await h.action('checkout');const form=checkoutForm(h);assert.equal(form.querySelectorAll('[name="packageId"]').length,5);assert.equal(checkoutTotal(h),expected);
    await h.ui.onSubmit({target:acceptCheckout(h),preventDefault(){}});const posted=h.requests.find(request=>request.path==='/api/orders'&&request.method==='POST');assert.equal(posted.body.packageId,packageId);assert.equal(posted.body.expectedAmountCents,expected);assert.equal(posted.body.imageIds.length,7);assert.equal(posted.body.all,undefined);
  }
});

test('required booking messages and prices are translated consistently in all portal languages',async t=>{
  for(const lang of['de','en','bs']){
    const h=await checkoutHarness(t,{count:7,packages:bookingOffers(),requiredPackageId:'booking',lang});await h.action('checkout');assert.equal(checkoutTotal(h),23000);assert.doesNotMatch(checkoutForm(h).closest('.portal-modal-copy').textContent,/packageRequired|checkoutSummary/);
  }
});

test('gallery deletion uses two deliberate dialog steps and both cancel paths leave gallery and photos untouched',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  const initialImages=h.detail.images.map(image=>image.id);
  await h.action('delete-gallery');assert.match(h.window.document.querySelector('dialog').textContent,/Bestätigung 1 von 2/);assert.equal(h.window.document.querySelector('#portal-delete-gallery'),null);
  assert.equal(h.requests.some(request=>request.method==='DELETE'),false);
  await h.action('close-dialog');assert.equal(h.window.document.querySelector('dialog'),null);assert.equal(h.ui.state.adminDetail.gallery.id,'g');
  await h.action('delete-gallery');await h.action('delete-gallery-confirm');
  assert.match(h.window.document.querySelector('dialog').textContent,/Bestätigung 2 von 2/);assert.ok(h.window.document.querySelector('#portal-delete-gallery'));await h.action('close-dialog');
  assert.equal(h.requests.some(request=>request.method==='DELETE'),false);assert.deepEqual(h.detail.images.map(image=>image.id),initialImages);assert.equal(h.ui.state.adminDetail.gallery.id,'g');
});

test('gallery deletion requires the exact gallery name before sending the confirmed DELETE once',async t=>{
  const h=await adminHarness({url:'https://portal.test/galerie/?gallery=g'});t.after(()=>h.dom.window.close());h.ui.state.adminSelection.add('a');
  await h.action('delete-gallery');await h.action('delete-gallery-confirm');
  const form=h.window.document.querySelector('#portal-delete-gallery'),button=form.querySelector('button[type="submit"]');assert.equal(button.disabled,true);
  for(const value of['Famil','familie','Familie ']){h.change('#portal-delete-gallery [name="confirmName"]',value);assert.equal(button.disabled,true,value);}
  await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(h.requests.some(request=>request.method==='DELETE'),false);assert.equal(button.disabled,true,'failed form submission must retain the exact-name gate');
  h.change('#portal-delete-gallery [name="confirmName"]','Familie');assert.equal(button.disabled,false);
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const deleted=h.requests.filter(request=>request.method==='DELETE');assert.equal(deleted.length,1);assert.equal(deleted[0].path,'/api/admin/galleries/g');assert.deepEqual(deleted[0].body,{confirmed:true,confirmName:'Familie'});
  assert.equal(h.ui.state.adminDetail,null);assert.equal(h.ui.state.adminGalleryId,null);assert.equal(h.ui.state.adminSelection.size,0);assert.equal(h.ui.state.adminGalleries.length,0);assert.equal(new URL(h.window.location.href).searchParams.has('gallery'),false);assert.match(h.window.document.querySelector('#portal-toast').textContent,/gelöscht/);
});

test('unfinished gallery file deletion can be retried for its exact target from the overview without an active gallery',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.pendingDeletions=[{id:'deleted-gallery',name:'Alte Familie'}];await h.ui.loadAdmin(null);
  assert.equal(h.ui.state.adminDetail,null);assert.equal(h.ui.state.adminGalleryId,null);
  await h.action('retry-gallery-delete',{id:'deleted-gallery'});assert.match(h.window.document.querySelector('dialog').textContent,/Alte Familie/);await h.action('delete-gallery-confirm');
  const form=h.window.document.querySelector('#portal-delete-gallery');assert.equal(form.dataset.id,'deleted-gallery');
  h.change('#portal-delete-gallery [name="confirmName"]','Familie');assert.equal(form.querySelector('button[type="submit"]').disabled,true);
  h.change('#portal-delete-gallery [name="confirmName"]','Alte Familie');await h.ui.onSubmit({target:form,preventDefault(){}});
  const deleted=h.requests.filter(request=>request.method==='DELETE');assert.equal(deleted.length,1);assert.equal(deleted[0].path,'/api/admin/galleries/deleted-gallery');assert.deepEqual(deleted[0].body,{confirmed:true,confirmName:'Alte Familie'});
  assert.equal(h.ui.state.pendingDeletions.length,0);assert.equal(h.ui.state.adminGalleries[0].id,'g','unrelated active gallery remains listed');
});

test('required booking summary separates package names and fixed price columns with narrow-phone layout rules',async t=>{
  const offers=bookingOffers();offers[0].name='Reserviertes Familien-Shooting mit persönlicher Bildauswahl';
  const h=await checkoutHarness(t,{count:17,total:30,packages:offers,requiredPackageId:'booking'});await h.action('checkout');const form=checkoutForm(h);
  const lines=[...form.querySelectorAll('#p-checkout-summary > div:not(.portal-checkout-total)')];assert.equal(lines.length,3);assert.match(lines[0].querySelector('span').textContent,/Reserviertes Familien-Shooting/);assert.ok(lines.every(line=>line.querySelector(':scope > span')&&line.querySelector(':scope > strong')));
  assert.match(css,/\.portal-checkout-summary>div>span\{[^}]*min-width:0[^}]*overflow-wrap:break-word/);
  assert.match(css,/\.portal-checkout-summary>div>strong\{[^}]*flex:none[^}]*white-space:nowrap/);
  assert.match(css,/@media\(max-width:480px\)\{\.portal-package-options \.portal-package\{grid-template-columns:18px minmax\(0,1fr\)/);
  assert.match(css,/\.portal-package-options \.portal-package-price\{grid-column:2;text-align:left/);
});

test('duplicate booking and paid-processing API errors explain the next step in each selected language',async t=>{
  for(const lang of['de','en','bs'])for(const [code,key]of[['required_package_pending','packageRequiredPending'],['required_package_processing','packageRequiredProcessing']]){
    const h=await checkoutHarness(t,{count:7,packages:bookingOffers(),requiredPackageId:'booking',lang});await h.action('checkout');
    h.orderHandler=async()=>({ok:false,status:409,json:async()=>({code,error:'Server-side German text'})});
    const form=acceptCheckout(h);await h.ui.onSubmit({target:form,preventDefault(){}});
    assert.equal(form.querySelector('.portal-form-message').textContent,h.window.portalTranslations[lang][key]);assert.doesNotMatch(form.textContent,/Server-side German text/);
    assert.equal(h.requests.filter(request=>request.path==='/api/orders'&&request.method==='POST').length,1);assert.equal(form.hasAttribute('aria-busy'),false);assert.equal(checkoutTotal(h),23000);
  }
});


function mockPreviewCanvas(h){
  h.window.createImageBitmap=async()=>({width:2400,height:1600,close(){}});
  h.window.HTMLCanvasElement.prototype.getContext=function(){return{drawImage(){},measureText(text){return{width:text.length*20};},save(){},restore(){},translate(){},rotate(){},strokeText(){},fillText(){}};};
  h.window.HTMLCanvasElement.prototype.toBlob=function(callback,type){callback(new h.window.Blob(['preview'],{type}));};
}
function selectAdminPhoto(h,id){const input=h.window.document.querySelector(`[data-admin-image="${id}"]`);input.checked=true;h.ui.onChange({target:input});}

test('admin revocation targets the selected customer and photos and allows cancelling the confirmation',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.detail.imageControlsReady=true;h.detail.downloadAccess={releases:[{userId:'u1',imageId:'a'},{userId:'u2',imageId:'b'}],blocks:[{userId:'u1',imageId:'b'}]};h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  const button=h.window.document.querySelector('[data-action="admin-revoke-release"]');assert.equal(button.disabled,true);
  selectAdminPhoto(h,'b');assert.equal(button.disabled,true);h.change('#p-release-user','u1');assert.equal(button.disabled,false);
  assert.match(h.window.document.querySelector('[data-download-status="a"]').textContent,/freigegeben/);
  assert.match(h.window.document.querySelector('[data-download-status="b"]').textContent,/gesperrt/);
  h.change('#p-release-user','u2');assert.match(h.window.document.querySelector('[data-download-status="b"]').textContent,/freigegeben/);
  h.confirmResult=false;await h.action('admin-revoke-release');assert.equal(h.requests.some(r=>r.method==='DELETE'),false);
  h.confirmResult=true;await h.action('admin-revoke-release');
  assert.deepEqual(h.requests.find(r=>r.method==='DELETE').body,{userId:'u2',imageIds:['b']});assert.equal(h.ui.state.adminSelection.size,0);
});

test('revoke all posts all:true and unavailable migration keeps the revoke control disabled',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.change('#p-release-user','u1');for(const id of ['a','b','c'])selectAdminPhoto(h,id);
  await h.action('admin-revoke-release');assert.deepEqual(h.requests.find(r=>r.method==='DELETE').body,{userId:'u1',all:true});
  h.detail.imageControlsReady=false;h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();selectAdminPhoto(h,'a');h.change('#p-release-user','u1');
  assert.equal(h.window.document.querySelector('[data-action="admin-revoke-release"]').disabled,true);
  const before=h.requests.length;await h.action('admin-revoke-release');assert.equal(h.requests.length,before);
});

test('individual watermark selector saves off and inherit without changing another image or requiring original download',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail.imageControlsReady=true;h.detail.previewSettings={enabled:true,fingerprint:'fp'};
  h.detail.images=h.detail.images.map(image=>({...image,watermarkOverride:'inherit',watermarkEnabled:true,protectedPreviewReady:true}));h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  selectAdminPhoto(h,'a');h.change('#p-release-user','u1');
  await h.action('admin-image',{id:'a'});let form=h.window.document.querySelector('#portal-rename-image');
  assert.deepEqual([...form.elements.watermarkOverride.options].map(o=>o.value),['inherit','on','off']);form.elements.watermarkOverride.value='off';
  await h.ui.onSubmit({target:form,preventDefault(){}});
  assert.equal(h.detail.images[0].watermarkOverride,'off');assert.equal(h.detail.images[1].watermarkOverride,'inherit');
  assert.equal(h.window.document.querySelector('[data-action="admin-revoke-release"]').disabled,false);assert.equal(h.window.document.querySelector('[data-download-status="a"]').hidden,false);
  assert.equal(h.requests.some(r=>r.path.includes('kind=original')),false);
  assert.match(h.window.document.querySelector('[data-admin-thumb="a"] .portal-watermark-status').textContent,/Wasserzeichen aus/);
  await h.action('admin-image',{id:'a'});form=h.window.document.querySelector('#portal-rename-image');form.elements.watermarkOverride.value='inherit';
  await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(h.detail.images[0].watermarkOverride,'inherit');
});

test('enabling a missing image watermark prepares its protected preview before activating the override',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());mockPreviewCanvas(h);h.detail.imageControlsReady=true;h.detail.previewSettings={enabled:false,text:'LiZa',size:36,opacity:.4,position:'center',fingerprint:'fp'};
  h.detail.images[0].watermarkOverride='inherit';h.detail.images[0].protectedPreviewReady=false;h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  await h.action('admin-image',{id:'a'});const form=h.window.document.querySelector('#portal-rename-image');form.elements.watermarkOverride.value='on';
  await h.ui.onSubmit({target:form,preventDefault(){}});
  const upload=h.requests.findIndex(r=>r.path==='/api/admin/galleries/g/images/a/previews');const patch=h.requests.findIndex(r=>r.path==='/api/admin/galleries/g/images/a'&&r.method==='PATCH');
  assert.ok(upload>=0&&patch>upload);assert.ok(h.requests[upload].body.get('protectedPreview'));assert.equal(h.requests[upload].body.get('watermarkFingerprint'),'fp');
  assert.equal(h.requests[upload].body.has('original'),false);assert.equal(h.detail.images[0].watermarkOverride,'on');assert.equal(h.ui.state.adminBusy,false);
});

test('failed watermark preparation leaves the previous image mode intact and does not submit a settings patch',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail.previewSettings={enabled:false};h.detail.imageControlsReady=true;h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  const fetch=h.window.fetch;h.window.fetch=async(path,options)=>path.includes('kind=original')?{ok:false,status:404}:fetch(path,options);
  await h.action('admin-image',{id:'a'});const form=h.window.document.querySelector('#portal-rename-image');form.elements.watermarkOverride.value='on';
  await h.ui.onSubmit({target:form,preventDefault(){}});
  assert.equal(h.requests.some(r=>r.method==='PATCH'&&r.path.endsWith('/images/a')),false);assert.ok(form.querySelector('.portal-form-message.error'));assert.equal(h.ui.state.adminBusy,false);
});

test('whole-gallery preview regeneration respects individual on/off overrides and reports exceptions under gallery off',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());mockPreviewCanvas(h);h.detail.previewSettings={enabled:false,text:'LiZa',size:36,opacity:.4,position:'center',fingerprint:'fp'};
  h.detail.images=h.detail.images.map((image,index)=>({...image,watermarkOverride:index===0?'on':index===1?'off':'inherit',watermarkEnabled:index===0,protectedPreviewReady:false}));h.ui.acceptAdminDetail(h.detail);h.ui.renderAdmin();
  assert.ok(h.window.document.querySelector('.portal-preview-maintenance.needs-update'));
  await h.action('regenerate-previews');const uploads=h.requests.filter(r=>r.path.endsWith('/previews'));
  assert.equal(uploads.length,3);assert.deepEqual(uploads.map(r=>Boolean(r.body.get('protectedPreview'))),[true,false,false]);
});


test('paid order badges distinguish partial and complete download revocation without altering payment state',async t=>{
  const h=harness();t.after(()=>h.dom.window.close());const base={id:'o',status:'paid',receiptSent:true,imageIds:['a','b'],amountCents:2500,currency:'EUR',createdAt:'2026-10-11'};
  assert.match(h.ui.ordersHtml([{...base,downloadBlockedCount:1}]),/Downloads teilweise gesperrt/);
  assert.match(h.ui.ordersHtml([{...base,downloadBlockedCount:2}]),/Downloads gesperrt/);
  assert.doesNotMatch(h.ui.ordersHtml([{...base,downloadBlockedCount:0}]),/gesperrt/);
});


test('administrators can deliberately cancel only displayed pending transfer orders without sending a customer email',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());
  h.orders=[{id:'open',galleryId:'g',galleryName:'Familie',packageName:'Buchung',amountCents:20000,currency:'EUR',status:'pending',paymentMethod:'transfer',createdAt:'2026-10-12T10:00:00Z',imageIds:['a']},{id:'paid',status:'paid',paymentMethod:'transfer',amountCents:100,currency:'EUR',imageIds:[],receiptSent:true},{id:'online',status:'pending',paymentMethod:'stripe',amountCents:100,currency:'EUR',imageIds:[]}];
  await h.action('admin-tab',{tab:'orders'});
  assert.equal(h.window.document.querySelectorAll('[data-action="cancel-pending-order"]').length,1);
  h.confirmResult=false;await h.action('cancel-pending-order',{id:'open'});assert.equal(h.requests.some(r=>r.path.endsWith('/cancel')),false);
  h.confirmResult=true;await h.action('cancel-pending-order',{id:'open'});
  const sent=h.requests.find(r=>r.path.endsWith('/cancel'));assert.equal(sent.path,'/api/admin/orders/open/cancel');assert.deepEqual(sent.body,{confirmed:true});
});

const uiResponse=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
const testOrderFixture=(overrides={})=>({id:'test-o',reference:'LZ-TEST123',galleryId:'g',galleryName:'Familie',packageName:'Testpaket',amountCents:100,currency:'EUR',status:'paid',paymentMethod:'transfer',receiptSent:true,createdAt:'2026-10-12T10:00:00Z',imageIds:['a'],...overrides});
async function submitTestOrderAcknowledgement(h){
  const form=h.window.document.querySelector('#portal-delete-test-order-check');form.elements.testOrder.checked=true;h.ui.onChange({target:form.elements.testOrder});await h.ui.onSubmit({target:form,preventDefault(){}});
}

test('marking activities read uses the initial server cutoff despite clock skew, load more and polling',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());let marked=false;const cutoff=1791541800000;
  h.requestHandler=(path,options,body)=>{
    if(path==='/api/admin/activity/read'){assert.deepEqual(body,{readThrough:cutoff});marked=true;return uiResponse({ok:true});}
    if(path.startsWith('/api/admin/activity'))return uiResponse({activities:[{id:marked?'new':'old',kind:'download',galleryId:'g',galleryName:'Familie',createdAt:'2026-10-09T10:30:00Z',read:false}],unreadCount:marked?1:2,readThrough:path.includes('?')?cutoff+9000:marked?cutoff+20000:cutoff,nextCursor:!path.includes('?')&&!marked?'page2':null});
  };
  await h.action('admin-tab',{tab:'activity'});h.window.Date.now=()=>cutoff+999999999;
  await h.action('activity-more');assert.equal(h.ui.state.adminActivityReadThrough,cutoff);
  await h.ui.pollStudioActivity();assert.equal(h.ui.state.adminActivityReadThrough,cutoff);
  await h.action('activity-read');assert.equal(h.ui.state.adminUnread,1);assert.equal(h.ui.state.adminActivities[0].id,'new');assert.equal(h.ui.state.adminActivityReadThrough,cutoff+20000);assert.equal(h.ui.state.adminBusy,false);
});

test('activity read errors remain localized and retryable without altering the server snapshot',async t=>{
  for(const lang of ['de','en','bs']){
    const h=await adminHarness({lang});t.after(()=>h.dom.window.close());await h.action('admin-tab',{tab:'activity'});
    let attempts=0;h.requestHandler=path=>path==='/api/admin/activity/read'?uiResponse({error:'invalid_activity_cutoff'},++attempts===1?400:200):null;
    await h.action('activity-read');assert.equal(h.ui.state.adminActivityReadThrough,1791541800000);assert.equal(h.ui.state.adminBusy,false);assert.equal(h.window.document.querySelector('[data-action="activity-read"]').disabled,false);assert.equal(h.window.document.querySelector('#portal-toast').textContent,h.window.portalTranslations[lang].activityReadInvalid);
    await h.action('activity-read');assert.equal(attempts,2);assert.equal(h.window.document.querySelector('#portal-toast').textContent,h.window.portalTranslations[lang].activityReadSaved);
  }
});

test('package arrows persist the entire sequence, preserve edits and show the same customer order without changing cheapest prices',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail={...h.detail,packages:checkoutOffers(),images:Array.from({length:20},(_,i)=>({id:'pic'+i,title:'Foto '+i,previewUrl:'/pic'+i,width:1200,height:800}))};await h.ui.loadAdmin('g');await h.action('editor-panel',{panel:'packages'});
  const draft=h.window.document.querySelector('#portal-gallery-settings [name="name"]');draft.value='Noch nicht gespeichert';
  assert.equal(h.window.document.querySelector('[data-action="admin-move-package"][data-id="all"][data-direction="up"]').disabled,true);assert.equal(h.window.document.querySelector('[data-action="admin-move-package"][data-id="ten"][data-direction="down"]').disabled,true);
  await h.action('admin-move-package',{id:'ten',direction:'up'});
  assert.deepEqual(h.requests.find(r=>r.path.endsWith('/packages/order')).body,{packageIds:['all','single','ten','five']});assert.equal(h.ui.state.adminPanel,'packages');assert.equal(draft.isConnected,true);assert.equal(draft.value,'Noch nicht gespeichert');assert.equal(h.window.document.activeElement.dataset.id,'ten');assert.equal(h.window.document.activeElement.dataset.direction,'up');
  await h.action('admin-move-package',{id:'all',direction:'down'});assert.deepEqual([...h.window.document.querySelectorAll('[data-package-id]')].map(row=>row.dataset.packageId),['single','all','ten','five']);
  await h.action('toggle-admin');h.ui.state.selected=new h.window.Set(h.detail.images.slice(0,12).map(i=>i.id));h.ui.renderGallery();await h.action('checkout');
  assert.deepEqual([...checkoutForm(h).querySelectorAll('[name="packageId"]')].map(input=>input.value),['single','all','ten','five']);assert.equal(checkoutTotal(h),13000);assert.equal(checkoutForm(h).querySelector('[name="packageId"]:checked').value,'ten');
});

test('package reorder failures retain the previous order and disable duplicate requests until a retry',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail={...h.detail,packages:checkoutOffers()};await h.ui.loadAdmin('g');let release,attempts=0;
  h.requestHandler=path=>path.endsWith('/packages/order')&&++attempts===1?new Promise(resolve=>{release=()=>resolve(uiResponse({error:'package_set_changed'},409));}):null;
  const pending=h.action('admin-move-package',{id:'five',direction:'up'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.ui.state.adminBusy,true);assert.ok([...h.window.document.querySelectorAll('[data-action="admin-move-package"]')].every(button=>button.disabled));await h.action('admin-move-package',{id:'five',direction:'up'});assert.equal(attempts,1);
  release();await pending;assert.equal(h.ui.state.adminBusy,false);assert.deepEqual([...h.ui.state.adminDetail.packages].map(p=>p.id),['all','single','five','ten']);assert.equal(h.window.document.querySelector('#portal-toast').textContent,h.window.portalTranslations.de.packageOrderChanged);
  await h.action('admin-move-package',{id:'five',direction:'up'});assert.equal(attempts,2);assert.deepEqual(h.detail.packages.map(p=>p.id),['all','five','single','ten']);
  h.detail.packageOrderReady=false;await h.ui.loadAdmin('g');assert.ok([...h.window.document.querySelectorAll('[data-action="admin-move-package"]')].every(button=>button.disabled));assert.match(h.window.document.querySelector('[data-editor-panel="packages"]').textContent,/Datenbank-Update/);
});

test('test order deletion supports transfer statuses, requires two confirmations and leaves both cancel paths unchanged',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.orders=['pending','cancelled','paid'].map(status=>testOrderFixture({id:status,status})).concat([testOrderFixture({id:'online',paymentMethod:'stripe'}),testOrderFixture({id:'provider-linked',canDeleteTest:false})]);await h.action('admin-tab',{tab:'orders'});
  const buttons=[...h.window.document.querySelectorAll('[data-action="delete-test-order"]')];assert.deepEqual(buttons.filter(b=>!b.disabled).map(b=>b.dataset.id),['pending','cancelled','paid']);assert.equal(buttons.find(b=>b.dataset.id==='provider-linked').disabled,true);
  await h.action('delete-test-order',{id:'paid'});let form=h.window.document.querySelector('#portal-delete-test-order-check');assert.equal(form.querySelector('button[type=submit]').disabled,true);await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(h.window.document.querySelector('#portal-delete-test-order'),null);await h.action('close-dialog');
  await h.action('delete-test-order',{id:'paid'});await submitTestOrderAcknowledgement(h);assert.match(h.window.document.querySelector('dialog').textContent,/Bestätigung 2 von 2/);await h.action('close-dialog');assert.equal(h.requests.some(r=>r.method==='DELETE'),false);assert.equal(h.ui.state.adminOrders.length,5);
});

test('test order deletion submits its exact reference once and removes it from customer and administrator state',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.orders=[testOrderFixture()];h.ui.state.orders=[testOrderFixture()];await h.action('admin-tab',{tab:'orders'});await h.action('delete-test-order',{id:'test-o'});await submitTestOrderAcknowledgement(h);
  const form=h.window.document.querySelector('#portal-delete-test-order'),button=form.querySelector('button[type=submit]');assert.equal(h.window.document.activeElement,form.elements.confirmReference);
  for(const value of ['test-o','lz-test123','LZ-TEST123 ']){h.change('#portal-delete-test-order [name="confirmReference"]',value);assert.equal(button.disabled,true);}
  await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(button.disabled,true);assert.equal(h.requests.some(r=>r.method==='DELETE'),false);
  h.change('#portal-delete-test-order [name="confirmReference"]','LZ-TEST123');await h.ui.onSubmit({target:form,preventDefault(){}});
  const requests=h.requests.filter(r=>r.method==='DELETE');assert.equal(requests.length,1);assert.equal(requests[0].path,'/api/admin/orders/test-o');assert.deepEqual(requests[0].body,{confirmed:true,confirmReference:'LZ-TEST123',testOrder:true});assert.equal(h.ui.state.adminOrders.length,0);assert.equal(h.ui.state.orders.length,0);assert.equal(h.ui.state.adminBusy,false);assert.equal(h.window.document.querySelector('dialog'),null);
});

test('failed test order deletion preserves confirmation, busy gates and exact-name validation before retry',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());h.orders=[testOrderFixture({reference:null,id:'legacy-uuid'})];await h.action('admin-tab',{tab:'orders'});await h.action('delete-test-order',{id:'legacy-uuid'});await submitTestOrderAcknowledgement(h);
  const form=h.window.document.querySelector('#portal-delete-test-order'),button=form.querySelector('button[type=submit]');h.change('#portal-delete-test-order [name="confirmReference"]','legacy-uuid');let release,attempts=0;
  h.requestHandler=(path,options)=>options.method==='DELETE'&&++attempts===1?new Promise(resolve=>{release=()=>resolve(uiResponse({error:'order_cannot_delete'},409));}):null;
  const pending=h.ui.onSubmit({target:form,preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));assert.equal(button.disabled,true);await h.action('close-dialog');assert.equal(form.isConnected,true);
  const escape=new h.window.Event('cancel',{cancelable:true});form.closest('dialog').dispatchEvent(escape);assert.equal(escape.defaultPrevented,true);
  h.change('#portal-delete-test-order [name="confirmReference"]','wrong');release();await pending;assert.equal(button.disabled,true);assert.equal(h.ui.state.adminBusy,false);assert.equal(form.querySelector('.portal-form-message').textContent,h.window.portalTranslations.de.deleteTestOrderUnavailable);
  h.change('#portal-delete-test-order [name="confirmReference"]','legacy-uuid');await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(attempts,2);assert.equal(h.ui.state.adminOrders.length,0);
});

test('missing test order migration disables deletion and all new management labels are translated',async t=>{
  for(const lang of ['de','en','bs']){
    const h=await adminHarness({lang});t.after(()=>h.dom.window.close());h.orders=[testOrderFixture()];h.testOrderDeletionReady=false;await h.action('admin-tab',{tab:'orders'});
    assert.equal(h.window.document.querySelector('[data-action="delete-test-order"]').disabled,true);assert.equal(h.window.document.querySelector('.portal-admin-orders .portal-message').textContent,h.window.portalTranslations[lang].deleteTestOrderMigration);
    h.testOrderDeletionReady=true;await h.ui.loadAdmin();await h.action('delete-test-order',{id:'test-o'});await submitTestOrderAcknowledgement(h);assert.doesNotMatch(h.window.document.querySelector('dialog').textContent,/deleteTestOrder|orderReference|deleteGalleryStep/);
  }
});

async function finalDeliveryHarness(t,options={}){
  const h=await adminHarness(options);t.after(()=>h.dom.window.close());mockPreviewCanvas(h);h.detail={...h.detail,gallery:{...h.detail.gallery,requireFinalDelivery:true},previewSettings:{enabled:true,text:'LiZa',size:36,opacity:.4,position:'center',fingerprint:'fp'},images:h.detail.images.map(image=>({...image,sourceFilename:image.title+'.jpg',finalReady:false,watermarkOverride:'inherit'}))};await h.ui.loadAdmin('g');return h;
}
function selectFinalFiles(h,files){const input=h.window.document.querySelector('#portal-final-batch [name="finalFiles"]');Object.defineProperty(input,'files',{value:files,configurable:true});h.ui.onChange({target:input});}
const finishedFile=(h,name)=>new h.window.File(['edited-original'],name,{type:'image/jpeg'});

test('finished delivery is opt-in, saves explicitly and separates proof uploads from final files',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());let form=h.window.document.querySelector('#portal-gallery-settings');assert.equal(form.elements.requireFinalDelivery.checked,false);assert.equal(h.window.document.querySelector('[data-action="upload-final-batch"]'),null);await h.action('final-mode-settings');assert.equal(h.ui.state.adminPanel,'settings');assert.equal(h.window.document.activeElement,form.elements.requireFinalDelivery);
  form.elements.requireFinalDelivery.checked=true;await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(h.requests.find(r=>r.path==='/api/admin/galleries/g'&&r.method==='PATCH').body.requireFinalDelivery,true);
  h.detail.gallery.requireFinalDelivery=true;await h.ui.loadAdmin('g');assert.match(h.window.document.querySelector('#portal-upload-form button[type=submit]').textContent,/Auswahlbilder hochladen/);assert.match(h.window.document.querySelector('[data-action="upload-final-batch"]').textContent,/Fertige Dateien zuordnen/);
  h.detail.finalDeliveryReady=false;await h.ui.loadAdmin('g');assert.equal(h.window.document.querySelector('[name="requireFinalDelivery"]').disabled,true);assert.equal(h.window.document.querySelector('[data-action="upload-final-batch"]').disabled,true);
});

test('dragging 135 finished files matches original filenames despite renamed titles and requires just one upload confirmation',async t=>{
  const h=await finalDeliveryHarness(t);h.detail.images=Array.from({length:135},(_,index)=>({id:'image-'+index,title:'Umbenannt '+index,sourceFilename:'DSC'+String(index).padStart(5,'0')+'.jpg',previewUrl:'/proof-'+index,width:1200,height:800,finalReady:false}));await h.ui.loadAdmin('g');await h.action('upload-final-batch');
  const files=h.detail.images.map(image=>finishedFile(h,image.sourceFilename)),drop=new h.window.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(drop,'dataTransfer',{value:{files}});h.window.document.querySelector('#p-final-drop').dispatchEvent(drop);
  const form=h.window.document.querySelector('#portal-final-batch');assert.equal(form.querySelectorAll('.portal-final-review li').length,135);assert.equal(form.querySelectorAll('[data-final-mapping]').length,0,'ordinary matching needs no manual selects');assert.equal(form.querySelector('button[type=submit]').disabled,false);assert.equal(h.requests.some(r=>r.path.endsWith('/final')),false);
  await h.ui.onSubmit({target:form,preventDefault(){}});const requests=h.requests.filter(r=>r.path.endsWith('/final'));assert.equal(requests.length,135);assert.deepEqual(requests.map(r=>r.path),h.detail.images.map(image=>'/api/admin/galleries/g/images/'+image.id+'/final'));assert.ok(requests.every(r=>r.body.get('original')&&r.body.get('preview')&&r.body.get('protectedPreview')));assert.ok(requests.every(r=>!r.body.has('title')));assert.ok(h.detail.images.every(image=>image.finalReady));assert.equal(h.detail.images[0].title,'Umbenannt 0');assert.equal(h.ui.state.adminBusy,false);assert.equal(h.window.document.querySelector('dialog'),null);
});

test('batch review blocks unmatched, ambiguous and duplicate targets until the user assigns them explicitly',async t=>{
  const h=await finalDeliveryHarness(t);h.detail.images[1].sourceFilename=h.detail.images[0].sourceFilename;await h.ui.loadAdmin('g');await h.action('upload-final-batch');selectFinalFiles(h,[finishedFile(h,'unknown.jpg'),finishedFile(h,'IMG_20.jpg')]);const form=h.window.document.querySelector('#portal-final-batch');assert.equal(form.querySelector('button[type=submit]').disabled,true);assert.match(form.textContent,/mehreren Bildern/);assert.equal(h.requests.some(r=>r.path.endsWith('/final')),false);
  h.change('[data-final-mapping="0"]','a');h.change('[data-final-mapping="1"]','a');assert.match(form.textContent,/mehrere Dateien zugeordnet/);assert.equal(form.querySelector('button[type=submit]').disabled,true);
  h.change('[data-final-mapping="1"]','b');assert.equal(form.querySelector('button[type=submit]').disabled,false);await h.ui.onSubmit({target:form,preventDefault(){}});assert.deepEqual(h.requests.filter(r=>r.path.endsWith('/final')).map(r=>r.path),['/api/admin/galleries/g/images/a/final','/api/admin/galleries/g/images/b/final']);
});

test('interrupted batch upload retries only unfinished files and prevents leaving while a file is in flight',async t=>{
  const h=await finalDeliveryHarness(t);await h.action('upload-final-batch');selectFinalFiles(h,h.detail.images.map(image=>finishedFile(h,image.sourceFilename)));const form=h.window.document.querySelector('#portal-final-batch');let release,failed=false;
  h.requestHandler=path=>path==='/api/admin/galleries/g/images/b/final'&&!failed?new Promise(resolve=>{release=()=>{failed=true;resolve(uiResponse({error:'temporary_failure'},503));};}):null;
  const pending=h.ui.onSubmit({target:form,preventDefault(){}});for(let index=0;index<20&&!release;index++)await new Promise(resolve=>setImmediate(resolve));assert.ok(release);assert.equal(h.ui.state.finalBatch.rows[0].done,true);assert.equal(h.ui.state.adminBusy,true);await h.action('close-dialog');assert.equal(form.isConnected,true);release();await pending;
  assert.equal(h.ui.state.adminBusy,false);assert.equal(form.querySelector('button[type=submit]').disabled,false);assert.match(form.querySelector('button[type=submit]').textContent,/Verbleibende/);assert.ok(form.querySelector('.portal-form-message.error'));await h.ui.onSubmit({target:form,preventDefault(){}});
  assert.deepEqual(h.requests.filter(r=>r.path.endsWith('/final')).map(r=>r.path),['/api/admin/galleries/g/images/a/final','/api/admin/galleries/g/images/b/final','/api/admin/galleries/g/images/b/final','/api/admin/galleries/g/images/c/final']);assert.equal(h.ui.state.adminBusy,false);
});

test('individual finished file assignment preserves image identity and uses its actual watermark override',async t=>{
  const h=await finalDeliveryHarness(t);h.detail.images[0].watermarkOverride='off';await h.ui.loadAdmin('g');await h.action('admin-image',{id:'a'});const form=h.window.document.querySelector('#portal-final-single');Object.defineProperty(form.elements.finalFile,'files',{value:[finishedFile(h,'different-export-name.jpg')]});form.reportValidity=()=>true;
  await h.ui.onSubmit({target:form,preventDefault(){}});const request=h.requests.find(r=>r.path.endsWith('/final'));assert.equal(request.path,'/api/admin/galleries/g/images/a/final');assert.equal(request.body.get('original').name,'different-export-name.jpg');assert.equal(request.body.has('protectedPreview'),false);assert.equal(request.body.has('title'),false);assert.equal(h.detail.images[0].title,'IMG_20');assert.equal(h.detail.images[0].finalReady,true);assert.match(h.window.document.querySelector('[data-admin-thumb="a"] .portal-final-status').textContent,/bereit/);
});

test('paid proof orders clearly remain in editing until final files are ready in every language',async t=>{
  for(const lang of ['de','en','bs']){
    const h=await finalDeliveryHarness(t,{lang}),order=testOrderFixture({requireFinalDelivery:true,deliveryPending:true,finalReadyCount:1,finalImageCount:3});h.orders=[order];await h.action('admin-tab',{tab:'orders'});
    assert.ok(h.window.document.querySelector('.portal-order').textContent.includes(h.window.portalTranslations[lang].orderPaidFinalPending));assert.ok(h.window.document.querySelector('.portal-order').textContent.includes(h.window.portalTranslations[lang].finalFilesCount.replace('{n}','1').replace('{total}','3')));
    assert.ok(h.ui.ordersHtml([order]).includes(h.window.portalTranslations[lang].orderPaidFinalPending));assert.ok(!h.ui.ordersHtml([order]).includes(h.window.portalTranslations[lang].orderPaid));
    h.ui.showBank({...order,status:'pending'});assert.ok(h.window.document.querySelector('dialog').textContent.includes(h.window.portalTranslations[lang].transferFinalInstruction));
  }
});

test('manual release of unfinished proofs reports saved permission rather than available downloads',async t=>{
  for(const lang of ['de','en','bs']){
    const h=await finalDeliveryHarness(t,{lang});h.detail.images[0].finalReady=true;await h.ui.loadAdmin('g');selectAdminPhoto(h,'a');selectAdminPhoto(h,'b');h.change('#p-release-user','u1');
    await h.action('admin-release');assert.deepEqual(h.requests.find(r=>r.path==='/api/admin/galleries/g/release').body,{userId:'u1',imageIds:['a','b']});assert.equal(h.ui.state.adminSelection.size,0);
    assert.equal(h.window.document.querySelector('#portal-toast').textContent,h.window.portalTranslations[lang].releaseAwaitingFinal);
    h.requestHandler=path=>path==='/api/admin/galleries/g/release'?uiResponse({ok:true,notification:{status:'sent'}}):null;
    selectAdminPhoto(h,'a');h.change('#p-release-user','u1');await h.action('admin-release');assert.equal(h.window.document.querySelector('#portal-toast').textContent,h.window.portalTranslations[lang].releaseSuccess);
  }
});

test('turning final delivery protection off requires explicit confirmation when proofs are unfinished',async t=>{
  for(const lang of ['de','en','bs']){
    const h=await finalDeliveryHarness(t,{lang}),form=h.window.document.querySelector('#portal-gallery-settings');let confirmations=0,allow=false;
    h.window.confirm=message=>{confirmations++;assert.equal(message,h.window.portalTranslations[lang].finalModeDisableConfirm);return allow;};
    form.elements.requireFinalDelivery.checked=false;await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(form.elements.requireFinalDelivery.checked,true);assert.equal(h.requests.some(r=>r.path==='/api/admin/galleries/g'&&r.method==='PATCH'),false);assert.equal(confirmations,1);
    allow=true;form.elements.requireFinalDelivery.checked=false;await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(h.requests.find(r=>r.path==='/api/admin/galleries/g'&&r.method==='PATCH').body.requireFinalDelivery,false);assert.equal(confirmations,2);
  }
});

test('saving final delivery normally or disabling it after every final is ready adds no confirmation',async t=>{
  const h=await finalDeliveryHarness(t);h.window.confirm=()=>{assert.fail('No confirmation is necessary for these saves');};let form=h.window.document.querySelector('#portal-gallery-settings');await h.ui.onSubmit({target:form,preventDefault(){}});
  h.detail.images.forEach(image=>image.finalReady=true);await h.ui.loadAdmin('g');form=h.window.document.querySelector('#portal-gallery-settings');form.elements.requireFinalDelivery.checked=false;await h.ui.onSubmit({target:form,preventDefault(){}});assert.equal(h.requests.filter(r=>r.path==='/api/admin/galleries/g'&&r.method==='PATCH').at(-1).body.requireFinalDelivery,false);
});

test('normal uploads can explicitly declare already finished images without a second upload or payment request',async t=>{
  for(const finalReady of [false,true]){
    const h=await finalDeliveryHarness(t),form=h.window.document.querySelector('#portal-upload-form');Object.defineProperty(form.elements.photos,'files',{value:[finishedFile(h,'NEW123.jpg')]});form.reportValidity=()=>true;assert.equal(form.elements.finalReady.checked,false);
    form.elements.finalReady.checked=finalReady;h.ui.onChange({target:form.elements.finalReady});assert.equal(form.querySelector('button[type=submit]').textContent,h.window.portalTranslations.de[finalReady?'finalDirectUploadTitle':'finalProofUploadTitle']);await h.ui.onSubmit({target:form,preventDefault(){}});
    const upload=h.requests.find(r=>r.path==='/api/admin/galleries/g/images'&&r.method==='POST');assert.ok(upload);assert.equal(upload.body.get('finalReady'),finalReady?'true':null);assert.equal(upload.body.get('original').name,'NEW123.jpg');assert.ok(upload.body.get('preview'));assert.ok(upload.body.get('protectedPreview'));assert.equal(h.requests.some(r=>r.path.endsWith('/paid')||r.path.endsWith('/final')),false);
  }
});

test('already-finished upload option is absent from normal galleries and disabled without the migration',async t=>{
  const h=await adminHarness();t.after(()=>h.dom.window.close());assert.equal(h.window.document.querySelector('#portal-upload-form [name="finalReady"]'),null);assert.equal(h.window.document.querySelector('[data-action="admin-finalize-images"]'),null);
  h.detail.gallery.requireFinalDelivery=true;h.detail.finalDeliveryReady=false;await h.ui.loadAdmin('g');assert.equal(h.window.document.querySelector('#portal-upload-form [name="finalReady"]').disabled,true);selectAdminPhoto(h,'a');assert.equal(h.window.document.querySelector('[data-action="admin-finalize-images"]').disabled,true);
});

test('existing final originals can be marked together with explicit confirmation and no upload or payment mutation',async t=>{
  for(const lang of ['de','en','bs']){
    const h=await finalDeliveryHarness(t,{lang});assert.equal(h.window.document.querySelector('[data-action="admin-finalize-images"]').disabled,true);selectAdminPhoto(h,'a');selectAdminPhoto(h,'c');assert.equal(h.window.document.querySelector('[data-action="admin-finalize-images"]').disabled,false);
    let confirmed=false;h.window.confirm=message=>{assert.equal(message,h.window.portalTranslations[lang].finalMarkConfirm.replace('{n}','2'));return confirmed;};await h.action('admin-finalize-images');assert.equal(h.requests.some(r=>r.path.endsWith('/finalize')),false);assert.equal(h.ui.state.adminSelection.size,2);
    confirmed=true;await h.action('admin-finalize-images');const request=h.requests.find(r=>r.path.endsWith('/finalize'));assert.equal(request.path,'/api/admin/galleries/g/images/finalize');assert.deepEqual(request.body,{imageIds:['a','c'],confirmed:true});assert.deepEqual(h.detail.images.map(image=>image.finalReady),[true,false,true]);assert.equal(h.ui.state.adminSelection.size,0);assert.equal(h.requests.some(r=>r.path.endsWith('/paid')||r.path.endsWith('/final')),false);assert.equal(h.window.document.querySelector('#portal-toast').textContent,h.window.portalTranslations[lang].finalMarkSaved);
  }
});

test('marking existing finals retains the selection on failure and blocks duplicate requests until retry',async t=>{
  const h=await finalDeliveryHarness(t);selectAdminPhoto(h,'a');let release,attempts=0;h.requestHandler=path=>path.endsWith('/finalize')&&++attempts===1?new Promise(resolve=>{release=()=>resolve(uiResponse({error:'image_changed'},409));}):null;
  const pending=h.action('admin-finalize-images');await new Promise(resolve=>setImmediate(resolve));assert.equal(h.ui.state.adminBusy,true);assert.equal(h.window.document.querySelector('[data-action="admin-finalize-images"]').disabled,true);await h.action('admin-finalize-images');assert.equal(attempts,1);release();await pending;
  assert.equal(h.ui.state.adminBusy,false);assert.deepEqual([...h.ui.state.adminSelection],['a']);assert.equal(h.window.document.querySelector('[data-action="admin-finalize-images"]').disabled,false);await h.action('admin-finalize-images');assert.equal(attempts,2);assert.equal(h.detail.images[0].finalReady,true);
});


test('existing order details show all nine ordered images independent of favourites and highlight the missing final',async t=>{
 const h=await finalDeliveryHarness(t);h.detail.images=Array.from({length:10},(_,i)=>({id:'p'+i,title:'DSC'+i,finalReady:i<8,previewUrl:'/proof/'+i,originalUrl:'/original/'+i,watermarkEnabled:true,protectedPreviewReady:true}));h.orders=[testOrderFixture({galleryId:'g',requireFinalDelivery:true,imageIds:h.detail.images.slice(0,9).map(i=>i.id)})];await h.action('admin-tab',{tab:'orders'});await h.action('admin-order-details',{id:'test-o'});
 const cards=h.window.document.querySelectorAll('.portal-ordered-image');assert.equal(cards.length,9);assert.equal(h.window.document.querySelectorAll('.needs-final').length,1);assert.match(h.window.document.querySelector('.needs-final').textContent,/DSC8/);assert.equal(cards[0].querySelector('img').getAttribute('src'),'/proof/0');assert.equal(cards[8].querySelector('img').getAttribute('src'),'/proof/8?watermark=1');assert.ok(h.window.document.querySelector('a[href="/api/orders/test-o/receipt"]'));assert.equal(h.requests.some(r=>r.method!=='GET'),false);
});
test('bulk final matching ignores extension and case and also accepts a unique visible image title',async t=>{
 const h=await finalDeliveryHarness(t);h.detail.images[0].sourceFilename='old.jpg';h.detail.images[0].title='DSC123';await h.ui.loadAdmin('g');await h.action('upload-final-batch');selectFinalFiles(h,[finishedFile(h,'dsc123.JPG')]);assert.equal(h.ui.state.finalBatch.rows[0].imageId,'a');assert.equal(h.window.document.querySelector('#portal-final-batch button[type=submit]').disabled,false);
});
test('email history uses sandboxed snapshots and checks provider state without sending emails',async t=>{
 const h=await adminHarness();t.after(()=>h.dom.window.close());h.orders=[testOrderFixture()];h.requestHandler=async path=>path.includes('/emails')?{ok:true,status:200,json:async()=>path.includes('?check=')?{status:'delivered'}:{ready:true,messages:[{id:'m',subject:'<script>bad</script>',html:'<b>Snapshot</b>',status:'sent',createdAt:Date.now(),canCheck:true}]}}:null;await h.action('admin-tab',{tab:'orders'});await h.action('admin-order-emails',{id:'test-o'});const frame=h.window.document.querySelector('iframe');assert.equal(frame.getAttribute('sandbox'),'');assert.match(frame.srcdoc,/default-src/);assert.equal(h.window.document.querySelector('dialog script'),null);await h.action('mail-check');assert.match(h.window.document.querySelector('[data-mail-status]').textContent,/Mailserver/);assert.equal(h.requests.some(r=>r.method!=='GET'),false);
});
test('order photo failure remains an error and does not invent a ready status',async t=>{
 const h=await adminHarness();t.after(()=>h.dom.window.close());h.orders=[testOrderFixture({galleryId:'g'})];await h.action('admin-tab',{tab:'orders'});h.requestHandler=async path=>path==='/api/galleries/g'?{ok:false,status:503,json:async()=>({})}:null;await h.action('admin-order-details',{id:'test-o'});assert.equal(h.window.document.querySelectorAll('.portal-ordered-image').length,0);assert.ok(h.window.document.querySelector('[data-order-photos]').textContent.length>3);
});


test('finished admin tiles and opened images use previews; originals are download-only',async t=>{
 const h=await finalDeliveryHarness(t);h.detail.images[0]={...h.detail.images[0],finalReady:true,previewUrl:'/api/images/a?kind=preview',originalUrl:'/api/images/a?kind=original',watermarkEnabled:true,protectedPreviewReady:true};await h.ui.loadAdmin('g');
 assert.equal(h.window.document.querySelector('[data-admin-thumb="a"] img').getAttribute('src'),'/api/images/a?kind=preview');
 assert.equal(h.window.document.querySelectorAll('img[src*="kind=original"]').length,0);
 await h.action('admin-image',{id:'a'});assert.equal(h.window.document.querySelector('.portal-admin-detail-photo').getAttribute('src'),'/api/images/a?kind=preview');
 assert.equal(h.window.document.querySelector('[data-admin-thumb="a"] img').getAttribute('src'),'/api/images/a?kind=preview');
});


test('batch replacement prefers the unique unfinished proof over an accidentally added finished duplicate',async t=>{
 const h=await finalDeliveryHarness(t);h.detail.images[0].sourceFilename='DSC123.jpg';h.detail.images[0].finalReady=false;h.detail.images[1].sourceFilename='DSC123.jpg';h.detail.images[1].finalReady=true;await h.ui.loadAdmin('g');await h.action('upload-final-batch');selectFinalFiles(h,[finishedFile(h,'DSC123.jpg')]);assert.equal(h.ui.state.finalBatch.rows[0].imageId,'a');assert.equal(h.ui.state.finalBatch.rows[0].ambiguous,false);
});
test('admin access filters distinguish customer grants from administrator original access and select only visible photos',async t=>{
 const h=await adminHarness();t.after(()=>h.dom.window.close());h.detail.images.forEach(i=>i.downloadAllowed=true);h.detail.downloadAccess={releases:[{userId:'u1',imageId:'a'},{userId:'u2',imageId:'b'}]};h.orders=[testOrderFixture({userId:'u1',status:'paid',imageIds:['c']})];await h.ui.loadAdmin('g');h.change('#p-admin-access-user','u1');h.change('#p-admin-access-filter','downloads');assert.deepEqual([...h.window.document.querySelectorAll('[data-admin-thumb]')].map(n=>n.dataset.adminThumb),['a']);await h.action('admin-select-all');assert.deepEqual([...h.ui.state.adminSelection],['a']);h.change('#p-admin-access-filter','paid');assert.deepEqual([...h.window.document.querySelectorAll('[data-admin-thumb]')].map(n=>n.dataset.adminThumb),['c']);assert.ok(h.window.document.querySelector('[data-action="delete-image"][data-id="c"]'));
});
test('customer paid and downloadable filters are independent of favourites',async t=>{
 const h=harness({user:{id:'u1',name:'Anna',role:'customer'}});t.after(()=>h.dom.window.close());h.detail.images[0].downloadAllowed=true;h.orders=[testOrderFixture({status:'paid',imageIds:['b']})];await h.ui.loadSession();await h.ui.openGallery('g');await h.action('filter',{filter:'downloads'});assert.deepEqual([...h.window.document.querySelectorAll('[data-photo-id]')].map(n=>n.dataset.photoId),['a']);await h.action('filter',{filter:'paid'});assert.deepEqual([...h.window.document.querySelectorAll('[data-photo-id]')].map(n=>n.dataset.photoId),['b']);assert.ok(h.window.document.querySelector('.portal-access-badge.pending'));
});


test('checkout requires two explicit unselected declarations in every language',async t=>{
 for(const lang of ['de','en','bs']){const h=await checkoutHarness(t,{count:5,lang});await h.action('checkout');const form=checkoutForm(h);for(const name of ['termsAccepted','earlyStartConsent','digitalConsent']){assert.equal(form.elements[name].checked,false);assert.equal(form.elements[name].required,true);}assert.equal(form.checkValidity(),false);form.elements.termsAccepted.checked=true;form.elements.digitalConsent.checked=true;assert.equal(form.checkValidity(),false);form.elements.earlyStartConsent.checked=true;assert.equal(form.checkValidity(),true);assert.ok(form.textContent.includes(orderConsent[lang].compensation));assert.ok(form.textContent.includes(orderConsent[lang].start));assert.ok(form.textContent.includes(orderConsent[lang].loss));}
});
