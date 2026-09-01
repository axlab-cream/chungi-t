import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

type AuthHelpers = {
  normalizeReturnTo(value: string, origin?: string): string;
  resolveReturnTo(value?: string, origin?: string): string;
  currentPageReturnTo(): string;
  commonLoginUrl(entry: string, returnTo?: string, origin?: string): string;
  oauthReturnUrl(entry: string, returnTo?: string, origin?: string): string;
  clearReturnTo(): void;
};

function loadHelpers(href = 'https://umsh.kr/work/job') {
  const values = new Map<string, string>();
  const window = {
    location: new URL(href),
    sessionStorage: {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
      removeItem(key: string) {
        values.delete(key);
      },
    },
  } as { location: URL; sessionStorage: Storage; UMSHCommonAuth?: AuthHelpers };
  const source = readFileSync(join(process.cwd(), '사주', 'js', 'common-auth-return.js'), 'utf8');
  vm.runInNewContext(source, { window, URL });
  return { auth: window.UMSHCommonAuth!, values };
}

test('common auth accepts only same-origin relative return targets', () => {
  const { auth } = loadHelpers();

  assert.equal(auth.normalizeReturnTo('/work/job?tab=input#form'), '/work/job?tab=input#form');
  assert.equal(auth.normalizeReturnTo('https://evil.example/work/job'), '');
  assert.equal(auth.normalizeReturnTo('//evil.example/work/job'), '');
  assert.equal(auth.normalizeReturnTo('/signup?returnTo=%2Fwork%2Fjob'), '');
});

test('common login and OAuth callback preserve the opening service', () => {
  const { auth } = loadHelpers('https://umsh.kr/match/couple?step=partner#form');
  const login = new URL(auth.commonLoginUrl('match-couple', auth.currentPageReturnTo()));

  assert.equal(login.pathname, '/signup');
  assert.equal(login.searchParams.get('entry'), 'match-couple');
  assert.equal(login.searchParams.get('returnTo'), '/match/couple?step=partner#form');
  assert.equal(login.hash, '#login');

  const callback = new URL(auth.oauthReturnUrl('match-couple'));
  assert.equal(callback.pathname, '/signup');
  assert.equal(callback.searchParams.get('signupReturn'), '1');
  assert.equal(callback.searchParams.get('returnTo'), '/match/couple?step=partner#form');
});

test('OAuth markers and token fragments are never copied to a service return target', () => {
  const { auth } = loadHelpers('https://umsh.kr/money/save?authReturn=1&plan=basic#access_token=secret');

  assert.equal(auth.currentPageReturnTo(), '/money/save?plan=basic');
});

test('query return target is retained through storage and can be cleared after login', () => {
  const { auth, values } = loadHelpers();

  assert.equal(auth.resolveReturnTo('/place/home'), '/place/home');
  assert.equal(auth.resolveReturnTo(), '/place/home');
  assert.equal(values.size, 1);

  auth.clearReturnTo();
  assert.equal(auth.resolveReturnTo(), '');
});

test('every standalone service delegates provider login to the common signup page', () => {
  const services = new Map([
    ['사주/place/home/index.html', 'place-home'],
    ['사주/money/save/index.html', 'money-save'],
    ['사주/work/move/index.html', 'work-move'],
    ['사주/work/job/index.html', 'work-job'],
    ['사주/match/marry/index.html', 'match-marry'],
    ['사주/match/couple/index.html', 'match-couple'],
  ]);

  for (const [path, entry] of services) {
    const html = readFileSync(join(process.cwd(), path), 'utf8');
    assert.match(html, /<script src="\/js\/common-auth-return\.js"><\/script>/);
    assert.ok(html.includes(`commonLoginUrl('${entry}', returnTo)`));
    assert.doesNotMatch(html, /data-provider=|signInWithOAuth/);
  }
});
