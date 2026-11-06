"""Disposable local GoTrue/PostgREST + SDK/browser integration; no hosted services.

Requires running orbit-m2-local-postgres (PostgreSQL15+, trust only in synthetic
local Docker environment), Docker, installed npm dependencies and Playwright.
Images pinned from official Supabase docker-compose on 2026-11-01. Temporary
JWT signing key/passwords are generated in memory and never logged or saved.
"""
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import base64
import hashlib
import hmac
import json
import os
import secrets
import signal
import subprocess
import threading
import tempfile
import shutil
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
DATABASE='orbit_m2_http_tests'
PG='orbit-m2-local-postgres'
NETWORK='orbit-m2-http-network'
AUTH='orbit-m2-http-auth'
REST='orbit-m2-http-rest'
AUTH_PORT=55433
REST_PORT=55434
GATEWAY_PORT=55435
BASE=f'http://127.0.0.1:{GATEWAY_PORT}'
GOTRUE='supabase/gotrue:v2.197.0@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b'
POSTGREST='postgrest/postgrest:v14.18@sha256:c7cd7e265a85b05248abf53f4473fcec7e327c282d0bd0cf60f1551996d09fcf'
ENV={key:value for key,value in os.environ.items() if key not in {'DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'}}
DOCKER=['docker','--host=unix:///var/run/docker.sock']
PSQL=DOCKER+['exec','-i',PG,'psql','-X','-v','ON_ERROR_STOP=1','-At','-U','postgres']

def command(args, **kwargs):
    result=subprocess.run(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=ENV,**kwargs)
    if result.returncode:
        # Never include service command/response details that could contain auth credentials.
        raise RuntimeError('Local integration command failed: '+args[0])
    return result.stdout

def sql(statement,database=DATABASE):
    return command(PSQL+['-d',database],input=statement)

def request(url,body=None,headers=None,method=None):
    payload=None if body is None else json.dumps(body).encode()
    req=urllib.request.Request(url,data=payload,headers={'Content-Type':'application/json',**(headers or {})},method=method)
    try:
        with urllib.request.urlopen(req,timeout=15) as response:
            raw=response.read();return response.status,json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw=error.read()
        try: data=json.loads(raw)
        except json.JSONDecodeError: data={}
        return error.code,data

def wait(url):
    deadline=time.monotonic()+30
    while time.monotonic()<deadline:
        try:
            if request(url)[0]<500:return
        except OSError:pass
        time.sleep(.1)
    raise RuntimeError('Local integration service did not become ready')

def jwt(key,role):
    enc=lambda value:base64.urlsafe_b64encode(value).rstrip(b'=')
    head=enc(json.dumps({'alg':'HS256','typ':'JWT'},separators=(',',':')).encode())
    body=enc(json.dumps({'role':role,'iss':'orbit-local-integration','iat':int(time.time()),'exp':int(time.time())+3600},separators=(',',':')).encode())
    message=head+b'.'+body
    return (message+b'.'+enc(hmac.new(key.encode(),message,hashlib.sha256).digest())).decode()

