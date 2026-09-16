begin;

select service_key, version, state, revision
from public.create_service_config_draft(
  'cmdg',
  '{"title":"천명사주","tagline":"검증용 초안","summary":"운영 저장 함수의 트랜잭션 롤백 검증입니다.","category":"종합","discoveryVisible":true,"landingPath":"/cmdg/"}'::jsonb,
  repeat('a', 64),
  'verification@example.invalid'
);

rollback;