class Gateway(BaseHTTPRequestHandler):
    """No request logging; forwards only local Auth/REST APIs and app build files."""
    protocol_version='HTTP/1.1'
    public_config=None
    dist_root=ROOT/'dist'
    def log_message(self,*args):pass
    def do_OPTIONS(self):self.send_response(204);self.send_header('Content-Length','0');self.end_headers()
    def do_GET(self):self.handle_request()
    def do_POST(self):self.handle_request()
    def do_PATCH(self):self.handle_request()
    def do_DELETE(self):self.handle_request()
    def handle_request(self):
        try:self.forward_request()
        except (BrokenPipeError,ConnectionResetError):pass  # Browser teardown cancels in-flight local requests.
    def forward_request(self):
        target=None
        for prefix,port in [('/auth/v1',AUTH_PORT),('/rest/v1',REST_PORT)]:
            if self.path.startswith(prefix):target=f'http://127.0.0.1:{port}'+self.path[len(prefix):];break
        if target:
            body=self.rfile.read(int(self.headers.get('Content-Length','0')))
            headers={key:value for key,value in self.headers.items() if key.lower() not in {'host','content-length','connection','accept-encoding'}}
            req=urllib.request.Request(target,data=body if body else None,headers=headers,method=self.command)
            try:response=urllib.request.urlopen(req,timeout=15)
            except urllib.error.HTTPError as error:response=error
            data=response.read();self.send_response(response.status)
            for key,value in response.headers.items():
                if key.lower() in {'content-type','content-range','preference-applied','www-authenticate'}:self.send_header(key,value)
            self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        if self.path=='/src/runtime-config.js':
            data=('export const runtimeConfig='+json.dumps(self.public_config)+';').encode();mime='text/javascript'
        else:
            from urllib.parse import urlsplit,unquote
            path=unquote(urlsplit(self.path).path)
            if path!='/index.html' and path!='/' and not path.startswith(('/src/','/assets/')):
                self.send_error(404);return
            file=(self.dist_root/('index.html' if path=='/' else path.lstrip('/'))).resolve()
            if not file.is_relative_to(self.dist_root.resolve()) or not file.is_file():self.send_error(404);return
            data=file.read_bytes();mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'}.get(file.suffix,'application/octet-stream')
        self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)


def run():
    key=secrets.token_urlsafe(48)
    anon=jwt(key,'anon')
    password=secrets.token_urlsafe(24)
    server=None
    tempdir=Path(tempfile.mkdtemp(prefix='orbit-http-build-'))
    Gateway.dist_root=tempdir
    try:
        command(['node','--input-type=module','-e',"import {buildDist} from './scripts/build.mjs'; await buildDist({outdir:process.argv[1],env:{}});",str(tempdir)],cwd=ROOT)
        command(DOCKER+['network','create',NETWORK])
        command(DOCKER+['network','connect','--alias','orbitdb',NETWORK,PG])
        sql(f'DROP DATABASE IF EXISTS {DATABASE} WITH (FORCE); CREATE DATABASE {DATABASE};','postgres')
        sql("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;")
        sql("do $$ begin if not exists(select 1 from pg_roles where rolname='orbit_m2_http_authenticator') then create role orbit_m2_http_authenticator login noinherit; end if; end $$; grant anon,authenticated to orbit_m2_http_authenticator;",'postgres')
        sql('create schema auth;')
        auth_env={
            'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':'9999','API_EXTERNAL_URL':BASE+'/auth/v1',
            'GOTRUE_SITE_URL':BASE+'/', 'GOTRUE_URI_ALLOW_LIST':BASE+'/',
            'GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':f'postgres://postgres@orbitdb:5432/{DATABASE}?search_path=auth',
            'GOTRUE_DB_NAMESPACE':'auth','GOTRUE_JWT_SECRET':key,'GOTRUE_JWT_AUD':'authenticated',
            'GOTRUE_JWT_DEFAULT_GROUP_NAME':'authenticated','GOTRUE_JWT_EXP':'3600',
            'GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'true','GOTRUE_DISABLE_SIGNUP':'false',
        }
        args=DOCKER+['run','-d','--name',AUTH,'--network',NETWORK,'-p',f'127.0.0.1:{AUTH_PORT}:9999',
            '--mount','type=bind,src=/etc/ssl/certs/ca-certificates.crt,dst=/run/orbit-ca.pem,readonly','-e','SSL_CERT_FILE=/run/orbit-ca.pem']
        for name,value in auth_env.items():args+=['-e',f'{name}={value}']
        command(args+[GOTRUE]);wait(f'http://127.0.0.1:{AUTH_PORT}/health')
        sql("create schema if not exists extensions; create or replace function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid; $$; grant usage on schema auth,public,extensions to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; alter default privileges in schema public grant all on tables to anon,authenticated;")
        for migration in sorted((ROOT/'supabase/migrations').glob('*.sql')):sql(migration.read_text())
        rest_env={'PGRST_DB_URI':f'postgres://orbit_m2_http_authenticator@orbitdb:5432/{DATABASE}',
            'PGRST_DB_SCHEMAS':'public','PGRST_DB_ANON_ROLE':'anon','PGRST_JWT_SECRET':key,'PGRST_SERVER_PORT':'3000'}
        args=DOCKER+['run','-d','--name',REST,'--network',NETWORK,'-p',f'127.0.0.1:{REST_PORT}:3000',
            '--mount','type=bind,src=/etc/ssl/certs/ca-certificates.crt,dst=/run/orbit-ca.pem,readonly','-e','SSL_CERT_FILE=/run/orbit-ca.pem']
        for name,value in rest_env.items():args+=['-e',f'{name}={value}']
        command(args+[POSTGREST]);wait(f'http://127.0.0.1:{REST_PORT}/')
        Gateway.public_config={'supabaseUrl':BASE,'publishableKey':anon,'siteUrl':BASE+'/','publicRelease':False}
        server=ThreadingHTTPServer(('127.0.0.1',GATEWAY_PORT),Gateway)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        users=[]
        for label in ['owner','nonowner']:
            status,data=request(BASE+'/auth/v1/signup',{'email':f'orbit-{label}@example.invalid','password':password})
            assert status==200 and data.get('user',{}).get('id'), 'Real local signup failed: '+str(status)+' '+str(data.get('msg',data.get('message',data.get('error_code',''))))[:150]
            users.append(data)
        owner,other=users
        owner_id=owner['user']['id']
        sql("update private.orbit_configuration set owner_id='"+owner_id+"';")
        print('PASS real local GoTrue signup: two distinct synthetic identities',flush=True)
        payload={'base':BASE,'anon':anon,'owner':owner,'other':other,'password':password}
        result=subprocess.run(['node','tests/integration/sdk_http.mjs'],cwd=ROOT,input=json.dumps(payload),text=True,
                              stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=ENV)
        if result.returncode:raise RuntimeError('SDK HTTP integration failed: '+result.stdout)
        print(result.stdout,end='',flush=True)
        sql('update private.orbit_configuration set public_read_enabled=true;')
        pub_headers={'Authorization':'Bearer '+anon,'apikey':anon}
        status,rows=request(BASE+'/rest/v1/published_content?select=*',headers=pub_headers)
        assert status==200 and len(rows)==1, 'Local enabled public projection missing'
        assert set(rows[0])=={'id','kind','title','excerpt','published_date','updated_at'}, 'Unexpected public projection fields'
        assert rows[0]['excerpt']=='Explicit synthetic public excerpt'
        assert 'Synthetic private HTTP journal' not in json.dumps(rows), 'Private journal leaked into projection'
        status,_=request(BASE+'/rest/v1/rpc/unpublish_content',{'p_kind':'task','p_source_id':'http-task'},
            {'Authorization':'Bearer '+owner['access_token'],'apikey':anon})
        assert status in (200,204), 'Real unpublish failed'
        assert request(BASE+'/rest/v1/published_content?select=*',headers=pub_headers)==(200,[])
        sql('update private.orbit_configuration set public_read_enabled=false;')
        print('PASS real anonymous approved projection and immediate unpublish removal; public gate reset',flush=True)
        browser_test(payload)
        print('PASS local Auth HTTP/PostgREST/SDK/browser integration. Google OIDC and hosted configuration NOT tested.',flush=True)
    except Exception:
        messages=[]
        for container in [AUTH,REST]:
            logs=subprocess.run(DOCKER+['logs',container],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env=ENV)
            for line in logs.stdout.splitlines():
                try: entry=json.loads(line)
                except json.JSONDecodeError: continue
                if entry.get('level') in {'error','fatal','panic'}:
                    # Service startup failures only; no requests, headers or tokens.
                    messages.append({'service':container,'message':entry.get('msg','Startup error')[-350:], 'error':str(entry.get('error',''))[-350:]})
        print('Local service startup errors:',json.dumps(messages),flush=True)
        raise
    finally:
        if server:server.shutdown();server.server_close()
        for name in [REST,AUTH]:subprocess.run(DOCKER+['rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=ENV)
        subprocess.run(PSQL+['-d','postgres'],input=f'DROP DATABASE IF EXISTS {DATABASE} WITH (FORCE); DROP ROLE IF EXISTS orbit_m2_http_authenticator;',text=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=ENV)
        subprocess.run(DOCKER+['network','disconnect',NETWORK,PG],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=ENV)
        subprocess.run(DOCKER+['network','rm',NETWORK],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=ENV)
        shutil.rmtree(tempdir,ignore_errors=True)


def browser_test(payload):
    from playwright.sync_api import sync_playwright,expect
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        contexts=[]
        try:
            def page_for(session):
                context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
                contexts.append(context)
                if session:context.add_init_script("sessionStorage.setItem('orbit.cloud.auth',"+json.dumps(json.dumps(session))+");")
                page=context.new_page();page.goto(BASE);page.wait_for_function('Boolean(window.orbitReady)');page.evaluate('window.orbitReady')
                return page
            owner_page=page_for(None)
            owner_page.get_by_label('Email address',exact=True).fill('orbit-owner@example.invalid')
            owner_page.get_by_label('Password',exact=True).fill(payload['password'])
            owner_page.get_by_role('button',name='Sign in with password',exact=True).click()
            expect(owner_page.locator('.cloud-mode')).to_have_text('Private owner space')
            assert owner_page.get_by_label('Password',exact=True).input_value()==''
            print('PASS browser real password sign-in through owner getUser/RPC gate',flush=True)
            expect(owner_page.locator('#app')).to_be_visible()
            expect(owner_page.locator('#active-task-list')).to_contain_text('Real HTTP saved task')
            owner_page.locator('#capture-name').fill('Real browser task')
            owner_page.locator('#capture-form').evaluate('e=>e.requestSubmit()')
            expect(owner_page.locator('.cloud-sync-state')).to_contain_text('Saved',timeout=10000)
            owner_page.reload();owner_page.evaluate('window.orbitReady')
            expect(owner_page.locator('#active-task-list')).to_contain_text('Real browser task')
            print('PASS browser real Auth session restore and task save/reload',flush=True)
            status,second_session=request(BASE+'/auth/v1/token?grant_type=password',
                {'email':'orbit-owner@example.invalid','password':payload['password']})
            assert status==200 and second_session.get('access_token'), 'Second actual Auth session failed'
            second_page=page_for(second_session)
            expect(second_page.locator('#active-task-list')).to_contain_text('Real browser task')
            second_page.locator('#journal-entry-title').fill('Real second-session journal')
            expect(second_page.locator('.cloud-sync-state')).to_contain_text('Saved',timeout=10000)
            owner_page.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(owner_page.locator('#journal-entry-title')).to_have_value('Real second-session journal',timeout=10000)
            print('PASS two independent browser Auth sessions share journal update via real HTTP focus refresh',flush=True)
            for label,session in [('other',payload['other']),('anonymous',None)]:
                page=page_for(session)
                expect(page.locator('#app')).to_be_hidden()
                assert 'Real HTTP saved task' not in page.locator('body').inner_text()
                print('PASS browser '+label+' private DOM gate',flush=True)
            owner_page.get_by_role('button',name='Sign out',exact=True).filter(visible=True).click()
            expect(owner_page.locator('#app')).to_be_hidden()
            assert 'Real HTTP saved task' not in owner_page.locator('body').inner_text()
            print('PASS browser real Auth logout clears private DOM',flush=True)
        finally:
            for context in contexts:context.close()
            browser.close()

if __name__=='__main__':run()
